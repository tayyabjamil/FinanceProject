import { getItem, setItem } from './storage';
import type { Transaction } from '@/types';

export type { Transaction, TransactionCategory, TransactionType } from '@/types';

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

