-- Prevent duplicate transactions from re-uploading the same PDF.
-- A transaction is considered a duplicate if user_id + date + amount + raw_description all match.
-- ignoreDuplicates: true on upsert will silently skip conflicts.

-- Step 1: Remove existing duplicates, keeping the earliest inserted row per group.
delete from transactions
where id in (
  select id from (
    select id,
           row_number() over (
             partition by user_id, date, amount, raw_description
             order by created_at asc
           ) as rn
    from transactions
  ) dupes
  where rn > 1
);

-- Step 2: Add the unique constraint so future duplicates are rejected at the DB level.
alter table transactions
  add constraint transactions_dedup_key
  unique (user_id, date, amount, raw_description);
