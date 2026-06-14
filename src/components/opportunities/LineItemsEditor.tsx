"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus, Save } from "lucide-react"

interface LineItem {
  id?: string
  pillar: string
  product_name: string
  specification: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

export function LineItemsEditor({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [productCatalog, setProductCatalog] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchItems()
  }, [opportunityId])

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
      pillar: "",
      product_name: "",
      specification: "",
      quantity: 1,
      unit: "",
      unit_price: 0,
      total_price: 0
    }])
  }

  const handleRemoveItem = async (index: number, id?: string) => {
    if (id) {
      await supabase.from('opportunity_line_items').delete().eq('id', id)
    }
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
    
    // Automatically update total value on opportunity
    updateOpportunityTotal(newItems)
  }

  const handleChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto calculate total
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
    }
    
    // Auto set unit based on product selection
    if (field === 'product_name') {
      const selectedPillar = newItems[index].pillar
      const product = productCatalog.find(p => p.pillar_name === selectedPillar && p.product_name === value)
      if (product && product.default_unit) {
        newItems[index].unit = product.default_unit
      }
    }
    
    setItems(newItems)
  }

  const updateOpportunityTotal = async (currentItems: LineItem[]) => {
    const total = currentItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
    await supabase
      .from('opportunities')
      .update({ total_value: total })
      .eq('id', opportunityId)
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Filter out items without product name
    const validItems = items.filter(i => i.product_name)
    
    // Separate new items (no id) from existing ones
    const newItems = validItems.filter(i => !i.id).map(i => {
      const { id, total_price, ...rest } = i
      return { ...rest, opportunity_id: opportunityId }
    })
    const existingItems = validItems.filter(i => i.id)

    // Insert new
    if (newItems.length > 0) {
      const { error } = await supabase.from('opportunity_line_items').insert(newItems)
      if (error) {
        console.error("Insert error:", error)
        alert("Gagal menyimpan line items: " + error.message)
      }
    }
    
    // Update existing
    for (const item of existingItems) {
      const { id, total_price, ...updateData } = item
      await supabase.from('opportunity_line_items').update(updateData).eq('id', id)
    }
    
    // Update opportunity total
    await updateOpportunityTotal(validItems)
    
    await fetchItems()
    setSaving(false)
    router.refresh() // <--- Forces the Next.js Server Component to re-fetch and update the Total Value UI
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
  }

  if (loading) return <div className="text-center py-10">Loading items...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleAddItem} className="mb-2">
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[50%] font-semibold">Item Details</TableHead>
              <TableHead className="w-[15%] font-semibold">Quantity</TableHead>
              <TableHead className="w-[20%] font-semibold">Unit Price (IDR)</TableHead>
              <TableHead className="w-[15%] font-semibold text-right">Total</TableHead>
              <TableHead className="w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">No items added yet.</TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={item.id || `new-${idx}`} className="group/row hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                  <TableCell className="align-top py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Select value={item.pillar} onValueChange={(val) => handleChange(idx, 'pillar', val)}>
                          <SelectTrigger className="w-[140px] h-8 text-xs font-semibold border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus:ring-0 focus:border-emerald-500">
                            <SelectValue placeholder="Select Pillar" />
                          </SelectTrigger>
                          <SelectContent>
                            {pillarsList.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                            {item.pillar && !pillarsList.includes(item.pillar as any) && (
                              <SelectItem value={item.pillar} className="text-xs">{item.pillar} (AI)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        
                        <div className="relative flex-1">
                          <Input 
                            list={`products-${idx}`}
                            value={item.product_name} 
                            onChange={(e) => handleChange(idx, 'product_name', e.target.value)} 
                            placeholder="Product name..."
                            disabled={!item.pillar}
                            className="h-8 text-sm font-bold border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0 focus-visible:border-emerald-500 px-2 w-full"
                          />
                          <datalist id={`products-${idx}`}>
                            {productCatalog.filter(p => p.pillar_name === item.pillar).map(p => (
                              <option key={p.product_name} value={p.product_name} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      
                      <div className="pl-1">
                        <Textarea 
                          value={item.specification} 
                          onChange={(e) => handleChange(idx, 'specification', e.target.value)} 
                          placeholder="Add specifications, site details, or notes..."
                          className="min-h-[60px] text-sm resize-y w-full border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0 focus-visible:border-emerald-500 px-2 py-1.5"
                        />
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="align-top py-4">
                    <div className="flex items-center gap-2 pt-1">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => handleChange(idx, 'quantity', parseInt(e.target.value) || 0)} 
                        className="w-16 h-8 text-sm text-center px-1 border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0 focus-visible:border-emerald-500"
                      />
                      {item.unit && <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">{item.unit}</span>}
                    </div>
                  </TableCell>
                  
                  <TableCell className="align-top py-4">
                    <div className="flex flex-col gap-1 pt-1">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-medium">Rp</span>
                        <Input 
                          type="number" 
                          min="0" 
                          value={item.unit_price} 
                          onChange={(e) => handleChange(idx, 'unit_price', parseInt(e.target.value) || 0)} 
                          className="w-full h-8 pl-7 text-sm border-transparent hover:border-input bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none focus-visible:ring-0 focus-visible:border-emerald-500"
                        />
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 pl-2">
                        {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-bold text-right align-top py-4 pt-5 text-sm text-slate-900 dark:text-zinc-100">
                    {formatCurrency(item.total_price)}
                  </TableCell>
                  
                  <TableCell className="align-top py-4 pt-4 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem(idx, item.id)} 
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 opacity-0 group-hover/row:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200/60 dark:border-zinc-800">
        <div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-1">Grand Total</p>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-500 tracking-tight">
            {formatCurrency(items.reduce((sum, item) => sum + (item.total_price || 0), 0))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || items.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-8">
          {saving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Line Items</>}
        </Button>
      </div>
    </div>
  )
}
