import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wroyadttjnkdjcgeerol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyb3lhZHR0am5rZGpjZ2Vlcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjMxOTIsImV4cCI6MjA5NjIzOTE5Mn0.g1T3KRG9OgBj79PUimRZci5bQQCl_yID9fsNdd57VKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection...');
  const { data, error } = await supabase.from('kpis').select('id').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success, data:', data);
  }
}

test();
