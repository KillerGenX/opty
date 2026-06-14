-- ==========================================
-- SCRIPT PEMBUATAN TABEL MASTER DATA (MDM)
-- Jalankan script ini di menu "SQL Editor" pada dashboard Supabase Anda.
-- ==========================================

-- 1. Buat Tabel Master Settings (Untuk Segmen, Industri, Stage, Unit)
CREATE TABLE public.master_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- Contoh: 'INDUSTRY', 'SEGMENT', 'STAGE', 'UNIT'
  label TEXT NOT NULL, -- Contoh: 'Telekomunikasi', 'Mbps'
  value TEXT NOT NULL, -- Contoh: 'Telekomunikasi', 'Mbps'
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengizinkan akses RLS (Bisa dibaca/tulis siapa saja untuk internal tools ini)
ALTER TABLE public.master_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on master_settings" ON public.master_settings FOR ALL TO authenticated USING (true);

-- Isi Data Awal (Seed Data) untuk Master Settings
INSERT INTO public.master_settings (category, label, value, sort_order) VALUES
('STAGE', 'Prospecting', 'Prospecting', 1),
('STAGE', 'Qualification', 'Qualification', 2),
('STAGE', 'Proposal', 'Proposal', 3),
('STAGE', 'Negotiation', 'Negotiation', 4),
('STAGE', 'Won', 'Won', 5),
('STAGE', 'Lost', 'Lost', 6),

('UNIT', 'Mbps', 'Mbps', 1),
('UNIT', 'Gbps', 'Gbps', 2),
('UNIT', 'Unit', 'Unit', 3),
('UNIT', 'Pcs', 'Pcs', 4),
('UNIT', 'Lot', 'Lot', 5),
('UNIT', 'Bulan', 'Bulan', 6),

('INDUSTRY', 'Telekomunikasi', 'Telekomunikasi', 1),
('INDUSTRY', 'Keuangan & Perbankan', 'Keuangan & Perbankan', 2),
('INDUSTRY', 'Pemerintahan', 'Pemerintahan', 3),
('INDUSTRY', 'Manufaktur', 'Manufaktur', 4),
('INDUSTRY', 'Ritel & E-Commerce', 'Ritel & E-Commerce', 5);


-- 2. Buat Tabel Product Catalog (Untuk BoQ / Line Items)
CREATE TABLE public.product_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar_name TEXT NOT NULL, -- Contoh: 'Connectivity'
  product_name TEXT NOT NULL, -- Contoh: 'MPLS L2'
  default_unit TEXT, -- Contoh: 'Mbps'
  default_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengizinkan akses RLS
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users on product_catalog" ON public.product_catalog FOR ALL TO authenticated USING (true);

-- Isi Data Awal (Seed Data) untuk Product Catalog
INSERT INTO public.product_catalog (pillar_name, product_name, default_unit, default_price) VALUES
('Connectivity', 'MPLS L2', 'Mbps', 0),
('Connectivity', 'Internet Dedicated', 'Mbps', 0),
('Connectivity', 'VSAT', 'Mbps', 0),
('ICT & Cloud', 'Cloud Server / VM', 'Unit', 0),
('ICT & Cloud', 'Colocation', 'Rack', 0),
('Managed Service & Security', 'Firewall as a Service', 'Unit', 0),
('Managed Service & Security', 'SD-WAN', 'Site', 0),
('IoT & Digital', 'CCTV System', 'Titik', 0);

-- Selesai! Anda siap menggunakan MDM!
