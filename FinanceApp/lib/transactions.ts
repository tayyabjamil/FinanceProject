import type { Transaction } from '@/types';
import { supabase } from './supabase';

export type { Transaction, TransactionCategory, TransactionType } from '@/types';

export async function listTransactions(): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select('id, type, amount, merchant, category, date, notes')
    .order('date', { ascending: false });
  return (data as Transaction[]) ?? [];
}

export async function addTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, user_id: user!.id })
    .select('id, type, amount, merchant, category, date, notes')
    .single();
  if (error) throw new Error(error.message);
  return data as Transaction;
}

