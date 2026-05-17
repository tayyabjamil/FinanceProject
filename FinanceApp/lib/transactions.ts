import type { Transaction } from '@/types';
import { supabase } from './supabase';

export type { Transaction, TransactionCategory, TransactionType } from '@/types';

// Transaction shape returned by listTransactions — includes AI enrichment fields
// and the joined category label from the categories table.
export type ListedTransaction = Transaction & {
  categories: { name: string; label: string } | null; // joined via category_id FK
};

export async function listTransactions(): Promise<ListedTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, user_id, type, amount, merchant, category, date, notes, ' +
      'clean_merchant, is_subscription, ai_processed, ' +
      'category_id, categories(name, label), ' +
      'source, upload_id, created_at, updated_at'
    )
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as unknown) as ListedTransaction[]) ?? [];
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

