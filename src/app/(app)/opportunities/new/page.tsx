import { OpportunityForm } from "@/components/opportunities/OpportunityForm"

export default function NewOpportunityPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">New Opportunity</h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Create a new pipeline opportunity. Fill out the AI context to get the best auto-generated documents.
        </p>
      </div>

      <OpportunityForm />
    </div>
  )
}
