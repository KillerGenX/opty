import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Target, Trophy, FileText } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Fetch real data for KPIs
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*')

  const { data: documents } = await supabase
    .from('opportunity_documents')
    .select('id')

  const optyList = opportunities || []
  
  const totalValue = optyList.reduce((sum, opty) => sum + (Number(opty.total_value) || 0), 0)
  const activeOpportunities = optyList.filter(o => !['Won', 'Lost'].includes(o.stage)).length
  const wonOpportunities = optyList.filter(o => o.stage === 'Won').length
  const winRate = optyList.length > 0 ? Math.round((wonOpportunities / optyList.length) * 100) : 0
  const docsGenerated = documents?.length || 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your pipeline.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Pipeline Value */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-950 dark:text-emerald-100">Total Pipeline Value</CardTitle>
            <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Across {optyList.length} total opportunities</p>
          </CardContent>
        </Card>

        {/* Active Opportunities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOpportunities}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{wonOpportunities} deals won</p>
          </CardContent>
        </Card>

        {/* AI Documents Generated */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Docs Generated</CardTitle>
            <FileText className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-500">{docsGenerated}</div>
            <p className="text-xs text-muted-foreground mt-1">Documents created by Gemini</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {optyList.slice(0, 5).map(opty => (
                <div key={opty.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                  <div>
                    <div className="font-medium">{opty.opportunity_name}</div>
                    <div className="text-sm text-muted-foreground">{opty.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(opty.total_value || 0)}</div>
                    <div className="text-sm text-muted-foreground">{opty.stage}</div>
                  </div>
                </div>
              ))}
              {optyList.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No opportunities yet. Create one to see it here!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm border-slate-200/60 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-zinc-100">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won'].map(stage => {
                const count = optyList.filter(o => o.stage === stage).length;
                const percentage = optyList.length > 0 ? (count / optyList.length) * 100 : 0;
                
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-zinc-300">{stage}</span>
                      <span className="text-slate-500 dark:text-zinc-500">{count} deals</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
