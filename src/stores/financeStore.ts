// ========================================
// Finance Store
// ========================================
// Manages financial transactions (income & expenses) using Zustand.
// Persisted to localStorage so data survives page refreshes.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '../types';
import { generateId } from '../utils/helpers';

/**
 * Shape of the finance store — includes the data (transactions array)
 * and all the actions that can modify it.
 */
interface FinanceState {
  transactions: Transaction[];
  /** Add a new transaction (id is auto-generated) */
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  /** Remove a transaction by its ID */
  removeTransaction: (id: string) => void;
  /** Partially update a transaction's properties */
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      // Start with an empty transactions array
      transactions: [],

      addTransaction: (data) => set((state) => ({
        transactions: [...state.transactions, { ...data, id: generateId() }],
      })),

      removeTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      })),

      updateTransaction: (id, updates) => set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),
    }),
    // Persist to localStorage under this key
    { name: 'life-tracker-finances' }
  )
);
