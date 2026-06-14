export const PILLARS = [
  "Connectivity",
  "ICT & Cloud",
  "Managed Service & Security",
  "IoT & Digital"
] as const

export const PRODUCT_CATALOG = {
  "Connectivity": [
    { name: "MPLS (Multiprotocol Label Switching)", unit: "Aktivasi / CIR Mbps" },
    { name: "DIA / IDIA (Dedicated Internet Access)", unit: "Mbps" },
    { name: "IP Transit", unit: "Gbps" },
    { name: "OTT Peering", unit: "Gbps" },
    { name: "Fiber Leased Line", unit: "Link" },
    { name: "Mobile (4G/5G Enterprise)", unit: "SIM / Site" },
  ],
  "ICT & Cloud": [
    { name: "Indosat Cloud (IaaS)", unit: "VM / vCPU / GB" },
    { name: "Colocation (DC)", unit: "Rack / U" },
    { name: "Cloud Migration", unit: "Man-days" },
    { name: "Disaster Recovery", unit: "GB / Site" },
    { name: "GPU-as-a-Service", unit: "GPU Hours" },
  ],
  "Managed Service & Security": [
    { name: "Managed Network (SD-WAN, Router, AP)", unit: "Device / Site" },
    { name: "Managed Security (iSOC)", unit: "Endpoint / Bulan" },
    { name: "Managed WiFi", unit: "AP / Bulan" },
    { name: "NOC/Helpdesk", unit: "Tier / Bulan" },
  ],
  "IoT & Digital": [
    { name: "IoT Platform", unit: "Device / Bulan" },
    { name: "Fleet Management", unit: "Unit / Bulan" },
    { name: "Smart Surveillance", unit: "Kamera" },
    { name: "Digital Application", unit: "Project" },
  ]
} as const
