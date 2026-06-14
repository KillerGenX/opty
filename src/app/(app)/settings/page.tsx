"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MasterSetting, ProductCatalog } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Trash2, Save } from "lucide-react"

export default function SettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<MasterSetting[]>([])
  const [products, setProducts] = useState<ProductCatalog[]>([])
  const [loading, setLoading] = useState(true)

  // New item states
  const [newSetting, setNewSetting] = useState({ category: 'INDUSTRY', label: '', value: '' })
  const [newProduct, setNewProduct] = useState({ pillar_name: 'Connectivity', product_name: '', default_unit: 'Mbps' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [settingsRes, productsRes] = await Promise.all([
      supabase.from('master_settings').select('*').order('category').order('sort_order'),
      supabase.from('product_catalog').select('*').order('pillar_name').order('product_name')
    ])
    
    if (settingsRes.data) setSettings(settingsRes.data)
    if (productsRes.data) setProducts(productsRes.data)
    setLoading(false)
  }

  const handleAddSetting = async () => {
    if (!newSetting.label) return
    const payload = {
      category: newSetting.category,
      label: newSetting.label,
      value: newSetting.label, // keep value same as label for simplicity
      sort_order: settings.filter(s => s.category === newSetting.category).length + 1
    }
    await supabase.from('master_settings').insert([payload])
    setNewSetting({ ...newSetting, label: '', value: '' })
    fetchData()
  }

  const handleDeleteSetting = async (id: string) => {
    await supabase.from('master_settings').delete().eq('id', id)
    fetchData()
  }

  const handleAddProduct = async () => {
    if (!newProduct.product_name) return
    await supabase.from('product_catalog').insert([newProduct])
    setNewProduct({ ...newProduct, product_name: '' })
    fetchData()
  }

  const handleDeleteProduct = async (id: string) => {
    await supabase.from('product_catalog').delete().eq('id', id)
    fetchData()
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">Master Data Settings</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-2">
          Manage system dropdowns, units, and product catalog for BoQ generation.
        </p>
      </div>

      <Tabs defaultValue="dropdowns" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-zinc-900">
          <TabsTrigger value="dropdowns">Dropdown Settings</TabsTrigger>
          <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="dropdowns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['INDUSTRY', 'STAGE', 'UNIT'].map(category => (
              <Card key={category}>
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <CardDescription>Manage {category.toLowerCase()} options</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 mb-6">
                    {settings.filter(s => s.category === category).map(setting => (
                      <div key={setting.id} className="flex items-center justify-between group">
                        <span className="text-sm font-medium">{setting.label}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={() => handleDeleteSetting(setting.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <Input 
                      placeholder={`New ${category}...`} 
                      className="h-8 text-sm"
                      value={newSetting.category === category ? newSetting.label : ''}
                      onChange={(e) => setNewSetting({ category, label: e.target.value, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSetting.category === category) handleAddSetting()
                      }}
                    />
                    <Button size="sm" className="h-8" onClick={() => {
                      if (newSetting.category === category) handleAddSetting()
                      else setNewSetting({ category, label: '', value: '' }) // prepare
                    }}>
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products & Services (BoQ Catalog)</CardTitle>
              <CardDescription>Add new pillars and products to the catalog.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-slate-500 mb-2 px-2">
                <div className="col-span-4">Pillar Name</div>
                <div className="col-span-5">Product Name</div>
                <div className="col-span-2">Default Unit</div>
                <div className="col-span-1"></div>
              </div>
              
              <div className="space-y-2 mb-8">
                {products.map(product => (
                  <div key={product.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-md group">
                    <div className="col-span-4 text-sm font-medium">{product.pillar_name}</div>
                    <div className="col-span-5 text-sm">{product.product_name}</div>
                    <div className="col-span-2 text-sm text-slate-500">{product.default_unit}</div>
                    <div className="col-span-1 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-4 items-center border-t border-slate-200 dark:border-zinc-800 pt-6">
                <div className="col-span-4">
                  <Input 
                    placeholder="Pillar (e.g. Connectivity)" 
                    value={newProduct.pillar_name}
                    onChange={(e) => setNewProduct({...newProduct, pillar_name: e.target.value})}
                  />
                </div>
                <div className="col-span-5">
                  <Input 
                    placeholder="Product Name" 
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Input 
                    placeholder="Unit (e.g. Mbps)" 
                    value={newProduct.default_unit}
                    onChange={(e) => setNewProduct({...newProduct, default_unit: e.target.value})}
                  />
                </div>
                <div className="col-span-1">
                  <Button onClick={handleAddProduct} className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
