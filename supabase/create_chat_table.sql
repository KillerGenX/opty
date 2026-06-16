-- ==========================================
-- SCRIPT MIGRASI: MEMBUAT TABEL CHAT AI
-- Jalankan di SQL Editor Supabase
-- ==========================================

-- Membuat tabel opportunity_chats
CREATE TABLE IF NOT EXISTS public.opportunity_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    user_email TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.opportunity_chats ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar user bisa membaca semua chat (untuk sementara karena ini internal tools)
CREATE POLICY "Enable read access for all users" ON public.opportunity_chats
    FOR SELECT USING (true);

-- Membuat policy agar user bisa memasukkan chat baru
CREATE POLICY "Enable insert access for all users" ON public.opportunity_chats
    FOR INSERT WITH CHECK (true);

-- Membuat policy agar user bisa menghapus chat
CREATE POLICY "Enable delete access for all users" ON public.opportunity_chats
    FOR DELETE USING (true);
