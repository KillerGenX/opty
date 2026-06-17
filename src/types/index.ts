export type Role = 'leader' | 'team'
export type Stage = string
export type DocType = 'design' | 'boq' | 'bc' | 'timeline'
export type DocStatus = 'ready' | 'outdated'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface Opportunity {
  id: string
  created_by: string
  owner_id: string
  
  sfa_id: string | null
  quote_id: string | null
  request_type: string | null
  
  customer_name: string
  customer_segment: string | null
  customer_industry: string | null
  customer_pic: string | null
  customer_contact: string | null
  customer_address: string | null
  
  opportunity_name: string
  opportunity_type: string | null
  total_value: number
  currency: string
  stage: Stage
  probability: number | null
  expected_close_date: string | null
  
  scope_of_work: string | null
  technical_requirements: string | null
  pain_points: string | null
  constraints: string | null
  competitors: string | null
  decision_criteria: string | null
  
  completeness_score: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LineItem {
  id: string
  opportunity_id: string
  pillar: string | null
  product_name: string
  specification: string | null
  quantity: number
  unit: string | null
  mrc: number
  otc: number
  total_price: number
  contract_term: number | null
  site_a: string | null
  site_b: string | null
  lastmile: string | null
  cid: string | null
  notes: string | null
  sort_order: number | null
  created_at: string
}

export interface DocumentRecord {
  id: string
  opportunity_id: string
  doc_type: DocType
  content_html: string | null
  prompt_used: string | null
  generated_by: string | null
  generated_at: string
  version: number
  status: DocStatus
}

export interface MasterSetting {
  id: string
  category: string
  label: string
  value: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ProductCatalog {
  id: string
  pillar_name: string
  product_name: string
  default_unit: string | null
  default_price: number
  is_active: boolean
  created_at: string
}
