import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getColumns() {
  const { data, error } = await supabase
    .rpc('get_opportunities_schema') // this won't work unless defined
  
  // Actually, we can just do a select with limit 1 to see the keys
  const { data: rows, error: selectError } = await supabase
    .from('opportunities')
    .select('*')
    .limit(1)

  if (selectError) {
    console.error(selectError)
    return
  }

  if (rows && rows.length > 0) {
    console.log(Object.keys(rows[0]))
  } else {
    console.log("No rows, cannot infer schema this way without psql")
  }
}

getColumns()
