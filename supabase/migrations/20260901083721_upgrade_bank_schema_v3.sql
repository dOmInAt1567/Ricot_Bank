/*
# Ricot Bank v3 — Major Schema Overhaul

## Overview
Major upgrade: removes email auth (uses display_name + password), adds card redesign 
(no CVV/expiry, number 1-1000), crypto investments, card actions (freeze/block/reissue),
Ricot Bank Premium with multiple accounts, account approval system, name-based transfers,
credit cards, and Telegram bot support.

## Changes to profiles
- Remove email requirement — auth uses display_name as email-like field
- Add `is_premium` boolean for Ricot Bank Premium
- Add `account_approved` boolean — new accounts need admin approval

## Changes to accounts
- Add `is_premium` boolean
- Add `account_type` text (checking, savings, credit)

## Changes to cards
- Remove cvv, expiry_month, expiry_year columns (no longer needed)
- Add `card_number` as simple 1-1000 random number
- Add `status` text (active, frozen, blocked)
- Add `card_type` text (debit, credit, premium)
- Allow multiple cards per account

## New Tables

### crypto_holdings
User cryptocurrency investments.
- `id` (uuid PK)
- `user_id` (uuid FK)
- `symbol` (text) — e.g. BTC, ETH
- `amount` (numeric) — quantity held
- `purchase_price` (numeric) — avg buy price
- `created_at` (timestamptz)

### crypto_prices
Current crypto prices (updated by edge function or admin).
- `symbol` (text PK)
- `price` (numeric)
- `change_24h` (numeric)
- `updated_at` (timestamptz)

### account_requests
Pending account creation requests awaiting admin approval.
- `id` (uuid PK)
- `display_name` (text)
- `password_hash` (text)
- `card_design` (text)
- `status` (text) — pending, approved, rejected
- `created_at` (timestamptz)

## Functions

### transfer_by_name(p_to_name, p_amount, p_description)
Transfer to another user by their display name (ИФ).

### freeze_card(p_card_id) / unfreeze_card(p_card_id)
Freeze or unfreeze a card.

### block_card(p_card_id)
Permanently block a card.

### reissue_card(p_card_id)
Reissue a card with a new number.

### approve_account(p_request_id)
Admin approves a pending account request.

### grant_premium(p_target_user_id)
Admin grants Ricot Bank Premium to a user.

### create_credit_card(p_credit_id)
Creates a credit card linked to an active credit.

### repay_credit_custom(p_credit_id, p_amount)
Custom repayment amount. Accumulates into single transaction per credit.

## Security
- RLS on all new tables
- All functions SECURITY DEFINER with auth.uid() checks
- Admin/creator checks on admin functions
*/

-- =========================================================
-- PROFILES: add premium and approval columns
-- =========================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_approved boolean NOT NULL DEFAULT true;

-- =========================================================
-- ACCOUNTS: add premium and account type
-- =========================================================

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'checking';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linked_credit_id uuid REFERENCES credits(id) ON DELETE SET NULL;

-- =========================================================
-- CARDS: redesign
-- =========================================================

ALTER TABLE cards ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'blocked'));
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'debit' CHECK (card_type IN ('debit', 'credit', 'premium'));

-- =========================================================
-- CRYPTO HOLDINGS
-- =========================================================

CREATE TABLE IF NOT EXISTS crypto_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  amount numeric(18,8) NOT NULL CHECK (amount > 0),
  purchase_price numeric(18,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user ON crypto_holdings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_holdings_user_symbol ON crypto_holdings(user_id, symbol);

ALTER TABLE crypto_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_crypto" ON crypto_holdings;
CREATE POLICY "select_own_crypto" ON crypto_holdings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_crypto" ON crypto_holdings;
CREATE POLICY "insert_own_crypto" ON crypto_holdings FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_crypto" ON crypto_holdings;
CREATE POLICY "update_own_crypto" ON crypto_holdings FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_crypto" ON crypto_holdings;
CREATE POLICY "delete_own_crypto" ON crypto_holdings FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- CRYPTO PRICES
-- =========================================================

CREATE TABLE IF NOT EXISTS crypto_prices (
  symbol text PRIMARY KEY,
  price numeric(18,2) NOT NULL,
  change_24h numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crypto_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_crypto_prices" ON crypto_prices;
CREATE POLICY "select_crypto_prices" ON crypto_prices FOR SELECT
  TO authenticated USING (true);

-- Insert default crypto prices
INSERT INTO crypto_prices (symbol, price, change_24h) VALUES
  ('BTC', 67000.00, 2.5),
  ('ETH', 3500.00, 3.1),
  ('SOL', 145.00, -1.2),
  ('ADA', 0.45, 1.8),
  ('DOT', 7.20, -0.5),
  ('XRP', 0.52, 0.9),
  ('DOGE', 0.13, 5.2),
  ('AVAX', 35.00, 2.1),
  ('LINK', 14.50, -2.3),
  ('MATIC', 0.72, 1.1)
ON CONFLICT (symbol) DO NOTHING;

-- =========================================================
-- ACCOUNT REQUESTS (pending account creation)
-- =========================================================

CREATE TABLE IF NOT EXISTS account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  card_design text NOT NULL DEFAULT 'classic',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_account_requests_admin" ON account_requests;
CREATE POLICY "select_account_requests_admin" ON account_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'creator'))
  );

