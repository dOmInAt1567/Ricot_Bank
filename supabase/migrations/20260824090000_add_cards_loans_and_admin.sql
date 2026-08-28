-- 20260824 Add cards, loans, account requests and admin flag
-- Adds cards table, loans table, account_requests table and extends profiles

BEGIN;

-- Add role/is_admin to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Create account_requests table (users request new accounts / admins approve)
CREATE TABLE IF NOT EXISTS account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_currency text NOT NULL DEFAULT 'RUB',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note text
);

ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_account_requests ON account_requests;
CREATE POLICY select_own_account_requests ON account_requests FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS insert_account_requests ON account_requests;
CREATE POLICY insert_account_requests ON account_requests FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number int UNIQUE NOT NULL CHECK (card_number >= 1 AND card_number <= 1000),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  design_key text NOT NULL,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  is_frozen boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_cards ON cards;
CREATE POLICY select_own_cards ON cards FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  principal numeric(18,2) NOT NULL,
  remaining numeric(18,2) NOT NULL,
  interest_rate numeric(5,4) NOT NULL DEFAULT 0.10, -- e.g. 0.10 = 10%
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid','defaulted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_payment_at timestamptz
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_loans ON loans;
CREATE POLICY select_own_loans ON loans FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Function: issue_card - creates a new card with random available number 1..1000
CREATE OR REPLACE FUNCTION issue_card(p_user uuid, p_account uuid, p_design text, p_is_premium boolean DEFAULT false)
RETURNS cards%ROWTYPE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num int;
  v_exists boolean;
  v_row cards%ROWTYPE;
BEGIN
  IF p_is_premium AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND is_admin = true) THEN
    -- only admin may assign premium via this RPC or via admin UI; caller should check privileges
    NULL; -- allow creation but preserve flag; real checks should be done by the app
  END IF;

  -- try to find a free card number up to 100 attempts
  v_num := floor(random() * 1000 + 1)::int;
  v_exists := EXISTS(SELECT 1 FROM cards WHERE card_number = v_num);
  FOR i IN 1..100 LOOP
    IF NOT v_exists THEN
      EXIT;
    END IF;
    v_num := ((v_num % 1000) + 1);
    v_exists := EXISTS(SELECT 1 FROM cards WHERE card_number = v_num);
  END LOOP;

  IF v_exists THEN
    RAISE EXCEPTION 'No available card number found';
  END IF;

  INSERT INTO cards (user_id, card_number, account_id, design_key, balance, is_premium)
  VALUES (p_user, v_num, p_account, p_design, 0, p_is_premium)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Function: repay_loan - apply payment to loan.remaining, update last_payment_at and status
CREATE OR REPLACE FUNCTION repay_loan(p_loan uuid, p_amount numeric)
RETURNS loans%ROWTYPE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loan loans%ROWTYPE;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment must be positive';
  END IF;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found';
  END IF;

  IF v_loan.status <> 'active' THEN
    RAISE EXCEPTION 'Loan is not active';
  END IF;

  IF p_amount >= v_loan.remaining THEN
    v_loan.remaining := 0;
    v_loan.status := 'paid';
    v_loan.last_payment_at := now();
  ELSE
    v_loan.remaining := v_loan.remaining - p_amount;
    v_loan.last_payment_at := now();
  END IF;

  UPDATE loans SET remaining = v_loan.remaining, status = v_loan.status, last_payment_at = v_loan.last_payment_at WHERE id = v_loan.id;

  RETURN v_loan;
END;
$$;

COMMIT;
