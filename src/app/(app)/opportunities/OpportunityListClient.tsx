"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Building2, TrendingUp, Target, Award } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function OpportunityListClient({ initialData }: { initialData: any[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")



  // Filter Data
  const filteredData = useMemo(() => {
    return initialData.filter(opty => {
      const searchLower = search.toLowerCase()
      return (
        opty.opportunity_name?.toLowerCase().includes(searchLower) ||
        opty.customer_name?.toLowerCase().includes(searchLower) ||
        opty.customer_industry?.toLowerCase().includes(searchLower)
      )
    })
  }, [initialData, search])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Prospecting': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
      case 'Qualification': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
      case 'Proposal': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'
      case 'Negotiation': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      case 'Won': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      case 'Lost': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-8">


      {/* Actions and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search deals, customers, or industry..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-white dark:bg-zinc-950"
          />
        </div>
        <Link href="/opportunities/new" className="w-full sm:w-auto">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Opportunity
          </Button>
        </Link>
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold w-[35%]">Opportunity</TableHead>
              <TableHead className="font-semibold w-[25%]">Customer</TableHead>
              <TableHead className="font-semibold text-right w-[15%]">Value (IDR)</TableHead>
              <TableHead className="font-semibold w-[10%]">Stage</TableHead>
              <TableHead className="font-semibold w-[15%]">Health</TableHead>
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
                  className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                  onClick={() => router.push(`/opportunities/${opty.id}`)}
                >
                  <TableCell className="overflow-hidden">
                    <div 
                      className="font-medium text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors w-full truncate"
                      title={opty.opportunity_name}
                    >
                      {opty.opportunity_name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 w-full truncate">
                      {opty.opportunity_type || 'Solution'}
                    </div>
                  </TableCell>
                  <TableCell className="overflow-hidden">
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-8 w-8 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div 
                          className="font-medium text-sm w-full truncate"
                          title={opty.customer_name}
                        >
                          {opty.customer_name}
                        </div>
                        <div className="text-xs text-slate-500 w-full truncate">
                          {opty.customer_industry}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-700 dark:text-zinc-300">
                    {formatCurrency(opty.total_value || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getStageColor(opty.stage)}`}>
                      {opty.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[80px] overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${opty.completeness_score >= 80 ? 'bg-emerald-500' : opty.completeness_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${opty.completeness_score || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 w-8">{opty.completeness_score || 0}%</span>
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
