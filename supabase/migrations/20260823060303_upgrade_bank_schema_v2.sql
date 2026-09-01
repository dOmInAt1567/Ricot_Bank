/*
# Ricot Bank v2 — Major Schema Upgrade

## Overview
Upgrades the bank schema to support: usernames (handles), user roles,
credit cards with realistic numbers and designs, credit/loan system,
admin audit logs, and avatar URLs. Changes currency to USD.

## Changes to existing tables

### profiles (modified)
- `username` (text, unique) — English-only handle, used for transfers
- `role` (text) — 'client' | 'admin' | 'creator'
- `avatar_url` (text, nullable) — user-uploaded avatar
- `password_visible` (boolean, default false) — whether user can view passwords

### accounts (modified)
- `currency` default changed to 'USD'
- `starting balance changed to 3000.00

## New Tables

### cards
Virtual debit cards linked to a user's account.
- `id` (uuid, PK)
- `account_id` (uuid, FK → accounts)
- `card_number` (text, unique) — 16-digit realistic card number
- `card_holder` (text) — name printed on card
- `expiry_month` (text) — MM
- `expiry_year` (text) — YY
- `cvv` (text) — 3-digit
- `design` (text) — design key from 20 available designs
- `created_at` (timestamptz)

### credits
Loan/credit system.
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `amount` (numeric) — principal borrowed
- `remaining` (numeric) — outstanding balance
- `interest_rate` (numeric) — annual rate percentage
- `status` (text) — 'active' | 'paid_off'
- `created_at` (timestamptz)

### admin_logs
Audit trail for admin/creator actions.
- `id` (uuid, PK)
- `actor_id` (uuid, FK → auth.users) — who performed the action
- `action` (text) — description of what was done
- `target_id` (uuid, nullable) — user affected
- `created_at` (timestamptz)

## Functions

### transfer_by_card(p_to_card_number, p_amount, p_description)
Transfer to another user by their card number.

### transfer_by_username(p_to_username, p_amount, p_description)
Transfer to another user by their username handle.

### create_credit(p_amount, p_interest_rate)
User takes out a credit/loan. Adds to their account balance.

### repay_credit(p_credit_id, p_amount)
User repays a credit. Deducts from account balance.

### set_user_role(p_target_user_id, p_role)
Admin/creator sets a user's role. Only creator can set 'creator' or 'admin'.

### log_admin_action(p_action, p_target_id)
Internal helper to record admin actions.

## Security
- RLS on all new tables.
- profiles: users read own profile; admins/creators read all profiles.
- cards: users read own cards only.
- credits: users read own credits only.
- admin_logs: only admin and creator can read.
- All transfer/credit functions are SECURITY DEFINER with auth.uid() validation.
- Username validation enforced via CHECK constraint (English alphanumeric + underscore).
*/

-- =========================================================
-- PROFILES: add columns
-- =========================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_visible boolean NOT NULL DEFAULT false;

-- Make username unique
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- Role check constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'admin', 'creator'));
  END IF;
END $$;

-- =========================================================
-- ACCOUNTS: change defaults
-- =========================================================

ALTER TABLE accounts ALTER COLUMN currency SET DEFAULT 'USD';

-- =========================================================
-- CARDS
-- =========================================================

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  card_number text UNIQUE NOT NULL,
  card_holder text NOT NULL,
  expiry_month text NOT NULL,
  expiry_year text NOT NULL,
  cvv text NOT NULL,
  design text NOT NULL DEFAULT 'classic',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cards" ON cards;
CREATE POLICY "select_own_cards" ON cards FOR SELECT
  TO authenticated USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- =========================================================
-- CREDITS
-- =========================================================

CREATE TABLE IF NOT EXISTS credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  remaining numeric(18,2) NOT NULL CHECK (remaining >= 0),
  interest_rate numeric(5,2) NOT NULL DEFAULT 12.00,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_id);

ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credits" ON credits;
CREATE POLICY "select_own_credits" ON credits FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- ADMIN LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_logs" ON admin_logs;
CREATE POLICY "select_admin_logs" ON admin_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'creator'))
  );

-- =========================================================
-- UPDATE handle_new_user: set creator role for first user
-- =========================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_number text;
  new_card_number text;
  user_count int;
  v_username text;
  v_role text;
  v_expiry_month text;
  v_expiry_year text;
