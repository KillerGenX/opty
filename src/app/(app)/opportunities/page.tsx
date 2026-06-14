import { createClient } from "@/lib/supabase/server"
import { OpportunityListClient } from "./OpportunityListClient"

export default async function OpportunitiesPage() {
  const supabase = await createClient()
  
  // Fetch opportunities
  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  // Safely fallback to empty array if error
  const safeOpportunities = opportunities || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Pipeline Dashboard</h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Track deal progress, measure pipeline health, and close more opportunities.
        </p>
      </div>

      <OpportunityListClient initialData={safeOpportunities} />
    </div>
  )
}

