import { create } from 'zustand';
import type { FinanceBudget, FinanceSettings, Loan, LoanPayment, RecurringTransactionSeries, SavingsContribution, SavingsGoal, Transaction, Wallet, WalletTransfer } from '../types';
import { generateId, getTodayStr, roundMoney, sumMoney } from '../utils/helpers';
import {
  createLoan, createLoanPayment, createRecurringTransactionSeries, createSavingsContribution, createSavingsGoal,
  createSplitExpense, createTransaction, createWallet, createWalletTransfer, deleteBudget, deleteLoan, deleteLoanPayment,
  deleteRecurringTransactionSeries, deleteSavingsContribution, deleteSavingsGoal, deleteTransaction, deleteWalletTransfer, ensureRecurringFinanceWindow,
  saveBudget, updateBudget, updateLoan, updateRecurringTransactionSeries, updateSavingsGoal, updateTransaction, updateWallet,
  upsertFinanceSettings, stopRecurringTransactionSeries,
} from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';

export interface FinanceData {
  transactions: Transaction[];
  wallets: Wallet[];
  transfers: WalletTransfer[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  budgets: FinanceBudget[];
  financeSettings: FinanceSettings;
  recurringTransactionSeries: RecurringTransactionSeries[];
  savingsGoals: SavingsGoal[];
  savingsContributions: SavingsContribution[];
  financeSchemaAvailable: boolean;
}

const emptyFinanceData = (): FinanceData => ({
  transactions: [], wallets: [], transfers: [], loans: [], loanPayments: [], budgets: [],
  financeSettings: { currency: 'INR', overallMonthlyBudget: null, keywordRules: [] },
  recurringTransactionSeries: [], savingsGoals: [], savingsContributions: [], financeSchemaAvailable: true,
});

interface FinanceState extends FinanceData {
  setData: (data: FinanceData) => void;
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<Transaction>;
  addSplitExpense: (data: Omit<Transaction, 'id'>, total: number, shares: Array<{ person: string; amount: number; dueDate?: string | null }>) => Promise<{ transaction: Transaction; loans: Loan[] }>;
  removeTransaction: (id: string) => Promise<Transaction | undefined>;
  restoreTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  addWallet: (wallet: Omit<Wallet, 'id' | 'createdAt' | 'archivedAt'>) => Promise<Wallet>;
  updateWallet: (id: string, values: Partial<Wallet>) => Promise<void>;
  addTransfer: (transfer: Omit<WalletTransfer, 'id'>) => Promise<WalletTransfer>;
  removeTransfer: (id: string) => Promise<WalletTransfer | undefined>;
  restoreTransfer: (transfer: WalletTransfer) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'linkedTransactionId'> & { linkedTransactionId?: string | null }) => Promise<Loan>;
  updateLoan: (id: string, values: Partial<Loan>) => Promise<void>;
  removeLoan: (id: string) => Promise<Loan | undefined>;
  restoreLoan: (loan: Loan) => Promise<void>;
  addLoanPayment: (payment: Omit<LoanPayment, 'id'>) => Promise<LoanPayment>;
  removeLoanPayment: (id: string) => Promise<LoanPayment | undefined>;
  restoreLoanPayment: (payment: LoanPayment) => Promise<void>;
  saveSettings: (settings: FinanceSettings) => Promise<void>;
  saveBudget: (budget: Omit<FinanceBudget, 'id'>) => Promise<FinanceBudget>;
  updateBudget: (id: string, amount: number) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  addRecurringSeries: (series: Omit<RecurringTransactionSeries, 'id' | 'createdAt'>) => Promise<RecurringTransactionSeries>;
  updateRecurringSeries: (id: string, values: Partial<RecurringTransactionSeries>) => Promise<void>;
  stopRecurringSeries: (id: string) => Promise<void>;
  removeRecurringSeries: (id: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => Promise<SavingsGoal>;
  restoreSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  updateSavingsGoal: (id: string, values: Partial<SavingsGoal>) => Promise<void>;
  removeSavingsGoal: (id: string) => Promise<void>;
  addSavingsContribution: (contribution: Omit<SavingsContribution, 'id'>) => Promise<SavingsContribution>;
  removeSavingsContribution: (id: string) => Promise<SavingsContribution | undefined>;
  restoreSavingsContribution: (contribution: SavingsContribution) => Promise<void>;
}

const run = async <T>(action: () => Promise<T>) => {
  try { return await action(); }
  catch (error) { reportCloudError(error); throw error; }
};

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  ...emptyFinanceData(),
  setData: (data) => set(data),
  addTransaction: (data) => run(async () => {
    const transaction: Transaction = { ...data, amount: roundMoney(data.amount), id: generateId() };
    await createTransaction(transaction);
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
    return transaction;
  }),
  addSplitExpense: (data, total, shares) => run(async () => {
    const transaction: Transaction = { ...data, amount: roundMoney(data.amount), id: generateId(), splitTotalAmount: roundMoney(total) };
    const splitShares = shares.map((share) => ({ ...share, id: generateId(), amount: roundMoney(share.amount) }));
    await createSplitExpense(transaction, splitShares);
    const createdLoans = splitShares.map((share) => ({ id: share.id, direction: 'lent' as const, person: share.person, amount: share.amount,
        date: transaction.date, dueDate: share.dueDate ?? null, note: '', walletId: transaction.walletId ?? null,
        linkedTransactionId: transaction.id, createdAt: new Date().toISOString() }));
    set((state) => ({ transactions: [transaction, ...state.transactions], loans: [...createdLoans, ...state.loans] }));
    return { transaction, loans: createdLoans };
  }),
  removeTransaction: (id) => run(async () => {
    const transaction = get().transactions.find((item) => item.id === id);
    if (!transaction) return undefined;
    await deleteTransaction(id);
    set((state) => ({ transactions: state.transactions.filter((item) => item.id !== id) }));
    return transaction;
  }),
  restoreTransaction: (transaction) => run(async () => {
    await createTransaction(transaction);
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
  }),
  updateTransaction: (id, updates) => run(async () => {
    const transaction = get().transactions.find((item) => item.id === id);
    if (!transaction) return;
    const updated = { ...transaction, ...updates, amount: updates.amount === undefined ? transaction.amount : roundMoney(updates.amount) };
    await updateTransaction(id, updates);
    set((state) => ({ transactions: state.transactions.map((item) => item.id === id ? updated : item) }));
  }),
  addWallet: (data) => run(async () => {
    const wallet: Wallet = { ...data, id: generateId(), archivedAt: null, createdAt: new Date().toISOString() };
    await createWallet(wallet); set((state) => ({ wallets: [...state.wallets, wallet] })); return wallet;
  }),
  updateWallet: (id, values) => run(async () => {
    await updateWallet(id, values); set((state) => ({ wallets: state.wallets.map((item) => item.id === id ? { ...item, ...values } : item) }));
  }),
  addTransfer: (data) => run(async () => {
    const transfer = { ...data, id: generateId(), amount: roundMoney(data.amount) };
    await createWalletTransfer(transfer); set((state) => ({ transfers: [transfer, ...state.transfers] })); return transfer;
  }),
  removeTransfer: (id) => run(async () => {
    const transfer = get().transfers.find((item) => item.id === id); if (!transfer) return undefined;
    await deleteWalletTransfer(id); set((state) => ({ transfers: state.transfers.filter((item) => item.id !== id) })); return transfer;
  }),
  restoreTransfer: (transfer) => run(async () => { await createWalletTransfer(transfer); set((state) => ({ transfers: [transfer, ...state.transfers] })); }),
  addLoan: (data) => run(async () => {
    const loan: Loan = { ...data, id: generateId(), createdAt: new Date().toISOString(), amount: roundMoney(data.amount), linkedTransactionId: data.linkedTransactionId ?? null };
    await createLoan(loan); set((state) => ({ loans: [loan, ...state.loans] })); return loan;
  }),
  updateLoan: (id, values) => run(async () => {
    const previous = get().loans.find((item) => item.id === id); if (!previous) return;
    const totalPaid = sumMoney(get().loanPayments.filter((item) => item.loanId === id).map((item) => item.amount));
    if (values.amount !== undefined && values.amount < totalPaid) throw new Error('Loan amount cannot be below the repayments already recorded.');
    await updateLoan(id, values); set((state) => ({ loans: state.loans.map((item) => item.id === id ? { ...item, ...values } : item) }));
  }),
  removeLoan: (id) => run(async () => {
    const loan = get().loans.find((item) => item.id === id); if (!loan) return undefined;
    await deleteLoan(id); set((state) => ({ loans: state.loans.filter((item) => item.id !== id), loanPayments: state.loanPayments.filter((item) => item.loanId !== id) })); return loan;
  }),
  restoreLoan: (loan) => run(async () => { await createLoan(loan); set((state) => ({ loans: [loan, ...state.loans] })); }),
  addLoanPayment: (data) => run(async () => {
    const payment: LoanPayment = { ...data, id: generateId(), amount: roundMoney(data.amount) };
    await createLoanPayment(payment); set((state) => ({ loanPayments: [payment, ...state.loanPayments] })); return payment;
  }),
  removeLoanPayment: (id) => run(async () => {
    const payment = get().loanPayments.find((item) => item.id === id); if (!payment) return undefined;
    await deleteLoanPayment(id); set((state) => ({ loanPayments: state.loanPayments.filter((item) => item.id !== id) })); return payment;
  }),
  restoreLoanPayment: (payment) => run(async () => { await createLoanPayment(payment); set((state) => ({ loanPayments: [payment, ...state.loanPayments] })); }),
  saveSettings: (financeSettings) => run(async () => { await upsertFinanceSettings(financeSettings); set({ financeSettings }); }),
  saveBudget: (data) => run(async () => {
    const existing = get().budgets.find((item) => item.monthStart === data.monthStart && item.category.toLowerCase() === data.category.toLowerCase());
    if (existing) {
      const amount = roundMoney(data.amount);
      await updateBudget(existing.id, amount); const updated = { ...existing, amount };
      set((state) => ({ budgets: state.budgets.map((item) => item.id === existing.id ? updated : item) })); return updated;
    }
    const budget = { ...data, id: generateId(), amount: roundMoney(data.amount) };
    await saveBudget(budget); set((state) => ({ budgets: [...state.budgets, budget] })); return budget;
  }),
  updateBudget: (id, amount) => run(async () => { await updateBudget(id, amount); set((state) => ({ budgets: state.budgets.map((item) => item.id === id ? { ...item, amount } : item) })); }),
  removeBudget: (id) => run(async () => { await deleteBudget(id); set((state) => ({ budgets: state.budgets.filter((item) => item.id !== id) })); }),
  addRecurringSeries: (data) => run(async () => {
    const series = { ...data, id: generateId(), createdAt: new Date().toISOString(), amount: roundMoney(data.amount) };
    await createRecurringTransactionSeries(series); set((state) => ({ recurringTransactionSeries: [...state.recurringTransactionSeries, series] }));
    const generated = await ensureRecurringFinanceWindow([series], get().transactions);
    if (generated.length) set((state) => ({ transactions: [...generated, ...state.transactions] }));
    return series;
  }),
  updateRecurringSeries: (id, values) => run(async () => {
    await updateRecurringTransactionSeries(id, values); set((state) => ({ recurringTransactionSeries: state.recurringTransactionSeries.map((item) => item.id === id ? { ...item, ...values } : item) }));
  }),
  removeRecurringSeries: (id) => run(async () => {
    await deleteRecurringTransactionSeries(id); set((state) => ({ recurringTransactionSeries: state.recurringTransactionSeries.filter((item) => item.id !== id) }));
  }),
  stopRecurringSeries: (id) => run(async () => {
    await stopRecurringTransactionSeries(id);
    const today = getTodayStr();
    set((state) => ({ recurringTransactionSeries: state.recurringTransactionSeries.map((item) => item.id === id ? { ...item, active: false } : item), transactions: state.transactions.filter((item) => item.recurringSeriesId !== id || item.date <= today) }));
  }),
  addSavingsGoal: (data) => run(async () => {
    const goal = { ...data, id: generateId(), createdAt: new Date().toISOString(), targetAmount: roundMoney(data.targetAmount) };
    await createSavingsGoal(goal); set((state) => ({ savingsGoals: [...state.savingsGoals, goal] })); return goal;
  }),
  restoreSavingsGoal: (goal) => run(async () => { await createSavingsGoal(goal); set((state) => ({ savingsGoals: [...state.savingsGoals, goal] })); }),
  updateSavingsGoal: (id, values) => run(async () => {
    await updateSavingsGoal(id, values); set((state) => ({ savingsGoals: state.savingsGoals.map((item) => item.id === id ? { ...item, ...values } : item) }));
  }),
  removeSavingsGoal: (id) => run(async () => {
    await deleteSavingsGoal(id); set((state) => ({ savingsGoals: state.savingsGoals.filter((item) => item.id !== id), savingsContributions: state.savingsContributions.filter((item) => item.goalId !== id) }));
  }),
  addSavingsContribution: (data) => run(async () => {
    const contribution = { ...data, id: generateId(), amount: roundMoney(data.amount) };
    await createSavingsContribution(contribution); set((state) => ({ savingsContributions: [contribution, ...state.savingsContributions] })); return contribution;
  }),
  removeSavingsContribution: (id) => run(async () => {
    const contribution = get().savingsContributions.find((item) => item.id === id); if (!contribution) return undefined;
    await deleteSavingsContribution(id); set((state) => ({ savingsContributions: state.savingsContributions.filter((item) => item.id !== id) })); return contribution;
  }),
  restoreSavingsContribution: (contribution) => run(async () => { await createSavingsContribution(contribution); set((state) => ({ savingsContributions: [contribution, ...state.savingsContributions] })); }),
}));
