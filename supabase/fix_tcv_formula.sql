-- ==========================================
-- SCRIPT MIGRASI: ADD CAPACITY COLUMN
-- Jalankan di SQL Editor Supabase
-- ==========================================
-- 
-- 1. Tambah kolom capacity (teks, untuk menampung bandwidth seperti "3000 Mbps")
--    Terpisah dari quantity (angka, jumlah unit/circuit untuk kalkulasi harga)
--
-- 2. Fix formula computed column total_price agar menyertakan quantity
--    Formula baru: quantity * ((mrc * contract_term) + otc)

-- Step 1: Tambah kolom capacity
ALTER TABLE public.opportunity_line_items 
ADD COLUMN IF NOT EXISTS capacity TEXT;

-- Step 2: Hapus computed column lama
ALTER TABLE public.opportunity_line_items 
DROP COLUMN IF EXISTS total_price;

-- Step 3: Buat ulang computed column dengan formula yang benar (quantity ikut dikalikan)
ALTER TABLE public.opportunity_line_items 
ADD COLUMN total_price NUMERIC GENERATED ALWAYS AS (
  COALESCE(quantity, 1) * ((COALESCE(mrc, 0) * COALESCE(contract_term, 1)) + COALESCE(otc, 0))
) STORED;

-- Selesai!
-- Contoh validasi formula:
-- Telco 1 circuit @ MRC 8jt x 24 bln + OTC 1.5jt:
--   qty=1, mrc=8000000, otc=1500000, term=24 → 1 x (8000000*24 + 1500000) = 193,500,000 ✅
-- Hardware 5 server @ OTC 100jt:
--   qty=5, mrc=0, otc=100000000, term=1 → 5 x (0*1 + 100000000) = 500,000,000 ✅
