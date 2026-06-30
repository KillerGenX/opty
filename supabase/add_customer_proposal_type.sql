-- ==========================================
-- SCRIPT MIGRASI: UPDATE DOC TYPE CONSTRAINT
-- Jalankan di SQL Editor Supabase
-- ==========================================

-- Step 1: Hapus constraint lama
ALTER TABLE public.opportunity_documents 
DROP CONSTRAINT IF EXISTS opportunity_documents_doc_type_check;

-- Step 2: Buat constraint baru yang mengizinkan 'customer_proposal'
ALTER TABLE public.opportunity_documents 
ADD CONSTRAINT opportunity_documents_doc_type_check 
CHECK (doc_type IN ('design', 'timeline', 'boq', 'concept_art', 'opportunity_proposal', 'customer_proposal'));
