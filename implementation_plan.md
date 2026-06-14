# AI-Powered Opportunity Tracker
### Personal Tool — Enterprise Solutions Team, Central Sumatera

## Background

Sebuah aplikasi internal untuk tracking dan manajemen opportunity bisnis B2B (Enterprise Solutions). Ketika data opportunity sudah lengkap, AI (Gemini) otomatis men-generate 4 dokumen esensial:

1. **Design** — High-Level Design / Arsitektur Solusi
2. **BoQ** — Bill of Quantities (line items per produk/layanan)
3. **BC** — Business Case (justifikasi bisnis & proyeksi ROI)
4. **Timeline** — Jadwal Implementasi Proyek

---

## Tech Stack (Final)

| Layer | Tech |
|---|---|
| Frontend | **Next.js 15** (App Router, TypeScript) |
| Styling | **Tailwind CSS v4** + **shadcn/ui** |
| Animation | **Framer Motion** |
| Icons | **Lucide React** |
| Charts | **Recharts** |
| Backend / Auth | **Supabase** (Auth, PostgreSQL, Storage) |
| AI | **Google Gemini 2.0 Flash** (via AI Studio API) |
| Hosting | Vercel / Google Cloud Run |

---

## Indosat Business Product Catalog (untuk Line Items & AI Context)

Ini adalah referensi produk B2B yang akan menjadi pilihan di form line items dan context untuk AI.

### 🔗 Pilar 1: Connectivity
| Produk | Keterangan | Unit |
|---|---|---|
| **MPLS** (Multiprotocol Label Switching) | WAN private, multi-branch, secure | Aktivasi / CIR Mbps |
| **DIA / IDIA** (Dedicated Internet Access) | Internet dedicated 1:1 symmetrical | Mbps |
| **IP Transit** | Konektivitas internet skala besar untuk carrier/ISP | Gbps |
| **OTT Peering** | Direct peering untuk OTT content provider | Gbps |
| **Fiber Leased Line** | Last mile fiber optik dedicated | Link |
| **Mobile (4G/5G Enterprise)** | Private network / SIM enterprise | SIM / Site |

### ☁️ Pilar 2: ICT & Cloud
| Produk | Keterangan | Unit |
|---|---|---|
| **Indosat Cloud (IaaS)** | Virtual Machine, Storage, Network | VM / vCPU / GB |
| **Colocation (DC)** | Rack space di data center Tier III | Rack / U |
| **Cloud Migration** | Jasa migrasi ke cloud | Man-days |
| **Disaster Recovery** | DRaaS / backup & recovery | GB / Site |
| **GPU-as-a-Service** | Komputasi AI/ML | GPU Hours |

### 🔒 Pilar 3: Managed Services & Cybersecurity
| Produk | Keterangan | Unit |
|---|---|---|
| **Managed Network** (SD-WAN, Router, AP) | Manage perangkat jaringan end-to-end | Device / Site |
| **Managed Security (iSOC)** | Security monitoring, EDR, threat intel | Endpoint / bulan |
| **Managed WiFi** | Access Point terkelola | AP / bulan |
| **NOC/Helpdesk** | 24/7 monitoring & support | Tier / bulan |

### 📡 Pilar 4: IoT & Digital
| Produk | Keterangan | Unit |
|---|---|---|
| **IoT Platform** | Konektivitas & manajemen device IoT | Device / bulan |
| **Fleet Management** | Tracking & monitoring armada | Unit / bulan |
| **Smart Surveillance** | CCTV + AI analytics | Kamera |
| **Digital Application** | Custom app / platform | Project |

---

## RBAC Design

### Roles & Permissions

| Fitur | Team Member | Leader |
|---|---|---|
| Lihat opportunity sendiri | ✅ | ✅ |
| Lihat semua opportunity tim | ❌ | ✅ |
| Tambah/edit opportunity | ✅ | ✅ |
| Hapus opportunity | ❌ | ✅ |
| Generate AI dokumen | ✅ | ✅ |
| Dashboard analytics tim | ❌ | ✅ |
| Invite member | ❌ | ✅ |
| Manage roles tim | ❌ | ✅ |
| Export data | ❌ | ✅ |

### Invite System
- Leader kirim invite via email
- Supabase Auth email invitation
- User baru otomatis masuk dengan role **Team Member**
- Leader bisa ubah role dari Settings > Team Management

---

## Data Model (Supabase PostgreSQL)

