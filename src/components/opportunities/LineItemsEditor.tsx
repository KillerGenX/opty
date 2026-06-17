"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Trash2, Plus, Save, MapPin, Building, Cable, Hash, Wifi } from "lucide-react"

interface LineItem {
  id?: string
  pillar: string
  product_name: string
  specification: string
  quantity: number
  capacity: string
  unit: string
  mrc: number
  otc: number
  contract_term: number
  site_a: string
  site_b: string
  lastmile: string
  cid: string
  total_price: number
}

// Determines if a pillar should use Telco (connectivity) mode
const isTelcoPillar = (pillar: string) => {
  const telcoPillars = ['connectivity', 'konektivitas', 'internet', 'telco']
  return telcoPillars.some(t => pillar?.toLowerCase().includes(t))
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)

const formatNumber = (value: number) =>
  value ? new Intl.NumberFormat('id-ID').format(value) : ''

const parseCapacityNum = (capacity: string) => {
  if (!capacity) return '';
  let str = capacity.replace(/[^\d.,]/g, '');
  if (!str) return '';

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  // Jika ada koma DAN titik (misal: 1.000,50 atau 1,000.50)
  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) return str.replace(/,/g, ''); // Format US (1,000.50 -> 1000.50)
    return str.replace(/\./g, '').replace(/,/g, '.');     // Format ID (1.000,50 -> 1000.50)
  }
  
  // Jika hanya ada koma
  if (lastComma > -1) {
    // Jika persis 3 angka di belakang koma, asumsikan ribuan (misal: 2,000 -> 2000)
    if (/,(\d{3})$/.test(str) && (str.match(/,/g) || []).length === 1) return str.replace(/,/g, ''); 
    return str.replace(/,/g, '.'); // Jika tidak, asumsikan desimal (misal: 2,5 -> 2.5)
  }
  
  // Jika hanya ada titik
  if (lastDot > -1) {
    // Jika persis 3 angka di belakang titik, asumsikan ribuan (misal: 2.800 -> 2800)
    if (/\.(\d{3})$/.test(str)) return str.replace(/\./g, '');
    return str; // Jika tidak, asumsikan desimal (misal: 2.5 -> 2.5)
  }
  
  return str;
}

const parseCapacityUnit = (capacity: string) => {
  const match = (capacity || '').match(/([a-zA-Z]+)\s*$/)
  const u = match ? match[1].toLowerCase() : 'mbps'
  if (u === 'kbps') return 'Kbps'
  if (u === 'gbps') return 'Gbps'
  return 'Mbps'
}

