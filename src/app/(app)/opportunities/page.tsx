import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function OpportunitiesPage() {
  const supabase = await createClient()
  
  // Fetch opportunities
  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  // Safely fallback to empty array if error
  const safeOpportunities = opportunities || []

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Prospecting': return 'bg-slate-500'
      case 'Qualification': return 'bg-blue-500'
      case 'Proposal': return 'bg-indigo-500'
      case 'Negotiation': return 'bg-amber-500'
      case 'Won': return 'bg-emerald-500'
      case 'Lost': return 'bg-red-500'
      default: return 'bg-slate-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">
            Manage your pipeline and track deal progress.
          </p>
        </div>
        <Link href="/opportunities/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Opportunity
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Value (IDR)</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Completeness</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeOpportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No opportunities found.
                </TableCell>
              </TableRow>
            ) : (
              safeOpportunities.map((opty) => (
                <TableRow key={opty.id}>
                  <TableCell className="font-medium">
                    <Link href={`/opportunities/${opty.id}`} className="hover:underline">
                      {opty.opportunity_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {opty.customer_name}
                    <div className="text-xs text-muted-foreground">{opty.customer_industry}</div>
                  </TableCell>
                  <TableCell>{formatCurrency(opty.total_value || 0)}</TableCell>
                  <TableCell>
                    <Badge className={`${getStageColor(opty.stage)} text-white hover:${getStageColor(opty.stage)} border-none`}>
                      {opty.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-secondary rounded-full h-2 max-w-[100px]">
                        <div 
                          className={`h-2 rounded-full ${opty.completeness_score >= 80 ? 'bg-emerald-500' : opty.completeness_score >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
                          style={{ width: `${opty.completeness_score || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{opty.completeness_score || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/opportunities/${opty.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
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
