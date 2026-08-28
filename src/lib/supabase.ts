import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'client' | 'admin' | 'creator';

export type Profile = {
  id: string;
  display_name: string;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_admin?: boolean;
  password_visible?: boolean;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  account_number: string;
  balance: number;
  currency: string;
  created_at: string;
};

export type Card = {
  id: string;
  account_id: string;
  card_number: number; // 1..1000
  card_holder: string;
  design: string;
  balance: number;
  is_frozen: boolean;
  is_blocked: boolean;
  is_premium: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'loan_repayment';
  description: string | null;
  created_at: string;
};

export type Loan = {
  id: string;
  user_id: string;
  principal: number;
  remaining: number;
  interest_rate: number;
  status: 'active' | 'paid' | 'defaulted';
  created_at: string;
  last_payment_at?: string | null;
};

export type AdminLog = {
  id: string;
  actor_id: string;
  action: string;
  target_id: string | null;
  created_at: string;
};
