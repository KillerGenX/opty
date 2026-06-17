"use client"

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react"

interface DashboardChartsProps {
  opportunities: any[]
  stages: string[]
}

const COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6']

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`
  return `Rp ${value}`
}

export function DashboardCharts({ opportunities, stages }: DashboardChartsProps) {
  const stageData = useMemo(() => {
    const data = stages.map(stage => {
      const optysInStage = opportunities.filter(o => o.stage === stage)
      const value = optysInStage.reduce((sum, opty) => {
        let tcv = 0;
        if (opty.opportunity_line_items?.length > 0) {
          opty.opportunity_line_items.forEach((item: any) => {
            tcv += item.total_price || 0;
          })
        }
        return sum + (tcv > 0 ? tcv : Number(opty.total_value || 0))
      }, 0)
      return { name: stage, value }
    })
    return data.filter(d => d.value > 0)
  }, [opportunities])

  const pillarData = useMemo(() => {
    const pillars: Record<string, number> = {}
    opportunities.forEach(opty => {
      if (opty.opportunity_line_items?.length > 0) {
        opty.opportunity_line_items.forEach((item: any) => {
          const p = item.pillar || 'Other'
          pillars[p] = (pillars[p] || 0) + (item.total_price || 0)
        })
      } else {
        // Fallback to 'Uncategorized' if no line items
        pillars['Uncategorized'] = (pillars['Uncategorized'] || 0) + Number(opty.total_value || 0)
      }
    })
    
    return Object.entries(pillars)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [opportunities])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-1 shadow-sm border-slate-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value by Stage</CardTitle>
          <BarChart3 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                <RechartsTooltip 
                  formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value))}
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 shadow-sm border-slate-200/60 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Value by Product Pillar</CardTitle>
          <PieChartIcon className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4 flex items-center justify-center">
            {pillarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pillarData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pillarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No line items categorized yet.</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pillarData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
