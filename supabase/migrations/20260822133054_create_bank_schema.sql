/*
# Ricot Bank — Core Schema

## Overview
Creates the database foundation for Ricot Bank, a banking app that works
both as a standalone website and as a Telegram Mini App. Users sign up with
email/password (Supabase Auth) and receive a bank account with a starting
balance for demo purposes.

## New Tables

### profiles
Extends `auth.users` with bank-specific user information.
- `id` (uuid, PK, references auth.users) — one-to-one with auth user
- `display_name` (text) — full name shown in the UI
- `phone` (text, nullable) — optional phone number
- `avatar_url` (text, nullable) — optional avatar
- `created_at` (timestamptz) — registration timestamp

### accounts
Bank accounts owned by users. Each user gets one account on signup.
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users) — owner
- `account_number` (text, unique) — human-readable account number
- `balance` (numeric(18,2)) — current balance, defaults to 10000.00 for new accounts
- `currency` (text) — ISO currency code, defaults to 'RUB'
- `created_at` (timestamptz)

### transactions
Records every money movement between accounts.
- `id` (uuid, PK)
- `from_account_id` (uuid, FK → accounts, nullable) — null for deposits
- `to_account_id` (uuid, FK → accounts, nullable) — null for withdrawals
- `amount` (numeric(18,2)) — always positive
- `type` (text) — 'transfer' | 'deposit' | 'withdrawal'
- `description` (text, nullable) — user-provided note
- `created_at` (timestamptz)

## Functions

### transfer_money(p_to_account_number, p_amount, p_description)
SECURITY DEFINER function that atomically transfers money from the caller's
account to another account by account number. Validates ownership and
sufficient balance. Returns the created transaction id.

### handle_new_user()
Trigger function that creates a profile and a default account with a
10000.00 starting balance whenever a new auth user registers.

## Security
- RLS enabled on all three tables.
- `profiles`: users can read/update/insert only their own profile.
- `accounts`: users can read only their own accounts (balance mutations go
  through the SECURITY DEFINER transfer function, never direct UPDATE).
- `transactions`: users can read transactions involving their accounts.
- The `transfer_money` function runs as the server role (SECURITY DEFINER)
  so it can modify any account's balance, but it validates ownership of the
  sender account via `auth.uid()`.
*/

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- =========================================================
-- ACCOUNTS
-- =========================================================
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number text UNIQUE NOT NULL,
  balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'RUB',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_accounts" ON accounts;
CREATE POLICY "select_own_accounts" ON accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- TRANSACTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdrawal')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (
    from_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
    OR to_account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- =========================================================
-- AUTO-CREATE PROFILE + ACCOUNT ON SIGNUP
-- =========================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_number text;
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', 'Пользователь'));

  new_account_number := 'RB' || lpad(floor(random() * 9000000000 + 1000000000)::text, 10, '0');

  INSERT INTO accounts (user_id, account_number, balance, currency)
  VALUES (NEW.id, new_account_number, 10000.00, 'RUB');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================================
-- TRANSFER FUNCTION (SECURITY DEFINER)
-- =========================================================

CREATE OR REPLACE FUNCTION transfer_money(
  p_to_account_number text,
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
    RAISE EXCEPTION 'Сумма перевода должна быть больше нуля';
  END IF;

  SELECT * INTO v_sender_account
  FROM accounts WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'У вас нет счёта';
  END IF;

  SELECT * INTO v_receiver_account
  FROM accounts WHERE account_number = p_to_account_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Счёт получателя не найден';
  END IF;

  IF v_sender_account.id = v_receiver_account.id THEN
    RAISE EXCEPTION 'Нельзя перевести на свой же счёт';
  END IF;

  IF v_sender_account.balance < p_amount THEN
    RAISE EXCEPTION 'Недостаточно средств на счёте';
  END IF;

  UPDATE accounts SET balance = balance - p_amount WHERE id = v_sender_account.id;
  UPDATE accounts SET balance = balance + p_amount WHERE id = v_receiver_account.id;

  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (v_sender_account.id, v_receiver_account.id, p_amount, 'transfer', p_description)
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;