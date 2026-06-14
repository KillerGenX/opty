import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('opportunity_documents')
    .select('content_html')
    .eq('doc_type', 'design')
    .order('generated_at', { ascending: false })
    .limit(1)
  
  if (error) console.error(error)
  else console.log(data[0].content_html)
}
run()
