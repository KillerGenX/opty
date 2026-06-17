"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Building2, TrendingUp, Target, Award, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface OpportunityListClientProps {
  initialData: any[]
  stages: string[]
}

export function OpportunityListClient({ initialData, stages }: OpportunityListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [isNavigatingNew, setIsNavigatingNew] = useState(false)
  const [navigatingRowId, setNavigatingRowId] = useState<string | null>(null)



  // Filter Data
  const filteredData = useMemo(() => {
    return initialData.filter(opty => {
      const searchLower = search.toLowerCase()
      return (
        opty.opportunity_name?.toLowerCase().includes(searchLower) ||
        opty.customer_name?.toLowerCase().includes(searchLower) ||
        opty.customer_industry?.toLowerCase().includes(searchLower) ||
        opty.sfa_id?.toLowerCase().includes(searchLower) ||
        opty.quote_id?.toLowerCase().includes(searchLower)
      )
    })
  }, [initialData, search])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  const STAGE_COLORS = [
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800',
    'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800'
  ]
  
  const PROGRESS_COLORS = [
    'bg-slate-400 dark:bg-slate-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-amber-500',
    'bg-fuchsia-500',
    'bg-cyan-500'
  ]

  const getStageColor = (stage: string) => {
    // Force known endpoint stages to specific colors
    if (stage.toLowerCase() === 'won' || stage.toLowerCase() === 'menang') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
    if (stage.toLowerCase() === 'lost' || stage.toLowerCase() === 'kalah') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    
    const index = stages.indexOf(stage)
    if (index === -1) return STAGE_COLORS[0]
    return STAGE_COLORS[index % STAGE_COLORS.length]
  }

  const getStageProgress = (stage: string) => {
    if (stage.toLowerCase() === 'won' || stage.toLowerCase() === 'menang') return { percent: 100, color: 'bg-emerald-500' }
    if (stage.toLowerCase() === 'lost' || stage.toLowerCase() === 'kalah') return { percent: 100, color: 'bg-red-500' }

    const index = stages.indexOf(stage)
    if (index === -1 || stages.length <= 1) return { percent: 0, color: PROGRESS_COLORS[0] }
    
    // Determine max index excluding 'Won' and 'Lost' if they exist at the end
    let maxValidIndex = stages.length - 1
    if (stages[stages.length - 1]?.toLowerCase() === 'lost') maxValidIndex--
    if (stages[stages.length - 2]?.toLowerCase() === 'won') maxValidIndex--
    if (maxValidIndex < 1) maxValidIndex = 1

    const rawPercent = (index / maxValidIndex) * 100
    const percent = Math.min(Math.round(rawPercent), 95) // Cap at 95% unless Won/Lost

    return { 
      percent, 
      color: PROGRESS_COLORS[index % PROGRESS_COLORS.length] 
    }
  }

  return (
    <div className="space-y-8">


      {/* Actions and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by SFA ID, Quote ID, customer, or deal name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-white dark:bg-zinc-950"
          />
        </div>
        <Button
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={isNavigatingNew}
          onClick={() => {
            setIsNavigatingNew(true)
            router.push('/opportunities/new')
          }}
        >
          {isNavigatingNew ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {isNavigatingNew ? "Loading..." : "New Opportunity"}
        </Button>
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30%]">Opportunity</TableHead>
              <TableHead className="w-[25%]">Customer</TableHead>
              <TableHead className="w-[15%] text-right">Value</TableHead>
              <TableHead className="w-[15%]">Stage</TableHead>
              <TableHead className="w-[15%]">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-8 w-8 text-slate-300" />
                    <p>No opportunities found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((opty) => (
                <TableRow
                  key={opty.id}
                  className={`group cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors ${navigatingRowId === opty.id ? 'opacity-70 bg-slate-50 dark:bg-zinc-900/50' : ''}`}
                  onClick={() => {
                    setNavigatingRowId(opty.id)
                    router.push(`/opportunities/${opty.id}`)
                  }}
                >
                  <TableCell className="align-top py-4">
                    <div
                      className="font-medium text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors break-words whitespace-normal"
                    >
                      {opty.opportunity_name}
                      {navigatingRowId === opty.id && <Loader2 className="inline ml-2 h-4 w-4 animate-spin text-emerald-600" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="text-xs text-slate-500 font-medium">
                        {opty.opportunity_type || 'Solution'}
                      </div>
                      {opty.sfa_id && (
                        <div className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                          SFA: {opty.sfa_id}
                        </div>
                      )}
                      {opty.quote_id && (
                        <div className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                          Quote: {opty.quote_id}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-medium text-sm break-words whitespace-normal"
                        >
                          {opty.customer_name}
                        </div>
                        <div className="text-xs text-slate-500 break-words whitespace-normal mt-0.5">
                          {opty.customer_industry}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top py-4">
                    {(() => {
                      let optyMrc = 0;
                      let optyOtc = 0;
                      let optyTcv = 0;
                      let optyTerm = 0;
                      if (opty.opportunity_line_items && opty.opportunity_line_items.length > 0) {
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

                      return (
                        <div className="flex flex-col items-end">
                          <div className="font-bold text-slate-900 dark:text-zinc-100">{formatCurrency(displayTcv)}</div>
                          {(optyMrc > 0 || optyOtc > 0) && (
                            <div className="flex flex-col mt-1 text-[10px] text-slate-500 gap-0.5 text-right whitespace-nowrap">
                              {optyMrc > 0 && <span>MRC: {formatCurrency(optyMrc)} {optyTerm > 0 ? `x ${optyTerm}` : ''}</span>}
                              {optyOtc > 0 && <span>OTC: {formatCurrency(optyOtc)}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <Badge variant="outline" className={`${getStageColor(opty.stage)}`}>
                      {opty.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top py-4">
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[80px] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getStageProgress(opty.stage).color}`}
                          style={{ width: `${getStageProgress(opty.stage).percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 w-8">{getStageProgress(opty.stage).percent}%</span>
                      {navigatingRowId === opty.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600 ml-auto" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
