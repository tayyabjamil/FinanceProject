-- Seed data for local development
-- Run after migrations; creates a test user profile and sample transactions.
-- NOTE: auth.users rows must already exist (created via Supabase Auth or supabase start).
--       Replace the UUID below with the actual test user's UUID if needed.

-- ── Test user profile ──────────────────────────────────────────────────────────
-- Using a fixed UUID so seed is idempotent
do $$
declare
  test_user_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Insert a dummy auth user for local dev (only works in local Supabase)
  insert into auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, instance_id
  )
  values (
    test_user_id,
    'demo@financeai.app',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000'
  )
  on conflict (id) do nothing;

  -- Profile
  insert into public.profiles (id, name, monthly_income, goal, currency)
  values (test_user_id, 'Alex Demo', 3500.00, 'save', 'GBP')
  on conflict (id) do nothing;

  -- Sample transactions (last 30 days)
  insert into public.transactions (user_id, type, amount, merchant, category, date, notes)
  values
    (test_user_id, 'income',  3500.00, 'Employer Ltd',       'salary',    current_date - 25, 'Monthly salary'),
    (test_user_id, 'expense',   12.50, 'Pret A Manger',      'food',      current_date - 24, 'Lunch'),
    (test_user_id, 'expense',   89.99, 'TFL Contactless',    'transport', current_date - 23, 'Monthly travel card'),
    (test_user_id, 'expense',  145.00, 'Sainsbury''s',        'food',      current_date - 20, 'Weekly shop'),
    (test_user_id, 'expense',  850.00, 'Landlord',           'rent',      current_date - 18, 'Monthly rent'),
    (test_user_id, 'expense',   45.00, 'ASOS',               'shopping',  current_date - 15, null),
    (test_user_id, 'expense',   32.00, 'EDF Energy',         'bills',     current_date - 14, 'Electric bill'),
    (test_user_id, 'expense',   18.99, 'Spotify + Netflix',  'bills',     current_date - 13, 'Subscriptions'),
    (test_user_id, 'expense',    9.50, 'Costa Coffee',       'food',      current_date - 10, null),
    (test_user_id, 'expense',   67.30, 'Zara',               'shopping',  current_date - 8,  null),
    (test_user_id, 'income',   250.00, 'Freelance Project',  'salary',    current_date - 5,  'Side income'),
    (test_user_id, 'expense',   22.40, 'Deliveroo',          'food',      current_date - 3,  'Dinner delivery'),
    (test_user_id, 'expense',   15.00, 'Uber',               'transport', current_date - 1,  'Airport ride')
  on conflict do nothing;
end;
$$;
