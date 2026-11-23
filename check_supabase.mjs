import { createClient } from '@supabase/supabase-js';

const url = 'https://wisfyboizufpywcpwqok.supabase.co';
const key = 'sb_publishable_ipFXcMBeFUteoVdN3wvTlw_vcjRN3P8';

const supabase = createClient(url, key);

async function test() {
  console.log('--- Testing Supabase Connection ---');
  
  // Test foods table
  const { data: foods, error: foodsErr } = await supabase.from('foods').select('id, name, energy_kcal').limit(5);
  console.log('Foods query:', { count: foods?.length, error: foodsErr?.message, sample: foods });

  // Test food_logs table
  const { data: logs, error: logsErr } = await supabase.from('food_logs').select('*').limit(5);
  console.log('Food logs query:', { count: logs?.length, error: logsErr?.message });

  // Test profiles table
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('username').limit(5);
  console.log('Profiles query:', { count: profiles?.length, error: profErr?.message, profiles });
}

test().catch(console.error);
