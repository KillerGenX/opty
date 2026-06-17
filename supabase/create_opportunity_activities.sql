-- Create opportunity_activities table for Activity Log / History feature
CREATE TABLE IF NOT EXISTS opportunity_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Memberikan izin akses bebas (karena kita bypass RLS)
ALTER TABLE opportunity_activities ENABLE ROW LEVEL SECURITY;

-- Menghapus policy lama jika ada (untuk mencegah duplikasi saat dijalankan ulang)
DROP POLICY IF EXISTS "Allow all on activities" ON opportunity_activities;

-- Membuat policy baru
CREATE POLICY "Allow all on activities" ON opportunity_activities FOR ALL USING (true);
