import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Repeat, Zap, Sparkles, Building2, Server, Wifi, Shield, Target } from "lucide-react"
import { DashboardCharts } from "./DashboardCharts"
import { cn } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Fetch real data for KPIs with line items
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*, opportunity_line_items(*)')
    .order('created_at', { ascending: false })

  const { data: stageSettings } = await supabase
    .from('master_settings')
    .select('value')
    .eq('category', 'STAGE')
    .order('sort_order', { ascending: true })
    
  const stagesList = stageSettings && stageSettings.length > 0 
    ? stageSettings.map(s => s.value) 
    : ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']

  const { data: documents } = await supabase
    .from('opportunity_documents')
    .select('id')

  const optyList = opportunities || []
  
  let totalValue = 0;
  let totalMrc = 0;
  let totalOtc = 0;
  let wonCount = 0;
  let lostCount = 0;
  let activeCount = 0;
  let totalLostValue = 0;
  let totalWonValue = 0;

  optyList.forEach(opty => {
    let optyTcv = 0;
    let optyMrc = 0;
    let optyOtc = 0;

    if (opty.opportunity_line_items && opty.opportunity_line_items.length > 0) {
      opty.opportunity_line_items.forEach((item: any) => {
        const qty = item.quantity || 1;
        optyMrc += (item.mrc || 0) * qty;
        optyOtc += (item.otc || 0) * qty;
        optyTcv += item.total_price || 0;
      });
    }
    const finalTcv = optyTcv > 0 ? optyTcv : Number(opty.total_value || 0);

    if (opty.stage === 'Won') {
      wonCount++;
      totalWonValue += finalTcv;
    } else if (opty.stage === 'Lost') {
      lostCount++;
      totalLostValue += finalTcv;
    } else {
      activeCount++;
    }

    if (opty.stage !== 'Lost') {
      totalMrc += optyMrc;
      totalOtc += optyOtc;
      totalValue += finalTcv;
    }
  });

  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  const formatCompactCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }

  const getPillarIcon = (pillar: string) => {
    switch (pillar) {
      case 'Connectivity': return <Wifi className="h-4 w-4 text-sky-500" />
      case 'ICT': return <Server className="h-4 w-4 text-indigo-500" />
      case 'Security': return <Shield className="h-4 w-4 text-rose-500" />
      default: return <Building2 className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Enterprise Pipeline</h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Executive overview of your active deals, recurring revenue, and AI operations.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Pipeline Value (TCV) */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 dark:from-emerald-900/20 dark:to-teal-900/20 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-950 dark:text-emerald-100">Total Contract Value (TCV)</CardTitle>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" title={formatCurrency(totalValue)}>{formatCompactCurrency(totalValue)}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Across {activeCount + wonCount} active & won deals</p>
          </CardContent>
        </Card>

        {/* Total MRC */}
        <Card className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/20 dark:from-indigo-900/20 dark:to-blue-900/20 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-950 dark:text-indigo-100">Total Monthly Recurring</CardTitle>
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Repeat className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400" title={formatCurrency(totalMrc)}>{formatCompactCurrency(totalMrc)}</div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">Expected monthly revenue</p>
          </CardContent>
        </Card>

        {/* Total OTC */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-950 dark:text-amber-100">Total One-Time Charge</CardTitle>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400" title={formatCurrency(totalOtc)}>{formatCompactCurrency(totalOtc)}</div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Setup & installation revenue</p>
          </CardContent>
        </Card>

        {/* Win / Loss Performance */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 dark:from-violet-900/20 dark:to-purple-900/20 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Target className="w-24 h-24 text-violet-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-violet-950 dark:text-violet-100">Win / Loss Performance</CardTitle>
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="text-2xl font-bold text-violet-700 dark:text-violet-400">{winRate}% Rate</div>
            </div>
            <div className="flex flex-col text-[11px] text-violet-600/80 dark:text-violet-400/80 font-medium space-y-0.5">
              <div className="flex justify-between">
                <span>Won ({wonCount})</span>
                <span className="font-semibold text-violet-700 dark:text-violet-300">{formatCompactCurrency(totalWonValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Lost ({lostCount})</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCompactCurrency(totalLostValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <DashboardCharts opportunities={optyList} stages={stagesList} />

      {/* Recent Opportunities */}
      <Card className="shadow-sm border-slate-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Recent Deals Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {optyList.slice(0, 5).map(opty => {
              let optyMrc = 0;
              let optyOtc = 0;
              let optyTcv = 0;
              let optyTerm = 0;
              let mainPillar = 'Unknown';
              
              if (opty.opportunity_line_items && opty.opportunity_line_items.length > 0) {
                // Get the most prominent pillar
                mainPillar = opty.opportunity_line_items[0].pillar || 'Unknown';
                
                opty.opportunity_line_items.forEach((item: any) => {
                  const qty = item.quantity || 1;
                  optyMrc += (item.mrc || 0) * qty;
                  optyOtc += (item.otc || 0) * qty;
                  optyTcv += item.total_price || 0;
                  if ((item.mrc || 0) > 0 && (item.contract_term || 0) > optyTerm) {
                    optyTerm = item.contract_term;
                  }
                });
              }
              const displayTcv = optyTcv > 0 ? optyTcv : Number(opty.total_value || 0);
              const daysActive = Math.floor((new Date().getTime() - new Date(opty.created_at).getTime()) / (1000 * 3600 * 24));
              const stageColors = opty.stage === 'Won' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  opty.stage === 'Lost' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  "bg-indigo-50 text-indigo-700 border-indigo-200";

              return (
                <div key={opty.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-900 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 h-10 w-10 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-zinc-700 group-hover:scale-110 group-hover:border-indigo-200 transition-all duration-300">
                      {getPillarIcon(mainPillar)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{opty.opportunity_name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">{opty.customer_name}</div>
                      <div className="flex items-center gap-2 mt-2 sm:hidden">
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold border", stageColors)}>{opty.stage}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right mt-4 sm:mt-0 flex flex-col justify-end items-end">
                    <div className="flex items-center justify-end gap-3 mb-1">
                      <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className={cn("text-xs px-3 py-0.5 rounded-full font-bold border shadow-sm", stageColors)}>{opty.stage}</span>
                        {opty.stage !== 'Won' && opty.stage !== 'Lost' && (
                          <span className="text-[10px] text-slate-400 mt-1">{daysActive} days active</span>
                        )}
                      </div>
                      <div className="font-bold text-lg text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{formatCurrency(displayTcv)}</div>
                    </div>
                    {(optyMrc > 0 || optyOtc > 0) ? (
                      <div className="flex flex-col text-[10px] text-slate-500 items-end whitespace-nowrap gap-0.5">
                        {optyMrc > 0 && <span>MRC: {formatCurrency(optyMrc)} {optyTerm > 0 ? `x ${optyTerm}` : ''}</span>}
                        {optyOtc > 0 && <span>OTC: {formatCurrency(optyOtc)}</span>}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
            {optyList.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl border-slate-200 dark:border-zinc-800">
                <Building2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
                No opportunities yet. Time to fill your pipeline!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