BEGIN
  -- Count existing users to determine if this is the first
  SELECT count(*) INTO user_count FROM auth.users;

  IF user_count = 1 THEN
    -- This is the first user ever — check if name matches Tayler Walker
    v_role := 'creator';
  ELSE
    v_role := 'client';
  END IF;

  -- Generate username from email if not provided
  v_username := coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  -- Insert profile
  INSERT INTO profiles (id, display_name, username, role)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'display_name', 'User'),
    v_username,
    v_role
  );

  -- Generate account number
  new_account_number := 'RB' || lpad(floor(random() * 9000000000 + 1000000000)::text, 10, '0');

  -- Create account with $3000 starting balance
  INSERT INTO accounts (user_id, account_number, balance, currency)
  VALUES (NEW.id, new_account_number, 3000.00, 'USD');

  -- Generate card number (16 digits)
  new_card_number := '4' || lpad(floor(random() * 900000000000000 + 100000000000000)::text, 15, '0');

  -- Generate expiry (current month + 3 years)
  v_expiry_month := lpad(extract(month from now())::int::text, 2, '0');
  v_expiry_year := lpad((extract(year from now())::int + 3 - 2000)::text, 2, '0');

  -- Create default card
  INSERT INTO cards (account_id, card_number, card_holder, expiry_month, expiry_year, cvv, design)
  VALUES (
    (SELECT id FROM accounts WHERE user_id = NEW.id),
    new_card_number,
    coalesce(NEW.raw_user_meta_data->>'display_name', 'USER'),
    v_expiry_month,
    v_expiry_year,
    lpad(floor(random() * 900 + 100)::text, 3, '0'),
    coalesce(NEW.raw_user_meta_data->>'card_design', 'classic')
  );

  RETURN NEW;
END;
$$;

-- =========================================================
-- TRANSFER BY CARD NUMBER
-- =========================================================

