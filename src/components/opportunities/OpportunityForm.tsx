"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, FileText, Target, BrainCircuit, Loader2 } from "lucide-react"
import { MagicImportDialog } from "./MagicImportDialog"

const FALLBACK_TYPES = ["Connectivity", "Cloud Solutions", "Cyber Security", "Managed Services", "IoT / Smart City"];
const FALLBACK_SEGMENTS = ["Enterprise", "SME", "Government", "Wholesale"];
const FALLBACK_INDUSTRIES = ["Telco", "Banking & Finance", "Manufacturing", "Healthcare", "Mining & Energy", "Retail", "Other"];

export type OpportunityFormData = {
  opportunity_name: string;
  opportunity_type: string;
  stage: string;
  probability: string;
  expected_close_date: string;
  sfa_id: string;
  quote_id: string;
  request_type: string;
  
  customer_name: string;
  customer_industry: string;
  customer_segment: string;
  customer_pic: string;
  customer_contact: string;
  customer_address: string;
  
  scope_of_work: string;
  technical_requirements: string;
  pain_points: string;
  constraints: string;
  competitors: string;
  decision_criteria: string;
}

interface OpportunityFormProps {
  initialData?: OpportunityFormData & { id?: string };
  isEdit?: boolean;
}

export function OpportunityForm({ initialData, isEdit = false }: OpportunityFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [extractedLineItems, setExtractedLineItems] = useState<any[]>([])
  const [historicalCustomers, setHistoricalCustomers] = useState<any[]>([])
  const [masterSettings, setMasterSettings] = useState<any[]>([])
  
  useEffect(() => {
    // Fetch unique historical customers for autocomplete
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('customer_name, customer_segment, customer_industry, customer_pic, customer_contact, customer_address')
        .order('created_at', { ascending: false })
      
      if (data) {
        // Deduplicate by customer_name
        const unique = []
        const seen = new Set()
        for (const item of data) {
          if (item.customer_name && !seen.has(item.customer_name)) {
            seen.add(item.customer_name)
            unique.push(item)
          }
        }
        setHistoricalCustomers(unique)
      }
    }
    
    const fetchSettings = async () => {
      const { data } = await supabase.from('master_settings').select('*').eq('is_active', true).order('sort_order')
      if (data) setMasterSettings(data)
    }
    
    fetchCustomers()
    fetchSettings()
  }, [])

  const getOptions = (category: string, fallback: string[]) => {
    const opts = masterSettings.filter(s => s.category === category)
    if (opts.length === 0) return fallback
    return opts.map(s => s.label)
  }
  
  const typesList = getOptions('OPPORTUNITY_TYPE', FALLBACK_TYPES)
  const segmentsList = getOptions('SEGMENT', FALLBACK_SEGMENTS)
  const industriesList = getOptions('INDUSTRY', FALLBACK_INDUSTRIES)
  const stagesList = getOptions('STAGE', ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'])
  
  const [formData, setFormData] = useState<OpportunityFormData>({
    opportunity_name: initialData?.opportunity_name || "",
    opportunity_type: initialData?.opportunity_type || "Connectivity",
    stage: initialData?.stage || "Prospecting",
    probability: initialData?.probability?.toString() || "",
    expected_close_date: initialData?.expected_close_date || "",
    sfa_id: initialData?.sfa_id || "",
    quote_id: initialData?.quote_id || "",
    request_type: initialData?.request_type || "",
    
    customer_name: initialData?.customer_name || "",
    customer_industry: initialData?.customer_industry || "",
    customer_segment: initialData?.customer_segment || "",
    customer_pic: initialData?.customer_pic || "",
    customer_contact: initialData?.customer_contact || "",
    customer_address: initialData?.customer_address || "",
    
    scope_of_work: initialData?.scope_of_work || "",
    technical_requirements: initialData?.technical_requirements || "",
    pain_points: initialData?.pain_points || "",
    constraints: initialData?.constraints || "",
    competitors: initialData?.competitors || "",
    decision_criteria: initialData?.decision_criteria || "",
  })

  const calculateCompleteness = (data: OpportunityFormData) => {
    let score = 0;
    const weights: Record<keyof OpportunityFormData, number> = {
      opportunity_name: 5, customer_name: 5, stage: 5,
      opportunity_type: 5, probability: 5, expected_close_date: 5,
      sfa_id: 0, quote_id: 0, request_type: 0,
      customer_industry: 5, customer_segment: 5, customer_pic: 5, customer_contact: 5, customer_address: 5,
      scope_of_work: 15, technical_requirements: 10, pain_points: 10,
      constraints: 5, competitors: 2, decision_criteria: 2
    };
    
    (Object.keys(weights) as (keyof OpportunityFormData)[]).forEach(key => {
      if (data[key] && data[key].trim() !== "") {
        score += weights[key];
      }
    });
    
    return Math.min(score, 100);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const payload = {
      ...formData,
      expected_close_date: formData.expected_close_date ? formData.expected_close_date : null,
      probability: formData.probability ? parseInt(formData.probability) : null,
      completeness_score: calculateCompleteness(formData),
    }

    let error, data;

    if (isEdit && initialData?.id) {
      const res = await supabase
        .from('opportunities')
        .update(payload)
        .eq('id', initialData.id)
        .select()
      error = res.error;
      data = res.data;
    } else {
      const res = await supabase
        .from('opportunities')
        .insert([{
          ...payload,
          created_by: user.id,
          owner_id: user.id,
        }])
        .select()
      error = res.error;
      data = res.data;
    }

    setLoading(false)

    if (error) {
      console.error(error)
      alert("Error saving opportunity: " + error.message)
    } else if (data && data[0]) {
      const newOptyId = data[0].id
      
      // Auto-save extracted line items
      if (!isEdit && extractedLineItems.length > 0) {
        const lineItemsToInsert = extractedLineItems.map(item => ({
          opportunity_id: newOptyId,
          pillar: item.pillar || 'Other',
          product_name: item.product_name || 'Unknown Product',
          specification: item.specification || '',
          quantity: item.quantity ? Number(item.quantity) : 1,
          capacity: item.capacity || '',
          unit: item.unit || 'unit',
          mrc: item.mrc ? Number(item.mrc) : 0,
          otc: item.otc ? Number(item.otc) : 0,
          contract_term: item.contract_term ? Number(item.contract_term) : 1,
          site_a: item.site_a || '',
          site_b: item.site_b || '',
          lastmile: item.lastmile || '',
          cid: item.cid || ''
        }))
        
        const { error: liError } = await supabase.from('opportunity_line_items').insert(lineItemsToInsert)
        if (liError) console.error("Error inserting auto-extracted line items:", liError)
      }

      router.push(`/opportunities/${newOptyId}`)
      router.refresh()
    }
  }

  const handleChange = (field: keyof OpportunityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCustomerNameChange = (val: string) => {
    handleChange("customer_name", val)
    
    // Auto-fill logic
    const existing = historicalCustomers.find(c => c.customer_name === val)
    if (existing) {
      setFormData(prev => ({
        ...prev,
        customer_segment: prev.customer_segment || existing.customer_segment || "",
        customer_industry: prev.customer_industry || existing.customer_industry || "",
        customer_pic: prev.customer_pic || existing.customer_pic || "",
        customer_contact: prev.customer_contact || existing.customer_contact || "",
        customer_address: prev.customer_address || existing.customer_address || ""
      }))
    }
  }

  const handleDataExtracted = (extractedData: Partial<OpportunityFormData> & { line_items?: any[] }) => {
    setFormData(prev => ({
      ...prev,
      opportunity_name: extractedData.opportunity_name || prev.opportunity_name,
      opportunity_type: extractedData.opportunity_type || prev.opportunity_type,
      sfa_id: extractedData.sfa_id || prev.sfa_id,
      quote_id: extractedData.quote_id || prev.quote_id,
      request_type: extractedData.request_type || prev.request_type,
      customer_name: extractedData.customer_name || prev.customer_name,
      customer_segment: extractedData.customer_segment || prev.customer_segment,
      customer_industry: extractedData.customer_industry || prev.customer_industry,
      customer_pic: extractedData.customer_pic || prev.customer_pic,
      customer_contact: extractedData.customer_contact || prev.customer_contact,
      customer_address: extractedData.customer_address || prev.customer_address,
      expected_close_date: extractedData.expected_close_date || prev.expected_close_date,
      scope_of_work: extractedData.scope_of_work || prev.scope_of_work,
      technical_requirements: extractedData.technical_requirements || prev.technical_requirements,
      pain_points: extractedData.pain_points || prev.pain_points,
      constraints: extractedData.constraints || prev.constraints,
      competitors: extractedData.competitors || prev.competitors,
      decision_criteria: extractedData.decision_criteria || prev.decision_criteria,
    }))

    if (extractedData.line_items && extractedData.line_items.length > 0) {
      setExtractedLineItems(extractedData.line_items)
    }
  }

  return (
    <div className="space-y-8">
      {/* Magic Auto-Fill Button area */}
      {!isEdit && (
        <div className="flex justify-between items-center mb-4">
          <div>
            {extractedLineItems.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-md text-sm font-medium border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                {extractedLineItems.length} Line Items extracted and will be saved automatically.
              </div>
            )}
          </div>
          <MagicImportDialog onDataExtracted={handleDataExtracted} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
      {/* SECTION 1: Pipeline Info */}
      <Card className="shadow-sm border-slate-200/60 dark:border-zinc-800">
        <CardHeader className="border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            <CardTitle className="text-slate-900 dark:text-zinc-100">Basic & Pipeline Info</CardTitle>
          </div>
          <CardDescription>Essential details for tracking this deal in the pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="opportunity_name" className="text-slate-700 dark:text-zinc-300">Opportunity Name <span className="text-red-500">*</span></Label>
            <Input 
              id="opportunity_name" required 
              placeholder="e.g. Migration SD-WAN 50 Sites"
              value={formData.opportunity_name}
              onChange={(e) => handleChange("opportunity_name", e.target.value)}
              className="bg-white dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sfa_id" className="text-slate-700 dark:text-zinc-300">SFA ID</Label>
            <Input 
              id="sfa_id" 
              placeholder="e.g. 006Mg00000NsVWDIA3"
              value={formData.sfa_id}
              onChange={(e) => handleChange("sfa_id", e.target.value)}
              className="bg-white dark:bg-zinc-950 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote_id" className="text-slate-700 dark:text-zinc-300">Quote ID</Label>
            <Input 
              id="quote_id" 
              placeholder="e.g. 2-810786636407"
              value={formData.quote_id}
              onChange={(e) => handleChange("quote_id", e.target.value)}
              className="bg-white dark:bg-zinc-950 font-mono text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="opportunity_type" className="text-slate-700 dark:text-zinc-300">Solution Type</Label>
                    <Select value={formData.opportunity_type} onValueChange={(val) => handleChange("opportunity_type", val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {typesList.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        {formData.opportunity_type && !typesList.includes(formData.opportunity_type) && (
                          <SelectItem value={formData.opportunity_type}>{formData.opportunity_type} (AI)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request_type" className="text-slate-700 dark:text-zinc-300">Request Type</Label>
                    <Select value={formData.request_type} onValueChange={(val) => handleChange("request_type", val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Installation">New Installation</SelectItem>
                        <SelectItem value="Upgrade">Upgrade</SelectItem>
                        <SelectItem value="Downgrade">Downgrade</SelectItem>
                        <SelectItem value="Relocation">Relocation</SelectItem>
                        <SelectItem value="Termination">Termination</SelectItem>
                        {formData.request_type && !["New Installation", "Upgrade", "Downgrade", "Relocation", "Termination"].includes(formData.request_type) && (
                          <SelectItem value={formData.request_type}>{formData.request_type} (AI)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage" className="text-slate-700 dark:text-zinc-300">Stage</Label>
                    <Select value={formData.stage} onValueChange={(val) => handleChange("stage", val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stagesList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="probability" className="text-slate-700 dark:text-zinc-300">Probability (%)</Label>
              <Input 
                id="probability" type="number" min="0" max="100"
                placeholder="e.g. 50"
                value={formData.probability}
                onChange={(e) => handleChange("probability", e.target.value)}
                className="bg-white dark:bg-zinc-950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_close_date" className="text-slate-700 dark:text-zinc-300">Expected Close</Label>
              <Input 
                id="expected_close_date" type="date"
                value={formData.expected_close_date}
                onChange={(e) => handleChange("expected_close_date", e.target.value)}
                className="bg-white dark:bg-zinc-950"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Customer Details */}
      <Card className="shadow-sm border-slate-200/60 dark:border-zinc-800">
        <CardHeader className="border-b border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            <CardTitle className="text-slate-900 dark:text-zinc-100">Customer Details</CardTitle>
          </div>
          <CardDescription>Information about the client company and contacts.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer_name" className="text-slate-700 dark:text-zinc-300">Customer Name <span className="text-red-500">*</span></Label>
            <Input 
              id="customer_name" required 
              list="historical-customers"
              placeholder="e.g. PT Bank Central Asia"
              value={formData.customer_name}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              className="bg-white dark:bg-zinc-950"
            />
            <datalist id="historical-customers">
              {historicalCustomers.map(c => (
                <option key={c.customer_name} value={c.customer_name} />
              ))}
            </datalist>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_segment" className="text-slate-700 dark:text-zinc-300">Segment</Label>
                    <Select value={formData.customer_segment} onValueChange={(val) => handleChange("customer_segment", val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {segmentsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        {formData.customer_segment && !segmentsList.includes(formData.customer_segment) && (
                          <SelectItem value={formData.customer_segment}>{formData.customer_segment} (AI)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_industry" className="text-slate-700 dark:text-zinc-300">Industry</Label>
                    <Select value={formData.customer_industry} onValueChange={(val) => handleChange("customer_industry", val || "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industriesList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        {formData.customer_industry && !industriesList.includes(formData.customer_industry) && (
                          <SelectItem value={formData.customer_industry}>{formData.customer_industry} (AI)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_pic" className="text-slate-700 dark:text-zinc-300">PIC Name</Label>
            <Input 
              id="customer_pic" 
              placeholder="e.g. Budi Santoso (IT Manager)"
              value={formData.customer_pic}
              onChange={(e) => handleChange("customer_pic", e.target.value)}
              className="bg-white dark:bg-zinc-950"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_contact" className="text-slate-700 dark:text-zinc-300">Contact Details</Label>
            <Input 
              id="customer_contact" 
              placeholder="Email or Phone number"
              value={formData.customer_contact}
              onChange={(e) => handleChange("customer_contact", e.target.value)}
              className="bg-white dark:bg-zinc-950"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="customer_address" className="text-slate-700 dark:text-zinc-300">Address (HQ)</Label>
            <Textarea 
              id="customer_address" 
              placeholder="Full address"
              value={formData.customer_address}
              onChange={(e) => handleChange("customer_address", e.target.value)}
              className="bg-white dark:bg-zinc-950 min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: AI Context */}
      <Card className="shadow-sm border-emerald-200 dark:border-emerald-900 overflow-hidden">
        <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-emerald-950 dark:text-emerald-100">AI Document Context</CardTitle>
          </div>
          <CardDescription className="text-emerald-800/70 dark:text-emerald-400/70">
            Crucial context used by Generative AI to craft highly-tailored High-Level Designs and Business Cases. The more detail, the better the AI output.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid gap-6 md:grid-cols-2">
          
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="pain_points" className="text-slate-700 dark:text-zinc-300 font-semibold">Business Pain Points & Objectives</Label>
            <p className="text-xs text-muted-foreground mb-2">What problem is the customer trying to solve?</p>
            <Textarea 
              id="pain_points" 
              placeholder="e.g. Existing network is too slow, causing branch offices to lose connection to core banking system."
              value={formData.pain_points}
              onChange={(e) => handleChange("pain_points", e.target.value)}
              className="bg-white dark:bg-zinc-950 min-h-[80px]"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="scope_of_work" className="text-slate-700 dark:text-zinc-300 font-semibold">Scope of Work</Label>
            <p className="text-xs text-muted-foreground mb-2">High-level activities and deliverables for this project.</p>
            <Textarea 
              id="scope_of_work" 
              placeholder="e.g. Supply and install 50 units of SD-WAN edge routers across Sumatra region. Includes 3 years of managed services."
              value={formData.scope_of_work}
              onChange={(e) => handleChange("scope_of_work", e.target.value)}
              className="bg-white dark:bg-zinc-950 min-h-[100px]"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="technical_requirements" className="text-slate-700 dark:text-zinc-300 font-semibold">Technical Requirements</Label>
            <p className="text-xs text-muted-foreground mb-2">SLA, throughput, integration needs, protocols, etc.</p>
            <Textarea 
              id="technical_requirements" 
              placeholder="e.g. Minimum throughput 100Mbps per branch. Must integrate with existing FortiGate core. SLA 99.9%."
              value={formData.technical_requirements}
              onChange={(e) => handleChange("technical_requirements", e.target.value)}
              className="bg-white dark:bg-zinc-950 min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="constraints" className="text-slate-700 dark:text-zinc-300">Constraints & Risks</Label>
            <Textarea 
              id="constraints" 
              placeholder="e.g. Budget max 2M IDR per branch. Deployment must be done on weekends."
              value={formData.constraints}
              onChange={(e) => handleChange("constraints", e.target.value)}
              className="bg-white dark:bg-zinc-950 min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitors" className="text-slate-700 dark:text-zinc-300">Competitors</Label>
            <Textarea 
              id="competitors" 
              placeholder="e.g. Telkom (Incumbent), Lintasarta (Aggressive pricing)"
              value={formData.competitors}
              onChange={(e) => handleChange("competitors", e.target.value)}
              className="bg-white dark:bg-zinc-950 min-h-[80px]"
            />
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pb-12">
        <Button variant="outline" type="button" onClick={() => router.back()} className="w-32">Cancel</Button>
        <Button type="submit" disabled={loading} className="w-48 bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEdit ? "Save Changes" : "Create Opportunity")}
        </Button>
      </div>
    </form>
    </div>
  )
}
