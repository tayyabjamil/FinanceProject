import { getItem, setItem } from './storage';

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'food' | 'transport' | 'shopping' | 'bills' | 'rent' | 'salary' | 'other';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  category: TransactionCategory;
  date: string; // ISO
  notes?: string;
};

const KEY = 'financeai.transactions';

export async function listTransactions(): Promise<Transaction[]> {
  return (await getItem<Transaction[]>(KEY)) ?? [];
}

export async function addTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction> {
  const list = await listTransactions();
  const txn: Transaction = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...input,
  };
  await setItem(KEY, [txn, ...list]);
  return txn;
}

