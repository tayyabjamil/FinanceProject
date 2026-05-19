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

export type TransactionSource = 'manual' | 'pdf_upload' | 'open_banking';

export type Transaction = {
  id: string;
  user_id: string;

  // Core fields (always present)
  type: TransactionType;
  amount: number;
  merchant: string;              // raw payee string from the bank statement
  category: TransactionCategory; // kept as fallback — do not remove until category_id is fully adopted
  date: string;                  // ISO 8601 date e.g. "2024-01-15"
  notes?: string;

  // Provenance
  source: TransactionSource;
  upload_id?: string | null;     // FK → pdf_uploads.id; set when source is 'pdf_upload'

  // AI enrichment fields (nullable — null until the row has been enriched)
  raw_description?: string | null;   // untouched payee string as extracted from PDF
  clean_merchant?: string | null;    // human-readable name e.g. "Tesco" not "TESCO STORES 3849"
  category_id?: string | null;       // FK → categories.id
  subcategory?: string | null;       // free-text sub-category within the main category
  is_subscription: boolean;          // true if AI detects a recurring subscription charge
  ai_confidence?: number | null;     // 0–1 model confidence score for the categorisation
  ai_processed: boolean;             // false until enrichment job has run on this row
  balance_after?: number | null;     // running balance extracted from the statement line

  // Legacy enrichment (from migration 000004 — keep until UI is migrated to new columns)
  merchant_clean?: string | null;    // use clean_merchant instead for new code
  category_ai?: TransactionCategory | null;
  enriched_at?: string | null;       // ISO 8601 timestamp

  created_at: string;
  updated_at: string;
};

// Minimal shape used when inserting a new transaction (omits DB-generated fields)
export type NewTransaction = Omit<
  Transaction,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'ai_processed' | 'is_subscription' | 'source'
> & {
  source?: TransactionSource;
  is_subscription?: boolean;
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type Category = {
  id: string;
  name: TransactionCategory;
  label: string; // display label e.g. "Food & Drink"
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
