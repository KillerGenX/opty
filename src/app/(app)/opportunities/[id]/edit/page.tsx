import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { OpportunityForm } from "@/components/opportunities/OpportunityForm"

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch opportunity details
  const { data: opty, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !opty) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Edit Opportunity</h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Update the details and AI context for {opty.opportunity_name}.
        </p>
      </div>

      <OpportunityForm initialData={opty} isEdit={true} />
    </div>
  )
}