```sql
-- Profiles (extend Supabase Auth)
profiles (
  id UUID PRIMARY KEY (= auth.users.id),
  full_name TEXT,
  email TEXT,
  role TEXT CHECK IN ('leader', 'team'),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Opportunities
opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID → profiles.id,
  owner_id UUID → profiles.id,         -- Sales owner
  
  -- Customer
  customer_name TEXT NOT NULL,
  customer_segment TEXT,               -- BUMN, Enterprise, SME, Carrier/ISP, Content Provider
  customer_industry TEXT,             -- Telco, Perbankan, Mining, Retail, Gov, dll.
  customer_pic TEXT,
  customer_contact TEXT,
  customer_address TEXT,
  
  -- Opportunity
  opportunity_name TEXT NOT NULL,
  opportunity_type TEXT,              -- New Business, Renewal, Upsell, Cross-sell
  total_value NUMERIC DEFAULT 0,      -- auto-sum dari line_items
  currency TEXT DEFAULT 'IDR',
  stage TEXT CHECK IN ('Prospecting','Qualification','Proposal','Negotiation','Won','Lost'),
  probability INTEGER CHECK (0-100),
  expected_close_date DATE,
  
  -- Solution Context (untuk AI)
  scope_of_work TEXT,                 -- Narasi kebutuhan customer
  technical_requirements TEXT,
  pain_points TEXT,                   -- Masalah yang ingin diselesaikan
  constraints TEXT,                   -- Constraint teknis/anggaran
  competitors TEXT,                   -- Kompetitor yang terlibat
  decision_criteria TEXT,             -- Kriteria keputusan customer
  
  -- Metadata
  completeness_score INTEGER DEFAULT 0,  -- 0-100%
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Line Items (produk/layanan dalam opportunity)
opportunity_line_items (
  id UUID DEFAULT gen_random_uuid(),
  opportunity_id UUID → opportunities.id CASCADE,
  
  pillar TEXT,      -- Connectivity / ICT & Cloud / Managed Service / IoT & Digital
  product_name TEXT NOT NULL,
  specification TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC GENERATED (quantity * unit_price),
  contract_term INTEGER,    -- bulan
  notes TEXT,
  sort_order INTEGER
)

-- AI Generated Documents
opportunity_documents (
  id UUID DEFAULT gen_random_uuid(),
  opportunity_id UUID → opportunities.id CASCADE,
  doc_type TEXT CHECK IN ('design', 'boq', 'bc', 'timeline'),
  
  content_html TEXT,          -- HTML output dari Gemini
  prompt_used TEXT,           -- Prompt yang digunakan (untuk audit/regenerate)
  generated_by UUID → profiles.id,
  generated_at TIMESTAMPTZ DEFAULT now(),
  version INTEGER DEFAULT 1,
  status TEXT CHECK IN ('ready', 'outdated'),
  
  UNIQUE (opportunity_id, doc_type)  -- 1 aktif per tipe per opportunity
)

-- Activity Log
activity_log (
  id UUID DEFAULT gen_random_uuid(),
  opportunity_id UUID,
  user_id UUID → profiles.id,
  action TEXT,                -- 'created', 'updated', 'stage_changed', 'doc_generated'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## Application Structure

```
opty-tracker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── accept-invite/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx               ← Sidebar + Topbar
│   │   ├── dashboard/page.tsx       ← KPI, Pipeline funnel, Activity
│   │   ├── opportunities/
│   │   │   ├── page.tsx             ← Daftar (table + kanban toggle)
│   │   │   ├── new/page.tsx         ← Form baru
│   │   │   └── [id]/
│   │   │       ├── page.tsx         ← Detail + Tab: Info | Line Items | AI Docs | History
│   │   │       └── edit/page.tsx
│   │   ├── documents/page.tsx       ← Document Library
│   │   └── settings/
│   │       ├── page.tsx             ← Profile & API Settings
│   │       └── team/page.tsx        ← Team management (Leader only)
│   └── api/
│       ├── ai/generate/route.ts     ← POST: trigger AI generation
│       └── invite/route.ts          ← POST: kirim invite email
├── components/
│   ├── ui/                          ← shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageWrapper.tsx
│   ├── opportunities/
│   │   ├── OpportunityTable.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── CompletenessBar.tsx
│   │   ├── LineItemsEditor.tsx      ← Tabel input line items dengan product picker
│   │   └── StageSelector.tsx
│   └── documents/
│       ├── DocCard.tsx
│       ├── GenerateButton.tsx       ← Dengan AI pulse animation
│       └── DocumentViewer.tsx       ← Full-screen preview modal
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── gemini.ts                    ← Gemini API wrapper
│   ├── prompts/
│   │   ├── design.ts
│   │   ├── boq.ts
│   │   ├── businesscase.ts
│   │   └── timeline.ts
│   ├── completeness.ts              ← Score calculator
│   └── products.ts                 ← Product catalog (const)
├── types/
│   └── index.ts                    ← TypeScript interfaces
└── styles/
    └── globals.css                  ← Tailwind v4 + CSS custom vars
