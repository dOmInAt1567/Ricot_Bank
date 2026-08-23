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
  password_visible: boolean;
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
  card_number: string;
  card_holder: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  design: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal';
  description: string | null;
  created_at: string;
};

export type Credit = {
  id: string;
  user_id: string;
  amount: number;
  remaining: number;
  interest_rate: number;
  status: 'active' | 'paid_off';
  created_at: string;
};

export type AdminLog = {
  id: string;
  actor_id: string;
  action: string;
  target_id: string | null;
  created_at: string;
};
