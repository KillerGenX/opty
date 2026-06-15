-- ==========================================
-- SCRIPT MIGRASI: INTEGRASI TELCO FIELDS
-- Jalankan script ini di menu "SQL Editor" pada dashboard Supabase Anda.
-- ==========================================

-- 1. Tambah Field Baru di Tabel Opportunities
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS sfa_id TEXT,
ADD COLUMN IF NOT EXISTS quote_id TEXT,
ADD COLUMN IF NOT EXISTS request_type TEXT;

-- 2. Modifikasi Tabel Opportunity Line Items
-- Menghapus computed column lama terlebih dahulu agar bisa mengubah strukturnya
ALTER TABLE public.opportunity_line_items 
DROP COLUMN IF EXISTS total_price;

-- Mengubah unit_price menjadi mrc, dan menambahkan field telco lainnya
ALTER TABLE public.opportunity_line_items 
RENAME COLUMN unit_price TO mrc;

ALTER TABLE public.opportunity_line_items 
ADD COLUMN IF NOT EXISTS otc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_term INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS site_a TEXT,
ADD COLUMN IF NOT EXISTS site_b TEXT,
ADD COLUMN IF NOT EXISTS lastmile TEXT,
ADD COLUMN IF NOT EXISTS cid TEXT;

-- Membuat kembali computed column total_price dengan rumus baru Telco
-- Total = (MRC x Contract Term) + OTC
-- Kita gunakan COALESCE agar jika contract_term NULL, dianggap 1 (sekali bayar)
ALTER TABLE public.opportunity_line_items 
ADD COLUMN total_price NUMERIC GENERATED ALWAYS AS ((mrc * COALESCE(contract_term, 1)) + otc) STORED;

-- Selesai!
