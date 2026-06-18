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
import { Building2, FileText, Target, BrainCircuit, Loader2, Plus, Trash2, Sparkles } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  const [isRegeneratingContext, setIsRegeneratingContext] = useState(false)
  
  const [currentStep, setCurrentStep] = useState(1)
  const [manualLineItems, setManualLineItems] = useState<any[]>([])
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
      if (data) {
        setMasterSettings(data)
        if (!initialData) {
          const dbStages = data.filter(s => s.category === 'STAGE').map(s => s.label)
          if (dbStages.length > 0) {
            setFormData(prev => ({ ...prev, stage: dbStages[0] }))
          }
        }
      }
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
    stage: initialData?.stage || (stagesList.length > 0 ? stagesList[0] : "Prospecting"),
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

  const handleAddManualItem = () => {
    setManualLineItems(prev => [...prev, {
      pillar: '', product_name: '', specification: '', quantity: 1, capacity: '', unit: 'unit', mrc: 0, otc: 0, contract_term: 1
    }])
  }

  const handleRemoveManualItem = (idx: number) => {
    setManualLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleManualItemChange = (idx: number, field: string, value: any) => {
    setManualLineItems(prev => {
      const newItems = [...prev]
      newItems[idx] = { ...newItems[idx], [field]: value }
      return newItems
    })
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
      console.error("SUPABASE ERROR:", error)
      alert("Error saving opportunity:\n" + JSON.stringify(error, null, 2))
    } else if (data && data[0]) {
      const newOptyId = data[0].id
      
      // Save line items (both extracted by AI and manually added in Step 2)
      if (!isEdit) {
        const combinedLineItems = [...extractedLineItems, ...manualLineItems]
        
        if (combinedLineItems.length > 0) {
          const lineItemsToInsert = combinedLineItems.map(item => ({
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
          if (liError) console.error("Error inserting line items:", liError)
        }
      }

      router.push(`/opportunities/${newOptyId}`)
      router.refresh()
    }
  }

  const handleChange = (field: keyof OpportunityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerateAI = async () => {
    if (!initialData?.id) return;
    setIsRegeneratingContext(true);
    try {
      const response = await fetch('/api/ai/regenerate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: initialData.id,
          currentData: {
            pain_points: formData.pain_points,
            scope_of_work: formData.scope_of_work,
            technical_requirements: formData.technical_requirements,
            constraints: formData.constraints,
            competitors: formData.competitors,
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        return;
      }

      const updatedFields = await response.json();
      
      // Update the 5 textareas
      if (updatedFields.pain_points) handleChange('pain_points', updatedFields.pain_points);
      if (updatedFields.scope_of_work) handleChange('scope_of_work', updatedFields.scope_of_work);
      if (updatedFields.technical_requirements) handleChange('technical_requirements', updatedFields.technical_requirements);
      if (updatedFields.constraints) handleChange('constraints', updatedFields.constraints);
      if (updatedFields.competitors) handleChange('competitors', updatedFields.competitors);

    } catch (error) {
      console.error('Error generating AI context:', error);
      alert('Failed to generate context from AI.');
    } finally {
      setIsRegeneratingContext(false);
    }
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

  const handleDataExtracted = (extractedData: Partial<OpportunityFormData> & { line_items?: any[], probability?: number }) => {
    // Convert AI probability (number) to string for the form field
    const extractedProbability = extractedData.probability && Number(extractedData.probability) > 0
      ? String(Math.min(95, Math.max(5, Math.round(Number(extractedData.probability)))))
      : undefined

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
      probability: extractedProbability || prev.probability,
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
      {currentStep === 1 && (
        <div className="space-y-8">
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
      <Card className="shadow-sm border-emerald-200 dark:border-emerald-900 overflow-hidden relative">
        <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-emerald-950 dark:text-emerald-100">AI Document Context</CardTitle>
            </div>
            <CardDescription className="text-emerald-800/70 dark:text-emerald-400/70">
              Crucial context used by Generative AI to craft highly-tailored High-Level Designs and Business Cases. The more detail, the better the AI output.
            </CardDescription>
          </div>
          {isEdit && (
            <Button 
              type="button"
              onClick={handleGenerateAI} 
              disabled={isRegeneratingContext}
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
            >
              {isRegeneratingContext ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate AI
            </Button>
          )}
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
      </div>
      )}

      {!isEdit && currentStep === 2 && (
        <div className="space-y-8">
          <Card className="shadow-sm border-emerald-200/60 dark:border-emerald-900/50">
            <CardHeader className="border-b border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/20">
              <CardTitle className="text-emerald-900 dark:text-emerald-100">Step 2: Line Items (Products & Pricing)</CardTitle>
              <CardDescription className="text-emerald-700 dark:text-emerald-400">Add products, capacity, MRC, and OTC.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" type="button" onClick={handleAddManualItem}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </Button>
                </div>

                <div className="rounded-md border bg-card overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-emerald-50/50 dark:bg-emerald-900/20">
                      <TableRow>
                        <TableHead className="w-[20%]">Pillar & Product</TableHead>
                        <TableHead className="w-[20%]">Spec & Capacity</TableHead>
                        <TableHead className="w-[15%]">Qty & Unit</TableHead>
                        <TableHead className="w-[20%]">Pricing</TableHead>
                        <TableHead className="w-[15%]">Contract & Site</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualLineItems.length === 0 && extractedLineItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-slate-500">
                            No items added. Click "+ Add Item" to manually add products.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {/* Render AI Extracted Items (Read-only Preview) */}
                          {extractedLineItems.map((item, idx) => (
                            <TableRow key={`ai-${idx}`} className="align-top bg-emerald-50/20 dark:bg-emerald-950/10 opacity-80">
                              <TableCell className="p-2">
                                <div className="h-8 mb-2 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.pillar || 'Unknown Pillar'} <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded">AI</span></div>
                                <div className="h-8 flex items-center px-3 text-xs font-medium border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-600">{item.product_name || '-'}</div>
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="min-h-[32px] text-xs p-2 mb-2 border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.specification || '-'}</div>
                                <div className="h-8 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.capacity || '-'}</div>
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="h-8 mb-2 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.quantity || 1}</div>
                                <div className="h-8 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.unit || '-'}</div>
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="h-8 mb-2 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">Rp {Number(item.mrc || 0).toLocaleString()}</div>
                                <div className="h-8 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">Rp {Number(item.otc || 0).toLocaleString()}</div>
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="h-8 mb-2 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.contract_term || 1} Mo</div>
                                <div className="h-8 flex items-center px-3 text-xs border rounded-md bg-slate-50 dark:bg-zinc-900 text-slate-500">{item.site_a || '-'}</div>
                              </TableCell>
                              <TableCell className="p-2 text-center text-xs text-emerald-600 flex items-center justify-center h-full pt-6">
                                Auto-saved
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Render Manual Items (Editable) */}
                          {manualLineItems.map((item, idx) => (
                            <TableRow key={`manual-${idx}`} className="align-top">
                              <TableCell className="p-2">
                                <Select value={item.pillar} onValueChange={(v) => handleManualItemChange(idx, 'pillar', v)}>
                                  <SelectTrigger className="h-8 mb-2 text-xs"><SelectValue placeholder="Pillar" /></SelectTrigger>
                                  <SelectContent>
                                    {getOptions('PILLAR', ['Connectivity', 'ICT & Cloud', 'Managed Service & Security', 'IoT & Digital']).map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Input className="h-8 text-xs font-medium" placeholder="Product name" value={item.product_name} onChange={e => handleManualItemChange(idx, 'product_name', e.target.value)} />
                              </TableCell>
                              <TableCell className="p-2">
                                <Textarea className="min-h-[32px] text-xs p-2 mb-2" placeholder="Specs..." value={item.specification} onChange={e => handleManualItemChange(idx, 'specification', e.target.value)} />
                                <Input className="h-8 text-xs" placeholder="Capacity (e.g. 100 Mbps)" value={item.capacity} onChange={e => handleManualItemChange(idx, 'capacity', e.target.value)} />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input type="number" className="h-8 mb-2 text-xs" placeholder="Qty" value={item.quantity || ''} onChange={e => handleManualItemChange(idx, 'quantity', e.target.value)} />
                                <Input className="h-8 text-xs" placeholder="Unit (e.g. circuit)" value={item.unit} onChange={e => handleManualItemChange(idx, 'unit', e.target.value)} />
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="relative mb-2">
                                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">Rp</span>
                                  <Input type="number" className="h-8 text-xs pl-7" placeholder="MRC" value={item.mrc || ''} onChange={e => handleManualItemChange(idx, 'mrc', e.target.value)} />
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-xs text-slate-400">Rp</span>
                                  <Input type="number" className="h-8 text-xs pl-7" placeholder="OTC" value={item.otc || ''} onChange={e => handleManualItemChange(idx, 'otc', e.target.value)} />
                                </div>
                              </TableCell>
                              <TableCell className="p-2">
                                <Input type="number" className="h-8 mb-2 text-xs" placeholder="Contract (Mo)" value={item.contract_term || ''} onChange={e => handleManualItemChange(idx, 'contract_term', e.target.value)} />
                                <Input className="h-8 text-xs" placeholder="Site A" value={item.site_a} onChange={e => handleManualItemChange(idx, 'site_a', e.target.value)} />
                              </TableCell>
                              <TableCell className="p-2 text-right">
                                <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveManualItem(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-4 pb-12">
        {currentStep === 1 ? (
          <>
            <Button variant="outline" type="button" onClick={() => router.back()} className="w-32">Cancel</Button>
            {isEdit ? (
              <Button type="submit" disabled={loading} className="w-48 bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            ) : (
              <Button type="button" onClick={(e) => { e.preventDefault(); setCurrentStep(2); }} className="w-48 bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
                Next: Add Line Items
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" type="button" onClick={(e) => { e.preventDefault(); setCurrentStep(1); }} className="w-32">Back to Step 1</Button>
            <Button type="submit" disabled={loading} className="w-48 bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Create Opportunity"}
            </Button>
          </>
        )}
      </div>
    </form>
    </div>
  )
}
