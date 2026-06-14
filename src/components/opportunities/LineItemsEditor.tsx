"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PILLARS, PRODUCT_CATALOG } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Pillar</TableHead>
              <TableHead className="w-[200px]">Product</TableHead>
              <TableHead>Specification</TableHead>
              <TableHead className="w-[80px]">Qty</TableHead>
              <TableHead className="w-[150px]">Unit Price (IDR)</TableHead>
              <TableHead className="w-[150px]">Total</TableHead>
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
                  <TableCell>
                    <Select value={item.pillar} onValueChange={(val) => handleChange(idx, 'pillar', val)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pillar" />
                      </SelectTrigger>
                      <SelectContent>
                        {PILLARS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={item.product_name} onValueChange={(val) => handleChange(idx, 'product_name', val)} disabled={!item.pillar}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {item.pillar && PRODUCT_CATALOG[item.pillar as keyof typeof PRODUCT_CATALOG]?.map(p => (
                          <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={item.specification} 
                      onChange={(e) => handleChange(idx, 'specification', e.target.value)} 
                      placeholder="Spec details..."
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={(e) => handleChange(idx, 'quantity', parseInt(e.target.value) || 0)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      min="0" 
                      value={item.unit_price} 
                      onChange={(e) => handleChange(idx, 'unit_price', parseInt(e.target.value) || 0)} 
                    />
                  </TableCell>
                  <TableCell className="font-medium text-right">
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
