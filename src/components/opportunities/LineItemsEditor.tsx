"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PILLARS, PRODUCT_CATALOG } from "@/lib/products"
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
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchItems()
  }, [opportunityId])

  const fetchItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('opportunity_line_items')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true })
    
    if (data) setItems(data)
    setLoading(false)
  }

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
      const product = PRODUCT_CATALOG[selectedPillar as keyof typeof PRODUCT_CATALOG]?.find(p => p.name === value)
      if (product) {
        newItems[index].unit = product.unit
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
              <TableHead className="w-[140px]">Pillar</TableHead>
              <TableHead className="w-[200px]">Product</TableHead>
              <TableHead className="min-w-[250px]">Specification</TableHead>
              <TableHead className="w-[90px] whitespace-nowrap">Qty</TableHead>
              <TableHead className="w-[160px] whitespace-nowrap">Unit Price (IDR)</TableHead>
              <TableHead className="w-[140px] text-right">Total</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">No items added yet.</TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={item.id || `new-${idx}`}>
                  <TableCell className="align-top">
                    <Select value={item.pillar} onValueChange={(val) => handleChange(idx, 'pillar', val)}>
                      <SelectTrigger className="w-[130px] text-xs">
                        <SelectValue placeholder="Pillar" />
                      </SelectTrigger>
                      <SelectContent>
                        {PILLARS.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                        {item.pillar && !PILLARS.includes(item.pillar as any) && (
                          <SelectItem value={item.pillar} className="text-xs">{item.pillar} (AI)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="relative">
                      <Input 
                        list={`products-${idx}`}
                        value={item.product_name} 
                        onChange={(e) => handleChange(idx, 'product_name', e.target.value)} 
                        placeholder="Product name..."
                        disabled={!item.pillar}
                        className="w-[190px] text-xs font-medium"
                      />
                      <datalist id={`products-${idx}`}>
                        {item.pillar && PRODUCT_CATALOG[item.pillar as keyof typeof PRODUCT_CATALOG]?.map(p => (
                          <option key={p.name} value={p.name} />
                        ))}
                      </datalist>
                    </div>
                    {item.unit && <div className="text-[10px] text-slate-500 mt-1">Def. unit: {item.unit}</div>}
                  </TableCell>
                  <TableCell className="align-top">
                    <Textarea 
                      value={item.specification} 
                      onChange={(e) => handleChange(idx, 'specification', e.target.value)} 
                      placeholder="e.g. Site A:..., Site B:..., OTC:..."
                      className="min-h-[60px] max-h-[120px] text-xs resize-y w-full min-w-[200px]"
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1 items-start">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => handleChange(idx, 'quantity', parseInt(e.target.value) || 0)} 
                        className="w-16 text-xs text-center px-1"
                      />
                      {item.unit && <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded w-fit max-w-16 truncate">{item.unit}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <Input 
                        type="number" 
                        min="0" 
                        value={item.unit_price} 
                        onChange={(e) => handleChange(idx, 'unit_price', parseInt(e.target.value) || 0)} 
                        className="w-32 text-xs"
                      />
                      <div className="text-[10px] font-medium text-slate-500 truncate w-32">
                        {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-right align-top pt-3 text-sm">
                    {formatCurrency(item.total_price)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx, item.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="text-xl font-bold">
          Total: {formatCurrency(items.reduce((sum, item) => sum + (item.total_price || 0), 0))}
        </div>
        <Button onClick={handleSave} disabled={saving || items.length === 0}>
          {saving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Line Items</>}
        </Button>
      </div>
    </div>
  )
}