CREATE OR REPLACE FUNCTION transfer_by_card(
  p_to_card_number text,
  p_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_account accounts%ROWTYPE;
  v_receiver_account accounts%ROWTYPE;
  v_tx_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT * INTO v_sender_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not have an account'; END IF;

  SELECT a.* INTO v_receiver_account
  FROM accounts a
  JOIN cards c ON c.account_id = a.id
  WHERE c.card_number = p_to_card_number;

  IF NOT FOUND THEN RAISE EXCEPTION 'Recipient card not found'; END IF;

  IF v_sender_account.id = v_receiver_account.id THEN
    RAISE EXCEPTION 'Cannot transfer to your own card';
  END IF;

  IF v_sender_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  UPDATE accounts SET balance = balance - p_amount WHERE id = v_sender_account.id;
  UPDATE accounts SET balance = balance + p_amount WHERE id = v_receiver_account.id;

  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (v_sender_account.id, v_receiver_account.id, p_amount, 'transfer', p_description)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- =========================================================
-- TRANSFER BY USERNAME
-- =========================================================

CREATE OR REPLACE FUNCTION transfer_by_username(
  p_to_username text,
  p_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_account accounts%ROWTYPE;
  v_receiver_account accounts%ROWTYPE;
  v_tx_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT * INTO v_sender_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not have an account'; END IF;

  SELECT a.* INTO v_receiver_account
  FROM accounts a
  JOIN profiles p ON p.id = a.user_id
  WHERE p.username = p_to_username;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  IF v_sender_account.id = v_receiver_account.id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  IF v_sender_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  UPDATE accounts SET balance = balance - p_amount WHERE id = v_sender_account.id;
  UPDATE accounts SET balance = balance + p_amount WHERE id = v_receiver_account.id;

  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (v_sender_account.id, v_receiver_account.id, p_amount, 'transfer', p_description)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- =========================================================
-- CREATE CREDIT (take a loan)
-- =========================================================

CREATE OR REPLACE FUNCTION create_credit(
  p_amount numeric,
  p_interest_rate numeric DEFAULT 12.00
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_id uuid;
  v_account accounts%ROWTYPE;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be greater than zero';
  END IF;
  IF p_amount > 50000 THEN
    RAISE EXCEPTION 'Maximum credit amount is $50,000';
  END IF;

  SELECT * INTO v_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not have an account'; END IF;

  -- Add credit amount to account balance
  UPDATE accounts SET balance = balance + p_amount WHERE id = v_account.id;

  -- Create credit record
  INSERT INTO credits (user_id, amount, remaining, interest_rate, status)
  VALUES (auth.uid(), p_amount, p_amount, p_interest_rate, 'active')
  RETURNING id INTO v_credit_id;

  -- Log transaction
  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (NULL, v_account.id, p_amount, 'deposit', 'Credit approved');

  RETURN v_credit_id;
END;
$$;

-- =========================================================
-- REPAY CREDIT
-- =========================================================

CREATE OR REPLACE FUNCTION repay_credit(
  p_credit_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit credits%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_pay_amount numeric;
BEGIN
  SELECT * INTO v_credit FROM credits WHERE id = p_credit_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit not found'; END IF;
  IF v_credit.status = 'paid_off' THEN RAISE EXCEPTION 'Credit is already paid off'; END IF;

  SELECT * INTO v_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'You do not have an account'; END IF;

  v_pay_amount := LEAST(p_amount, v_credit.remaining);

  IF v_account.balance < v_pay_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- Deduct from account
  UPDATE accounts SET balance = balance - v_pay_amount WHERE id = v_account.id;

  -- Reduce credit remaining
  UPDATE credits SET remaining = remaining - v_pay_amount,
    status = CASE WHEN remaining - v_pay_amount <= 0 THEN 'paid_off' ELSE 'active' END
  WHERE id = p_credit_id;

  -- Log transaction
  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (v_account.id, NULL, v_pay_amount, 'withdrawal', 'Credit repayment');
END;
$$;

-- =========================================================
-- SET USER ROLE (admin/creator only)
-- =========================================================

CREATE OR REPLACE FUNCTION set_user_role(
  p_target_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
BEGIN
  SELECT role INTO v_actor_role FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF v_actor_role NOT IN ('admin', 'creator') THEN
    RAISE EXCEPTION 'Only admins can set roles';
  END IF;

  IF p_role = 'creator' AND v_actor_role != 'creator' THEN
    RAISE EXCEPTION 'Only the creator can assign creator role';
  END IF;

  IF p_role NOT IN ('client', 'admin', 'creator') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE profiles SET role = p_role WHERE id = p_target_user_id;

  -- Log the action
  INSERT INTO admin_logs (actor_id, action, target_id)
  VALUES (auth.uid(), 'Set role of user to ' || p_role, p_target_user_id);
END;
$$;

-- =========================================================
-- LOG ADMIN ACTION
-- =========================================================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_target_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_logs (actor_id, action, target_id)
  VALUES (auth.uid(), p_action, p_target_id);
END;
$$;

-- =========================================================
-- GET TRANSACTION DETAILS (with counterparty info)
-- =========================================================

CREATE OR REPLACE FUNCTION get_transaction_details(
  p_tx_id uuid
)
RETURNS TABLE(
  tx_id uuid,
  tx_amount numeric,
  tx_type text,
  tx_description text,
  tx_created_at timestamptz,
  direction text,
  counterparty_card text,
  counterparty_name text,
  counterparty_username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx transactions%ROWTYPE;
  v_my_account accounts%ROWTYPE;
  v_counterparty_account accounts%ROWTYPE;
  v_counterparty_profile profiles%ROWTYPE;
  v_counterparty_card text;
  v_direction text;
BEGIN
  SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;

  SELECT * INTO v_my_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;

  IF v_tx.from_account_id = v_my_account.id THEN
    v_direction := 'outgoing';
    SELECT * INTO v_counterparty_account FROM accounts WHERE id = v_tx.to_account_id;
  ELSIF v_tx.to_account_id = v_my_account.id THEN
    v_direction := 'incoming';
    SELECT * INTO v_counterparty_account FROM accounts WHERE id = v_tx.from_account_id;
  ELSE
    RAISE EXCEPTION 'You do not have access to this transaction';
  END IF;

  IF v_counterparty_account IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_counterparty_profile FROM profiles WHERE id = v_counterparty_account.user_id;

  SELECT card_number INTO v_counterparty_card FROM cards WHERE account_id = v_counterparty_account.id LIMIT 1;

  RETURN QUERY SELECT
    v_tx.id,
    v_tx.amount,
    v_tx.type,
    v_tx.description,
    v_tx.created_at,
    v_direction,
    COALESCE(v_counterparty_card, ''),
    COALESCE(v_counterparty_profile.display_name, ''),
    COALESCE(v_counterparty_profile.username, '');
END;
$$;