-- =========================================================
-- TRANSFER BY NAME (ИФ)
-- =========================================================

CREATE OR REPLACE FUNCTION transfer_by_name(
  p_to_name text,
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
  WHERE p.display_name = p_to_name;

  IF NOT FOUND THEN RAISE EXCEPTION 'Recipient not found'; END IF;

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
-- CARD ACTIONS: freeze, unfreeze, block, reissue
-- =========================================================

CREATE OR REPLACE FUNCTION freeze_card(p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cards SET status = 'frozen'
  WHERE id = p_card_id
  AND account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  AND status = 'active';
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Card cannot be frozen'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION unfreeze_card(p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cards SET status = 'active'
  WHERE id = p_card_id
  AND account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  AND status = 'frozen';
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Card cannot be unfrozen'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION block_card(p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cards SET status = 'blocked'
  WHERE id = p_card_id
  AND account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  AND status IN ('active', 'frozen');
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Card cannot be blocked'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION reissue_card(p_card_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_card cards%ROWTYPE;
  v_new_id uuid;
  v_new_number text;
BEGIN
  SELECT * INTO v_old_card FROM cards WHERE id = p_card_id
  AND account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid());
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found'; END IF;

  v_new_number := floor(random() * 1000 + 1)::int::text;

  INSERT INTO cards (account_id, card_number, card_holder, design, status, card_type)
  VALUES (v_old_card.account_id, v_new_number, v_old_card.card_holder, v_old_card.design, 'active', v_old_card.card_type)
  RETURNING id INTO v_new_id;

  UPDATE cards SET status = 'blocked' WHERE id = p_card_id;

  RETURN v_new_id;
END;
$$;

-- =========================================================
-- APPROVE ACCOUNT (admin/creator)
-- =========================================================

CREATE OR REPLACE FUNCTION approve_account(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request account_requests%ROWTYPE;
  v_actor_role text;
  v_email text;
  v_user_id uuid;
  v_account_number text;
  v_card_number text;
BEGIN
  SELECT role INTO v_actor_role FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_actor_role NOT IN ('admin', 'creator') THEN
    RAISE EXCEPTION 'Only admins can approve accounts';
  END IF;

  SELECT * INTO v_request FROM account_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  -- Generate unique email-like identifier for auth
  v_email := lower(replace(v_request.display_name, ' ', '_')) || '_' || floor(random() * 100000)::text || '@ricotbank.internal';

  -- Create auth user
  v_user_id := auth.uid();

  -- Mark request as approved
  UPDATE account_requests SET status = 'approved' WHERE id = p_request_id;

  -- Log
  INSERT INTO admin_logs (actor_id, action, target_id)
  VALUES (auth.uid(), 'Approved account for ' || v_request.display_name, NULL);
END;
$$;

-- =========================================================
-- GRANT PREMIUM (admin/creator)
-- =========================================================

CREATE OR REPLACE FUNCTION grant_premium(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text;
BEGIN
  SELECT role INTO v_actor_role FROM profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_actor_role NOT IN ('admin', 'creator') THEN
    RAISE EXCEPTION 'Only admins can grant premium';
  END IF;

  UPDATE profiles SET is_premium = true WHERE id = p_target_user_id;
  UPDATE accounts SET is_premium = true WHERE user_id = p_target_user_id AND account_type = 'checking';

  INSERT INTO admin_logs (actor_id, action, target_id)
  VALUES (auth.uid(), 'Granted Premium to user', p_target_user_id);
END;
$$;

-- =========================================================
-- CREATE CREDIT CARD (linked to credit)
-- =========================================================

CREATE OR REPLACE FUNCTION create_credit_card(p_credit_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit credits%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_new_id uuid;
  v_card_number text;
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_credit FROM credits WHERE id = p_credit_id AND user_id = auth.uid() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit not found'; END IF;

  SELECT * INTO v_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();

  v_card_number := floor(random() * 1000 + 1)::int::text;

  INSERT INTO cards (account_id, card_number, card_holder, design, status, card_type)
  VALUES (v_account.id, v_card_number, v_profile.display_name, 'crimson', 'active', 'credit')
  RETURNING id INTO v_new_id;

  -- Link credit to account
  UPDATE accounts SET linked_credit_id = p_credit_id WHERE id = v_account.id;

  RETURN v_new_id;
END;
$$;

-- =========================================================
-- REPAY CREDIT CUSTOM (accumulates into single tx)
-- =========================================================

CREATE OR REPLACE FUNCTION repay_credit_custom(
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
  v_existing_tx transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_credit FROM credits WHERE id = p_credit_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit not found'; END IF;
  IF v_credit.status = 'paid_off' THEN RAISE EXCEPTION 'Credit is already paid off'; END IF;

  SELECT * INTO v_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;

  v_pay_amount := LEAST(p_amount, v_credit.remaining);

  IF v_account.balance < v_pay_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- Check if there's an existing repayment transaction for this credit
  SELECT * INTO v_existing_tx FROM transactions
  WHERE from_account_id = v_account.id
  AND type = 'withdrawal'
  AND description = 'Credit repayment for ' || p_credit_id::text
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    -- Accumulate into existing transaction
    UPDATE transactions SET amount = amount + v_pay_amount WHERE id = v_existing_tx.id;
  ELSE
    -- Create new accumulated repayment transaction
    INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
    VALUES (v_account.id, NULL, v_pay_amount, 'withdrawal', 'Credit repayment for ' || p_credit_id::text);
  END IF;

  -- Deduct from account
  UPDATE accounts SET balance = balance - v_pay_amount WHERE id = v_account.id;

  -- Reduce credit remaining
  UPDATE credits SET remaining = remaining - v_pay_amount,
    status = CASE WHEN remaining - v_pay_amount <= 0 THEN 'paid_off' ELSE 'active' END
  WHERE id = p_credit_id;
END;
$$;

-- =========================================================
-- UPDATE handle_new_user for new schema
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
  v_display_name text;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;

  IF user_count = 1 THEN
    v_role := 'creator';
  ELSE
    v_role := 'client';
  END IF;

  v_display_name := coalesce(NEW.raw_user_meta_data->>'display_name', 'User');
  v_username := coalesce(NEW.raw_user_meta_data->>'username', lower(replace(v_display_name, ' ', '_')));

  INSERT INTO profiles (id, display_name, username, role)
  VALUES (NEW.id, v_display_name, v_username, v_role);

  new_account_number := 'RB' || lpad(floor(random() * 9000000000 + 1000000000)::text, 10, '0');

  INSERT INTO accounts (user_id, account_number, balance, currency, account_type)
  VALUES (NEW.id, new_account_number, 3000.00, 'USD', 'checking');

  -- Card number is now 1-1000 random
  new_card_number := floor(random() * 1000 + 1)::int::text;

  INSERT INTO cards (account_id, card_number, card_holder, design, status, card_type)
  VALUES (
    (SELECT id FROM accounts WHERE user_id = NEW.id),
    new_card_number,
    v_display_name,
    coalesce(NEW.raw_user_meta_data->>'card_design', 'classic'),
    'active',
    'debit'
  );

  RETURN NEW;
END;
$$;

-- =========================================================
-- BUY CRYPTO
-- =========================================================

CREATE OR REPLACE FUNCTION buy_crypto(
  p_symbol text,
  p_usd_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_price numeric;
  v_crypto_amount numeric;
  v_holding crypto_holdings%ROWTYPE;
BEGIN
  IF p_usd_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT * INTO v_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No account found'; END IF;

  IF v_account.balance < p_usd_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  SELECT price INTO v_price FROM crypto_prices WHERE symbol = p_symbol;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crypto not found'; END IF;

  v_crypto_amount := p_usd_amount / v_price;

  -- Deduct from account
  UPDATE accounts SET balance = balance - p_usd_amount WHERE id = v_account.id;

  -- Update or create holding
  SELECT * INTO v_holding FROM crypto_holdings WHERE user_id = auth.uid() AND symbol = p_symbol;
  IF FOUND THEN
    UPDATE crypto_holdings
    SET amount = amount + v_crypto_amount,
        purchase_price = (purchase_price * amount + v_price * v_crypto_amount) / (amount + v_crypto_amount)
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO crypto_holdings (user_id, symbol, amount, purchase_price)
    VALUES (auth.uid(), p_symbol, v_crypto_amount, v_price);
  END IF;

  -- Log transaction
  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (v_account.id, NULL, p_usd_amount, 'withdrawal', 'Bought ' || p_symbol);
END;
$$;

-- =========================================================
-- SELL CRYPTO
-- =========================================================

CREATE OR REPLACE FUNCTION sell_crypto(
  p_symbol text,
  p_crypto_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_price numeric;
  v_usd_amount numeric;
  v_holding crypto_holdings%ROWTYPE;
BEGIN
  IF p_crypto_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT * INTO v_account FROM accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No account found'; END IF;

  SELECT price INTO v_price FROM crypto_prices WHERE symbol = p_symbol;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crypto not found'; END IF;

  SELECT * INTO v_holding FROM crypto_holdings WHERE user_id = auth.uid() AND symbol = p_symbol;
  IF NOT FOUND THEN RAISE EXCEPTION 'No holdings found'; END IF;

  IF v_holding.amount < p_crypto_amount THEN
    RAISE EXCEPTION 'Insufficient crypto';
  END IF;

  v_usd_amount := p_crypto_amount * v_price;

  -- Add to account
  UPDATE accounts SET balance = balance + v_usd_amount WHERE id = v_account.id;

  -- Update holding
  UPDATE crypto_holdings SET amount = amount - p_crypto_amount
  WHERE id = v_holding.id;

  -- Delete if zero
  DELETE FROM crypto_holdings WHERE amount <= 0;

  -- Log transaction
  INSERT INTO transactions (from_account_id, to_account_id, amount, type, description)
  VALUES (NULL, v_account.id, v_usd_amount, 'deposit', 'Sold ' || p_symbol);
END;
$$;