import { create } from 'zustand';
import type { Transaction } from '../types';
import { generateId } from '../utils/helpers';
import { createTransaction, deleteTransaction, updateTransaction } from '../lib/cloudData';
import { reportCloudError } from '../lib/cloudFeedback';

interface FinanceState {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  transactions: [],
  addTransaction: (data) => {
    const transaction = { ...data, id: generateId() };
    void createTransaction(transaction).then(() => set((state) => ({ transactions: [...state.transactions, transaction] }))).catch(reportCloudError);
  },
  removeTransaction: (id) => {
    void deleteTransaction(id).then(() => set((state) => ({ transactions: state.transactions.filter((item) => item.id !== id) }))).catch(reportCloudError);
  },
  updateTransaction: (id, updates) => {
    const next = get().transactions.find((item) => item.id === id);
    if (!next) return;
    const updated = { ...next, ...updates };
    void updateTransaction(id, updates).then(() => set((state) => ({ transactions: state.transactions.map((item) => item.id === id ? updated : item) }))).catch(reportCloudError);
  },
}));
