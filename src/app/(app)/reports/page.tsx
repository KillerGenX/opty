import { createClient } from "@/lib/supabase/server"
import { MeetingDeckClient } from "./ClientDeck"


export default async function ReportsPage() {
  const supabase = await createClient()

  // 1. Fetch all active and won opportunities with line items
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select(`
      *,
      opportunity_line_items (
        id,
        pillar,
        product_name,
        mrc,
        otc,
        quantity,
        total_price
      )
    `)
    .order('created_at', { ascending: false })

  // 2. Fetch recent activities to calculate Stagnant Deals (Velocity)
  // We just need the latest activity date per opportunity, but we'll fetch them all and process in memory since there aren't millions.
  const { data: activities } = await supabase
    .from('opportunity_activities')
    .select('opportunity_id, created_at, activity_type')
    .order('created_at', { ascending: false })

  // 3. Fetch stages to know the sequence
  const { data: stageSettings } = await supabase
    .from('master_settings')
    .select('value, sort_order')
    .eq('category', 'STAGE')
    .order('sort_order', { ascending: true })

  const stagesList = stageSettings && stageSettings.length > 0
    ? stageSettings.map(s => s.value)
    : ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meeting Deck</h1>
        <p className="text-muted-foreground mt-1">
          Interactive presentation dashboard for weekly and monthly performance reviews.
        </p>
      </div>

      <MeetingDeckClient
        opportunities={opportunities || []}
        activities={activities || []}
        stages={stagesList}
      />
    </div>
  )
}
