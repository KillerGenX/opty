"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Trash2, Plus, Save, MapPin, Building, Cable, Hash, Wifi, Sparkles, FileText, Upload, ImageIcon, Loader2, CheckCircle2, Eye, PlusCircle } from "lucide-react"
import { ProductCatalog } from "@/types"


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
  const [productCatalog, setProductCatalog] = useState<ProductCatalog[]>([])
  const supabase = createClient()
  const router = useRouter()

  // ── Magic BoQ Import State ──────────────────────────────────────────────
  const [boqOpen, setBoqOpen] = useState(false)
  const [boqText, setBoqText] = useState('')
  const [boqFiles, setBoqFiles] = useState<File[]>([])
  const [boqLoading, setBoqLoading] = useState(false)
  const [boqError, setBoqError] = useState('')
  const [boqPreview, setBoqPreview] = useState<LineItem[]>([])  // extracted but not yet saved
  const [boqTab, setBoqTab] = useState<'input' | 'preview'>('input')
  const boqFileRef = useRef<HTMLInputElement>(null)
  // ───────────────────────────────────────────────────────────────────────

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

  // ── Magic BoQ Handlers ────────────────────────────────────────────────
  const handleBoqFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBoqFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const handleBoqPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const pastedFiles = Array.from(e.clipboardData.files).filter(
        f => f.type.startsWith('image/') || f.type === 'application/pdf'
      )
      if (pastedFiles.length > 0) {
        setBoqFiles(prev => [...prev, ...pastedFiles])
        setBoqError('')
      }
    }
  }

  const calcTotalPrice = (item: any): number => {
    const qty = Number(item.quantity) || 1
    const mrc = Number(item.mrc) || 0
    const otc = Number(item.otc) || 0
    const term = Number(item.contract_term) || 1
    return qty * (otc + mrc * term)
  }

  const handleBoqExtract = async () => {
    if (!boqText.trim() && boqFiles.length === 0) {
      setBoqError('Paste teks BoQ atau upload file terlebih dahulu.')
      return
    }
    setBoqLoading(true)
    setBoqError('')
    try {
      const formData = new FormData()
      if (boqText.trim()) formData.append('text', boqText)
      boqFiles.forEach(f => formData.append('files', f))

      const res = await fetch('/api/ai/extract-opportunity', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal ekstrak data')
      }
      const data = await res.json()
      const extracted: LineItem[] = (data.line_items || []).map((item: any) => ({
        pillar: item.pillar || '',
        product_name: item.product_name || '',
        specification: item.specification || '',
        quantity: Number(item.quantity) || 1,
        capacity: item.capacity || '',
        unit: item.unit || 'unit',
        mrc: Number(item.mrc) || 0,
        otc: Number(item.otc) || 0,
        contract_term: Number(item.contract_term) || 12,
        site_a: item.site_a || '',
        site_b: item.site_b || '',
        lastmile: item.lastmile || '',
        cid: item.cid || '',
        total_price: calcTotalPrice(item),
      }))

      if (extracted.length === 0) {
        setBoqError('AI tidak menemukan line items dari dokumen ini. Coba dengan teks/file yang lebih detail.')
        return
      }
      setBoqPreview(extracted)
      setBoqTab('preview')
    } catch (err: any) {
      setBoqError(err.message)
    } finally {
      setBoqLoading(false)
    }
  }

  const handleBoqAppend = () => {
    setItems(prev => [...prev, ...boqPreview])
    setBoqOpen(false)
    setBoqText('')
    setBoqFiles([])
    setBoqPreview([])
    setBoqTab('input')
    setBoqError('')
  }

  const handleBoqClose = () => {
    setBoqOpen(false)
    setBoqText('')
    setBoqFiles([])
    setBoqPreview([])
    setBoqTab('input')
    setBoqError('')
  }
  // ─────────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-center py-10 text-slate-400">Loading items...</div>

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Magic BoQ Import Dialog */}
        <Dialog open={boqOpen} onOpenChange={(v) => { if (!v) handleBoqClose(); else setBoqOpen(true) }}>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40 gap-1.5"
              />
            }
          >
            <Sparkles className="h-4 w-4" />
            Magic BoQ Import
          </DialogTrigger>

          <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col" onPaste={handleBoqPaste}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-violet-800 dark:text-violet-400">
                <Sparkles className="h-5 w-5" /> Magic BoQ Import
              </DialogTitle>
              <DialogDescription>
                Paste email / teks BoQ, atau upload PDF / gambar. AI akan mengekstrak semua line items secara otomatis.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 mt-2 pr-1">
              {boqTab === 'input' ? (
                <>
                  {/* Tab selector */}
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-zinc-900 shadow-sm"
                    >
                      <FileText className="h-4 w-4" /> Paste Teks
                    </button>
                    <button
                      onClick={() => boqFileRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                    >
                      <Upload className="h-4 w-4" /> Upload File
                    </button>
                  </div>

                  <Textarea
                    placeholder="Paste email BoQ, tabel pricing, atau deskripsi produk di sini..."
                    className="min-h-[200px] resize-none bg-white dark:bg-zinc-900"
                    value={boqText}
                    onChange={(e) => setBoqText(e.target.value)}
                  />

                  <input
                    type="file"
                    ref={boqFileRef}
                    onChange={handleBoqFileChange}
                    className="hidden"
                    multiple
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                  />

                  {boqFiles.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500">File terpilih:</p>
                      {boqFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800 px-3 py-2 rounded-md text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="truncate max-w-[380px]">{f.name}</span>
                          </div>
                          <button
                            onClick={() => setBoqFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-500 hover:text-red-700 ml-2 shrink-0"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {boqError && <p className="text-sm text-red-500">{boqError}</p>}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <Button variant="outline" onClick={handleBoqClose} size="sm">Batal</Button>
                    <Button
                      size="sm"
                      onClick={handleBoqExtract}
                      disabled={boqLoading || (!boqText.trim() && boqFiles.length === 0)}
                      className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
                    >
                      {boqLoading
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning BoQ...</>
                        : <><Sparkles className="h-4 w-4 mr-2" /> Ekstrak dengan AI</>}
                    </Button>
                  </div>
                </>
              ) : (
                /* PREVIEW tab */
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                      AI berhasil mengekstrak <span className="text-emerald-600">{boqPreview.length} item</span>. Periksa sebelum menambahkan.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-zinc-700 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Produk</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-600">Qty</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">MRC</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">OTC</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">TCV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {boqPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50">
                            <td className="px-3 py-2">
                              <div className="font-semibold text-slate-800 dark:text-zinc-100">{item.product_name}</div>
                              {item.pillar && <div className="text-slate-400 text-[10px]">{item.pillar}{item.capacity ? ` · ${item.capacity}` : ''}</div>}
                              {item.site_a && <div className="text-slate-400 text-[10px]">{item.site_a}{item.site_b ? ` → ${item.site_b}` : ''}</div>}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.mrc > 0 ? formatCurrency(item.mrc) : '—'}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.otc > 0 ? formatCurrency(item.otc) : '—'}</td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-zinc-800 border-t border-slate-200 dark:border-zinc-700">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Total TCV</td>
                          <td className="px-3 py-2 text-right font-black text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(boqPreview.reduce((s, i) => s + i.total_price, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setBoqTab('input'); setBoqPreview([]) }}
                    >
                      ← Kembali
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleBoqClose}>Batal</Button>
                      <Button
                        size="sm"
                        onClick={handleBoqAppend}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Tambahkan {boqPreview.length} Item
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual Add */}
        <Button variant="outline" size="sm" onClick={handleAddItem}>
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
