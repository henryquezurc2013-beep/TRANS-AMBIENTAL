import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fdacmjicteowdwysrbcm.supabase.co'
const supabaseKey = 'sb_publishable_ZUC-Mb3ed68lx37sKTG0kw_ifYJkzoi'

export const supabase = createClient(supabaseUrl, supabaseKey)
