/**
 * Central type definitions for FinanceAI mobile app.
 * All domain and shared types live here — import from '@/types' everywhere.
 * Component-specific prop types stay co-located with their component.
 */

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'rent'
  | 'salary'
  | 'other';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  category: TransactionCategory;
  date: string; // ISO 8601 date string e.g. "2024-01-15"
  notes?: string;
};

// ---------------------------------------------------------------------------
// User / Session
// ---------------------------------------------------------------------------

/** Matches the CHECK constraint on the `goal` column in the profiles table */
export type AppGoal = 'save' | 'budget' | 'reduce_spending' | 'track_money';

export type Profile = {
  name: string;
  monthlyIncome: number; // stored as numeric in Postgres, BigFloat in GraphQL → coerced to number
  goal: AppGoal;
  currency: string; // ISO 4217 e.g. "GBP"
};

export type Session = {
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  email?: string;
  profile?: Profile; // undefined until onboarding is complete
};

// ---------------------------------------------------------------------------
// PDF Upload
// ---------------------------------------------------------------------------

export type UploadStatus = 'pending' | 'processing' | 'done' | 'failed';

export type PdfUpload = {
  id: string;
  file_name: string;
  status: UploadStatus;
  transaction_count: number | null;
  error_message: string | null;
  created_at: string; // ISO 8601 timestamp
};

// ---------------------------------------------------------------------------
// Chat / AI
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: 'user' | 'ai';
  text: string;
  ts: Date;
};

// ---------------------------------------------------------------------------
// Insights / Analytics
// ---------------------------------------------------------------------------

export type CategoryBar = {
  label: string;
  pct: number;
  color: string;
};
