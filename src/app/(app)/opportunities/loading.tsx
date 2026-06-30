import { Loader2 } from "lucide-react"

export default function OpportunitiesLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center text-slate-500 dark:text-zinc-500">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
      <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Loading Opportunities...</h2>
      <p className="text-sm mt-1">Fetching deals and line items</p>
    </div>
  )
}