export function LineItemsEditor({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [productCatalog, setProductCatalog] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { fetchItems() }, [opportunityId])

  const fetchItems = async () => {
    setLoading(true)
    const [itemsRes, catalogRes] = await Promise.all([
      supabase.from('opportunity_line_items').select('*').eq('opportunity_id', opportunityId).order('created_at', { ascending: true }),
      supabase.from('product_catalog').select('*').eq('is_active', true)
    ])
    if (itemsRes.data) setItems(itemsRes.data)
    if (catalogRes.data) setProductCatalog(catalogRes.data)
    setLoading(false)
  }

  const pillarsList = Array.from(new Set(productCatalog.map(p => p.pillar_name)))

  const handleAddItem = () => {
    setItems([...items, {
      pillar: "", product_name: "", specification: "",
      quantity: 1, capacity: "", unit: "",
      mrc: 0, otc: 0, contract_term: 12,
      site_a: "", site_b: "", lastmile: "", cid: "",
      total_price: 0
    }])
  }

  const handleRemoveItem = async (index: number, id?: string) => {
    if (id) await supabase.from('opportunity_line_items').delete().eq('id', id)
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
    updateOpportunityTotal(newItems)
  }

  const handleChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate TCV: Qty × (OTC + MRC × Contract Term)
    // capacity/bandwidth is spec-only — does NOT affect TCV
    if (['quantity', 'mrc', 'otc', 'contract_term'].includes(field as string)) {
      const qty = newItems[index].quantity || 1
      const mrc = newItems[index].mrc || 0
      const otc = newItems[index].otc || 0
      const term = newItems[index].contract_term || 1
      newItems[index].total_price = qty * (otc + mrc * term)
    }

    // Auto-set unit from catalog
    if (field === 'product_name') {
      const product = productCatalog.find(p => p.pillar_name === newItems[index].pillar && p.product_name === value)
      if (product?.default_unit) newItems[index].unit = product.default_unit
    }

    setItems(newItems)
  }

  const updateOpportunityTotal = async (currentItems: LineItem[]) => {
    const total = currentItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
    await supabase.from('opportunities').update({ total_value: total }).eq('id', opportunityId)
  }

  const handleSave = async () => {
    setSaving(true)
    const validItems = items.filter(i => i.product_name)
    const newItems = validItems.filter(i => !i.id).map(i => {
      const { id, total_price, ...rest } = i
      return { ...rest, opportunity_id: opportunityId }
    })
    const existingItems = validItems.filter(i => i.id)

    if (newItems.length > 0) {
      const { error } = await supabase.from('opportunity_line_items').insert(newItems)
      if (error) { console.error("Insert error:", error); alert("Gagal menyimpan: " + error.message) }
    }
    for (const item of existingItems) {
      const { id, total_price, ...updateData } = item
      await supabase.from('opportunity_line_items').update(updateData).eq('id', id)
    }
    await updateOpportunityTotal(validItems)
    await fetchItems()
    setSaving(false)
    router.refresh()
  }

  const grandTotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const hasTelcoRows = items.some(i => isTelcoPillar(i.pillar))

  if (loading) return <div className="text-center py-10 text-slate-400">Loading items...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleAddItem} className="mb-2">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[850px]">
          <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead className="w-[32%] font-semibold">Service Details</TableHead>
              <TableHead className="w-[16%] font-semibold text-center">Qty & Spec</TableHead>
              {hasTelcoRows && (
                <TableHead className="w-[10%] font-semibold text-center">Topology</TableHead>
              )}
              <TableHead className="w-[26%] font-semibold">Pricing (IDR)</TableHead>
              <TableHead className="w-[12%] font-semibold text-right">Total TCV</TableHead>
              <TableHead className="w-[4%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasTelcoRows ? 6 : 5} className="text-center h-24 text-slate-400">
                  No items yet. Click "+ Add Item" to start.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => {
                const isTelco = isTelcoPillar(item.pillar)

                let pricePerMbps = 0;
                if (isTelco && item.mrc > 0 && item.capacity) {
                  const bwNum = parseFloat(parseCapacityNum(item.capacity));
                  const bwUnit = parseCapacityUnit(item.capacity).toUpperCase();
                  if (bwNum > 0) {
                    let bwInMbps = bwNum;
                    if (bwUnit === 'GBPS') bwInMbps = bwNum * 1000;
                    else if (bwUnit === 'KBPS') bwInMbps = bwNum / 1000;
                    pricePerMbps = item.mrc / bwInMbps;
                  }
                }

                return (
                  <TableRow key={item.id || `new-${idx}`} className="group/row hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 align-top">

                    {/* ── Service Details ── */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {/* Pillar badge/selector */}
                          <Select value={item.pillar} onValueChange={(val) => handleChange(idx, 'pillar', val)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs font-semibold border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus:ring-0">
                              <SelectValue placeholder="Pillar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {pillarsList.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                              {item.pillar && !pillarsList.includes(item.pillar as any) && (
                                <SelectItem value={item.pillar} className="text-xs">{item.pillar} (AI)</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {/* Product name */}
                          <div className="relative flex-1">
                            <Input
                              list={`products-${idx}`}
                              value={item.product_name}
                              onChange={(e) => handleChange(idx, 'product_name', e.target.value)}
                              placeholder="Product name..."
                              disabled={!item.pillar}
                              className="h-8 text-sm font-bold border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0 px-2 w-full"
                            />
                            <datalist id={`products-${idx}`}>
                              {productCatalog.filter(p => p.pillar_name === item.pillar).map(p => (
                                <option key={p.product_name} value={p.product_name} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                        <Textarea
                          value={item.specification}
                          onChange={(e) => handleChange(idx, 'specification', e.target.value)}
                          placeholder="Specifications / notes..."
                          className="min-h-[52px] text-xs resize-y border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0 px-2 py-1.5"
                        />
                      </div>
                    </TableCell>

                    {/* ── Qty & Spec column ── */}
                    <TableCell className="py-4">
                      <div className="flex flex-col items-center gap-2">
                        {/* Qty + Unit row */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            value={item.quantity || ''}
                            onChange={(e) => handleChange(idx, 'quantity', parseInt(e.target.value.replace(/\D/g, '')) || 1)}
                            className="w-12 h-7 text-sm text-center px-1 border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                          />
                          <Input
                            value={item.unit || ''}
                            onChange={(e) => handleChange(idx, 'unit', e.target.value)}
                            placeholder={isTelco ? 'link' : 'unit'}
                            className="w-14 h-7 text-xs text-center px-1 border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none"
                          />
                        </div>

                        {/* Bandwidth — ONLY for Telco rows, clearly marked as spec */}
                        {isTelco && (
                          <div className="w-full">
                            <div className="flex items-center justify-center gap-0.5 mb-0.5">
                              <Wifi className="h-2.5 w-2.5 text-slate-400" />
                              <span className="text-[9px] text-slate-400">BW (spec)</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Input
                                type="text"
                                value={parseCapacityNum(item.capacity)}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d.]/g, '')
                                  const bwUnit = parseCapacityUnit(item.capacity)
                                  handleChange(idx, 'capacity', val ? `${val} ${bwUnit}` : '')
                                }}
                                placeholder="e.g. 1000"
                                className="flex-1 h-6 text-xs text-center px-1 border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none min-w-0"
                              />
                              <Select
                                value={parseCapacityUnit(item.capacity)}
                                onValueChange={(bwUnit) => {
                                  const num = parseCapacityNum(item.capacity)
                                  handleChange(idx, 'capacity', num ? `${num} ${bwUnit}` : '')
                                }}
                              >
                                <SelectTrigger className="h-6 w-[58px] text-[10px] border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none px-1 focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Kbps" className="text-xs">Kbps</SelectItem>
                                  <SelectItem value="Mbps" className="text-xs">Mbps</SelectItem>
                                  <SelectItem value="Gbps" className="text-xs">Gbps</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* ── Topology — only for Telco rows ── */}
                    {hasTelcoRows && (
                      <TableCell className="py-4 text-center">
                        {isTelco ? (
                          <Dialog>
                            <DialogTrigger className="grid grid-cols-2 gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 p-2 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 transition-colors mx-auto w-fit">
                              <div title="Site A" className={`p-1.5 rounded-full flex items-center justify-center ${item.site_a ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'}`}>
                                <MapPin className="h-3.5 w-3.5" />
                              </div>
                              <div title="Site B" className={`p-1.5 rounded-full flex items-center justify-center ${item.site_b ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'}`}>
                                <Building className="h-3.5 w-3.5" />
                              </div>
                              <div title="Lastmile" className={`p-1.5 rounded-full flex items-center justify-center ${item.lastmile ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'}`}>
                                <Cable className="h-3.5 w-3.5" />
                              </div>
                              <div title="Circuit ID" className={`p-1.5 rounded-full flex items-center justify-center ${item.cid ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'}`}>
                                <Hash className="h-3.5 w-3.5" />
                              </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px]">
                              <DialogHeader>
                                <DialogTitle>Configure Topology</DialogTitle>
                                <DialogDescription>Isi detail lokasi, media transmisi, dan Circuit ID untuk produk ini.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Site A (Origin / HQ)</label>
                                  <Textarea value={item.site_a || ''} onChange={(e) => handleChange(idx, 'site_a', e.target.value)} placeholder="e.g. Data Center Cyber 1" className="resize-none min-h-[60px] text-sm" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Site B (Destination / Branch)</label>
                                  <Textarea value={item.site_b || ''} onChange={(e) => handleChange(idx, 'site_b', e.target.value)} placeholder="e.g. Branch Office Sudirman" className="resize-none min-h-[60px] text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Lastmile Media</label>
                                    <Textarea value={item.lastmile || ''} onChange={(e) => handleChange(idx, 'lastmile', e.target.value)} placeholder="e.g. Fiber Optic, VSAT" className="resize-none min-h-[60px] text-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Circuit ID / SID</label>
                                    <Textarea value={item.cid || ''} onChange={(e) => handleChange(idx, 'cid', e.target.value)} placeholder="e.g. CID-12345" className="resize-none min-h-[60px] text-sm" />
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-700 text-xs">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* ── Pricing ── labels change based on row mode */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5 pt-1">
                        {isTelco ? (
                          <>
                            {/* Telco: MRC (monthly fee) */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium w-16">MRC:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1 text-[10px] text-slate-400">Rp</span>
                                <Input type="text"
                                  value={formatNumber(item.mrc)}
                                  onChange={(e) => handleChange(idx, 'mrc', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="h-7 pl-6 text-xs border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                                />
                              </div>
                            </div>
                            {/* Telco: OTC (activation) */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium w-16">OTC:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1 text-[10px] text-slate-400">Rp</span>
                                <Input type="text"
                                  value={formatNumber(item.otc)}
                                  onChange={(e) => handleChange(idx, 'otc', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="h-7 pl-6 text-xs border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                                />
                              </div>
                            </div>
                            {/* Telco: Contract Term */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium w-16">Kontrak:</span>
                              <div className="flex items-center gap-1 flex-1">
                                <Input type="text"
                                  value={item.contract_term || ''}
                                  onChange={(e) => handleChange(idx, 'contract_term', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="h-7 w-14 px-1 text-center text-xs border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                                />
                                <span className="text-[10px] text-slate-400">Bulan</span>
                              </div>
                            </div>
                            {/* Telco: formula reminder */}
                            <div className="mt-0.5 px-1">
                              <span className="text-[9px] text-slate-300 dark:text-zinc-600 italic">
                                = {item.quantity || 1} link × (OTC + MRC×{item.contract_term || 0})
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* ICT: Unit Price (= OTC) */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium w-16">OTC:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1 text-[10px] text-slate-400">Rp</span>
                                <Input type="text"
                                  value={formatNumber(item.otc)}
                                  onChange={(e) => handleChange(idx, 'otc', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="h-7 pl-6 text-xs border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                                />
                              </div>
                            </div>
                            {/* ICT: Monthly Maintenance/Support (= MRC, optional) */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium w-16">MRC:</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1 text-[10px] text-slate-400">Rp</span>
                                <Input type="text"
                                  value={formatNumber(item.mrc)}
                                  onChange={(e) => handleChange(idx, 'mrc', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="h-7 pl-6 text-xs border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                                />
                              </div>
                            </div>
                            {/* ICT: Warranty/Contract term */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium w-16">Kontrak:</span>
                              <div className="flex items-center gap-1 flex-1">
                                <Input type="text"
                                  value={item.contract_term || ''}
                                  onChange={(e) => handleChange(idx, 'contract_term', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="h-7 w-14 px-1 text-center text-xs border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0"
                                />
                                <span className="text-[10px] text-slate-400">Bulan</span>
                              </div>
                            </div>
                            {/* ICT: formula reminder */}
                            <div className="mt-0.5 px-1">
                              <span className="text-[9px] text-slate-300 dark:text-zinc-600 italic">
                                = {item.quantity || 1} unit × (OTC + MRC×{item.contract_term || 0})
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* ── Total TCV ── */}
                    <TableCell className="py-4 text-right align-top pt-5">
                      <div className="mt-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(item.total_price)}
                      </div>
                      {isTelco && item.mrc > 0 && (
                        <div className="text-[9px] text-slate-400 mt-1 flex flex-col gap-0.5">
                          <div>MRC {formatCurrency(item.mrc)}/bln</div>
                          {pricePerMbps > 0 && (
                            <div className="text-sky-600/80 dark:text-sky-400/80 font-medium">
                              {formatCurrency(pricePerMbps)} / Mbps
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* ── Delete ── */}
                    <TableCell className="py-4 pt-4 text-center align-top">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleRemoveItem(idx, item.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover/row:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer: Grand Total + Save ── */}
      <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200/60 dark:border-zinc-800">
        <div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-1">Total Contract Value (TCV)</p>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-500 tracking-tight">
            {formatCurrency(grandTotal)}
          </div>
          {items.length > 0 && (
            <div className="flex gap-3 mt-1">
              {items.some(i => isTelcoPillar(i.pillar)) && (
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 dark:border-blue-800">
                  Telco: {formatCurrency(items.filter(i => isTelcoPillar(i.pillar)).reduce((s, i) => s + (i.total_price || 0), 0))}
                </Badge>
              )}
              {items.some(i => !isTelcoPillar(i.pillar) && i.product_name) && (
                <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200 dark:border-purple-800">
                  ICT/Other: {formatCurrency(items.filter(i => !isTelcoPillar(i.pillar) && i.product_name).reduce((s, i) => s + (i.total_price || 0), 0))}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving || items.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-8">
          {saving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Line Items</>}
        </Button>
      </div>
    </div>
  )
}
