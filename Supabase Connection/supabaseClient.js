import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://bnxfchcsjqiujvpzutnv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_p3CuE9xI048UzgW4zdIqjw_onztjaHu';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);