```

---

## Key Pages & Features

### Dashboard
- **KPI Cards**: Total Pipeline (IDR), Active Opportunities, Win Rate, Docs Generated
- **Pipeline Funnel**: visual tahapan dari Prospecting → Won
- **Opportunity by Segment**: BUMN, Enterprise, Carrier, dll.
- **Top 5 Opportunities by Value**
- **Recent Activity Feed**
- *(Leader only)* Team performance table

### Opportunity List
- **Toggle View**: Table ↔ Kanban (drag-and-drop stage)
- **Filters**: Stage, Segment, Industry, Owner, Date Range
- **Sort**: Value, Close Date, Completeness Score
- **Completeness Badge**: 🔴 <50% | 🟡 50-79% | 🟢 ≥80% (AI Ready!)
- **Quick Add** button → Sheet/modal form

### Opportunity Detail (4 Tabs)
**Tab 1 — Overview**: Info customer, stage, probability, assignment  
**Tab 2 — Line Items**:
- Product Picker (dropdown dengan katalog 4 pilar)
- Tabel editable: Produk, Spesifikasi, Qty, Unit, Harga Satuan, Total
- Auto-calculate total value
- Template quick-insert berdasarkan tipe deal (e.g., "Connectivity Bundle", "Full ICT Package")

**Tab 3 — AI Documents**:
- Completeness Meter (animated progress bar)
- 4 Document Cards (Design / BoQ / BC / Timeline)
- Status: Not Generated | ⚡ Generating… | ✅ Ready | ⚠️ Outdated
- "Generate All" button (dengan confirmation dialog)
- Per-dokumen: Preview → Print/PDF, Download HTML, Regenerate

**Tab 4 — History**: Audit trail (stage changes, who generated what)

### Document Viewer
- Full-screen modal atau dedicated print page
- Rendered HTML dari Gemini output
- Print-to-PDF (browser native)
- Download `.html` file
- Version history (lihat versi lama)

---

## AI Prompt Structure

Context yang selalu disertakan ke setiap prompt:

```
[CONTEXT]
- Opportunity: {name}
- Customer: {name} ({segment} - {industry})
- Solution Scope: {scope_of_work}
- Pain Points: {pain_points}
- Technical Requirements: {technical_requirements}
- Constraints: {constraints}
- Competitors: {competitors}

[LINE ITEMS]
| Pilar | Produk | Spesifikasi | Qty | Unit | Est. Price |
| Connectivity | MPLS | 10 Mbps CIR, VPN-based | 5 | Aktivasi | Rp X |
...

[INSTRUCTIONS FOR {docType}]
...
```

Output: **Structured HTML** (bilingual — section headers in English, body in Indonesian), siap print/export.

---

## UI Design Language

| Element | Spec |
|---|---|
| **Color - Background** | `#030712` (base) / `#0f172a` (surface) |
| **Color - Card** | `#111827` + `rgba(255,255,255,0.05)` border |
| **Color - Primary** | `#6366f1` → `#8b5cf6` gradient |
| **Color - AI Accent** | `#06b6d4` (cyan) — khusus AI elements |
| **Color - Success** | `#10b981` (emerald) |
| **Color - Warning** | `#f59e0b` (amber) |
| **Color - Danger** | `#ef4444` (red) |
| **Typography** | Geist Sans (Next.js default) |
| **Cards** | Glassmorphism: `backdrop-blur-xl` + subtle gradient border |
| **Inspiration** | Linear.app + Vercel Dashboard + Raycast |

---

## MVP Scope

### ✅ Phase 1 (MVP — Build Sekarang)
- Auth: Login, Register, Accept Invite
- CRUD Opportunity (semua field)
- Line Items editor dengan product catalog
- Completeness score auto-calculation
- AI Document Generation (4 dokumen, Gemini)
- Document Preview + Print + Download
- Dashboard (KPI, pipeline)
- Basic RBAC (Leader / Team)
- Settings: API Key, Profile

### ⏳ Phase 2 (Post-MVP)
- Kanban drag-and-drop
- Email notifications (stage change, dll.)
- Document version history
- Export pipeline data ke Excel
- Advanced analytics (win/loss analysis)
- Mobile responsive optimization

---

## Verification Plan

1. **Auth**: Register → Login → Invite flow berjalan normal
2. **RBAC**: Leader melihat semua; Team hanya milik sendiri
3. **CRUD**: Tambah opportunity + line items → auto total calculation ✓
4. **Completeness**: Score naik seiring field diisi
5. **AI Gen**: Dengan valid Gemini API key → 4 dokumen ter-generate berisi konten relevan
6. **Document**: Preview tampil benar, Print (PDF) berfungsi, Download HTML berfungsi
7. **Dashboard**: KPI cards menampilkan data aggregat yang akurat
