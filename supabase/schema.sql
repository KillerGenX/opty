-- Profiles (extend Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('leader', 'team')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Opportunities
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id),
  
  -- Customer
  customer_name TEXT NOT NULL,
  customer_segment TEXT,
  customer_industry TEXT,
  customer_pic TEXT,
  customer_contact TEXT,
  customer_address TEXT,
  
  -- Opportunity
  opportunity_name TEXT NOT NULL,
  opportunity_type TEXT,
  total_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  stage TEXT CHECK (stage IN ('Prospecting','Qualification','Proposal','Negotiation','Won','Lost')),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  
  -- Solution Context (untuk AI)
  scope_of_work TEXT,
  technical_requirements TEXT,
  pain_points TEXT,
  constraints TEXT,
  competitors TEXT,
  decision_criteria TEXT,
  
  -- Metadata
  completeness_score INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Line Items
CREATE TABLE opportunity_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  pillar TEXT,
  product_name TEXT NOT NULL,
  specification TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  contract_term INTEGER,
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Generated Documents
CREATE TABLE opportunity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  doc_type TEXT CHECK (doc_type IN ('design', 'boq', 'bc', 'timeline')),
  
  content_html TEXT,
  prompt_used TEXT,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  version INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('ready', 'outdated')),
  
  UNIQUE (opportunity_id, doc_type)
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies for Profiles
CREATE POLICY "Users can view all profiles" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create policies for Opportunities
CREATE POLICY "Team can view own opportunities, Leader can view all"
  ON opportunities FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );

CREATE POLICY "Users can insert opportunities"
  ON opportunities FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team can update own opportunities, Leader can update all"
  ON opportunities FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader')
  );

CREATE POLICY "Only leader can delete opportunities"
  ON opportunities FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'leader'));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON opportunities
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to create profile after Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'team');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
