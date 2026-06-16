import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineItemsEditor } from "@/components/opportunities/LineItemsEditor"
import { AIDocumentsTab } from "@/components/opportunities/AIDocumentsTab"
import { AIChatTab } from "@/components/opportunities/AIChatTab"
import { OpportunityHeaderActions } from "@/components/opportunities/OpportunityHeaderActions"

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{opty.opportunity_name}</h1>
            <OpportunityHeaderActions optyId={opty.id} currentStage={opty.stage} />
          </div>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            {opty.customer_name} {opty.customer_industry ? `• ${opty.customer_industry}` : ''}
            <Link href={`/opportunities/${opty.id}/edit`}>
              <Button variant="outline" size="sm" className="ml-2 h-7 gap-1.5 rounded-full px-3">
                <Pencil className="h-3 w-3" /> Edit Detail
              </Button>
            </Link>
          </p>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(opty.total_value || 0)}
          </div>
          <p className="text-sm text-muted-foreground">Total Expected Value</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="line_items">Line Items</TabsTrigger>
          <TabsTrigger value="ai_docs">AI Documents</TabsTrigger>
          <TabsTrigger value="ai_chat" className="text-emerald-600 dark:text-emerald-400 font-medium">AI Chat</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        {/* Tab Content: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm border-slate-200/60 dark:border-zinc-800">
              <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800/50">
                <CardTitle className="text-slate-900 dark:text-zinc-100">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Company Name</div>
                    <div className="font-medium text-slate-900 dark:text-zinc-100">{opty.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Industry & Segment</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.customer_industry || '-'} {opty.customer_segment ? `(${opty.customer_segment})` : ''}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">PIC Name</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.customer_pic || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Contact</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.customer_contact || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Address</div>
                    <div className="text-slate-900 dark:text-zinc-100 text-sm whitespace-pre-wrap">{opty.customer_address || '-'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200/60 dark:border-zinc-800">
              <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800/50">
                <CardTitle className="text-slate-900 dark:text-zinc-100">Pipeline Info</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Solution Type</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.opportunity_type || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Request Type</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.request_type || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">SFA ID</div>
                    <div className="text-slate-900 dark:text-zinc-100 font-mono">{opty.sfa_id || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Quote ID</div>
                    <div className="text-slate-900 dark:text-zinc-100 font-mono">{opty.quote_id || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Stage</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.stage}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Probability</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.probability ? `${opty.probability}%` : '-'}</div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Expected Close</div>
                    <div className="text-slate-900 dark:text-zinc-100">{opty.expected_close_date || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-slate-500 dark:text-zinc-400">Data Completeness</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${opty.completeness_score >= 80 ? 'bg-emerald-500' : opty.completeness_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${opty.completeness_score || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8">{opty.completeness_score || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2 shadow-sm border-emerald-200 dark:border-emerald-900">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-b border-emerald-100 dark:border-emerald-900/50">
                <CardTitle className="text-emerald-950 dark:text-emerald-100">Context for AI Generation</CardTitle>
                <CardDescription className="text-emerald-800/70 dark:text-emerald-400/70">Data used by Gemini to generate your High-Level Design and Business Case.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">Pain Points & Objectives</div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl text-sm min-h-20 whitespace-pre-wrap text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/50">
                      {opty.pain_points || 'Not specified.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">Scope of Work</div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl text-sm min-h-24 whitespace-pre-wrap text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/50">
                      {opty.scope_of_work || 'Not specified.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">Technical Requirements</div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl text-sm min-h-24 whitespace-pre-wrap text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/50">
                      {opty.technical_requirements || 'Not specified.'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">Constraints & Risks</div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl text-sm min-h-20 whitespace-pre-wrap text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/50">
                      {opty.constraints || 'Not specified.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">Competitors</div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl text-sm min-h-20 whitespace-pre-wrap text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/50">
                      {opty.competitors || 'Not specified.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">Decision Criteria</div>
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl text-sm min-h-20 whitespace-pre-wrap text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800/50">
                      {opty.decision_criteria || 'Not specified.'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Content: Line Items */}
        <TabsContent value="line_items" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Products & Services (BoQ)</CardTitle>
              <CardDescription>Manage the line items that make up this opportunity.</CardDescription>
            </CardHeader>
            <CardContent>
              <LineItemsEditor opportunityId={opty.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: AI Docs */}
        <TabsContent value="ai_docs" className="mt-6">
          <AIDocumentsTab 
            opportunityId={opty.id} 
            opportunityName={opty.opportunity_name}
            completenessScore={50} // Can be calculated similar to overview
          />
        </TabsContent>

        {/* Tab Content: AI Chat Assistant */}
        <TabsContent value="ai_chat" className="mt-6">
          <AIChatTab 
            opportunityId={opty.id} 
            opportunityName={opty.opportunity_name}
          />
        </TabsContent>

        {/* Tab Content: History (Placeholder) */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Audit trail will be shown here.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
