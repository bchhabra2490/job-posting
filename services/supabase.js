const { createClient } = require('@supabase/supabase-js');

const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient('https://vemrcgfoubguadadkjnf.supabase.co', supabaseKey)


module.exports = supabase