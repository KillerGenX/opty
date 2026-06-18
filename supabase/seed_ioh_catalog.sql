-- Clear existing product catalog
TRUNCATE TABLE product_catalog RESTART IDENTITY CASCADE;

-- Insert IOH Business / Comprehensive Enterprise ICT Products
INSERT INTO product_catalog (pillar_name, product_name, default_unit, default_price) VALUES
-- 1. Connectivity (Jaringan Utama)
('Connectivity', 'Internet Dedicated', 'Mbps', 0),
('Connectivity', 'IP Transit', 'Mbps', 0),
('Connectivity', 'OTT Peering', 'Mbps', 0),
('Connectivity', 'Metro Ethernet / MPLS L2', 'Mbps', 0),
('Connectivity', 'MPLS L3', 'Mbps', 0),
('Connectivity', 'IPLC (International Private Leased Circuit)', 'Mbps', 0),
('Connectivity', 'DWDM (Dense Wavelength Division Multiplexing)', 'Mbps', 0),
('Connectivity', 'Leased Line', 'Mbps', 0),
('Connectivity', 'Last Mile (Local Loop)', 'Link', 0),
('Connectivity', 'SD-WAN', 'Site', 0),
('Connectivity', 'VSAT', 'Mbps', 0),

-- 2. Mobile & Wireless Solutions
('Mobile & Wireless Solutions', 'Postpaid Corporate', 'Lines', 0),
('Mobile & Wireless Solutions', 'Prime Biz', 'Lines', 0),
('Mobile & Wireless Solutions', 'Pro Freedom Apps', 'Lines', 0),
('Mobile & Wireless Solutions', 'Mobile Device Management (MDM)', 'Licenses', 0),

-- 3. Enterprise Private Network
('Enterprise Private Network', 'Private LTE', 'Node', 0),
('Enterprise Private Network', 'Private 5G', 'Node', 0),
('Enterprise Private Network', 'Campus Network', 'Node', 0),

-- 4. Cloud & Data Center
('Cloud & Data Center', 'Colocation', 'Rack', 0),
('Cloud & Data Center', 'Cloud Virtual Machine (IaaS)', 'VM', 0),
('Cloud & Data Center', 'Bare Metal Server', 'Node', 0),
('Cloud & Data Center', 'Disaster Recovery as a Service (DRaaS)', 'Node', 0),
('Cloud & Data Center', 'Cloud Storage / Object Storage', 'TB', 0),

-- 5. Internet of Things (IoT)
('Internet of Things (IoT)', 'IoT Managed Connectivity / M2M', 'SIM', 0),
('Internet of Things (IoT)', 'Fleet Management System', 'Vehicle', 0),
('Internet of Things (IoT)', 'IoT Devices (CCTV, Sensor, Gateway, RFID)', 'Unit', 0),
('Internet of Things (IoT)', 'Custom IoT Solution (Smart City, Smart Farming, dll)', 'Node', 0),

-- 6. ICT Hardware & Devices (Pengadaan Perangkat)
('ICT Hardware & Devices', 'Laptop & PC Desktop', 'Unit', 0),
('ICT Hardware & Devices', 'Printer & Scanner', 'Unit', 0),
('ICT Hardware & Devices', 'Server & Storage Hardware', 'Node', 0),
('ICT Hardware & Devices', 'Network Devices (Switch, Router, Access Point)', 'Device', 0),

-- 7. Software & Licensing (Perangkat Lunak)
('Software & Licensing', 'Operating System & Server License', 'License', 0),
('Software & Licensing', 'Virtualization License (VMware, Nutanix)', 'Node/Year', 0),
('Software & Licensing', 'Hardware/Network Subscription (SmartNet, Meraki)', 'Device/Year', 0),
('Software & Licensing', 'Database & Application License', 'Core', 0),

-- 8. Security Services
('Security Services', 'Anti-DDoS', 'Gbps', 0),
('Security Services', 'Managed Firewall / Next-Gen Firewall', 'Device', 0),
('Security Services', 'Endpoint Protection / EDR', 'User', 0),
('Security Services', 'iSOC (Security Operations Center)', 'Node', 0),
('Security Services', 'Web Application Firewall (WAF)', 'Domain', 0),

-- 9. Digital & Applications
('Digital & Applications', 'CPaaS (SMS Masking, WhatsApp Business API)', 'Paket', 0),
('Digital & Applications', 'Workspace & Collaboration (Google Workspace / Microsoft 365)', 'User', 0),
('Digital & Applications', 'Big Data & Analytics Insights', 'API/Month', 0),
('Digital & Applications', 'Digital Signature / e-KYC', 'Transaction', 0),

-- 10. Managed Services & Professional Support
('Managed Services & Support', 'Managed Router / Switch / Wi-Fi', 'Device', 0),
('Managed Services & Support', 'IT Helpdesk / IT Outsourcing (ITO)', 'Man-Month', 0),
('Managed Services & Support', 'Professional Services / Instalasi', 'Mandays', 0),
('Managed Services & Support', 'Maintenance & SLA Support (8x5 / 24x7)', 'Paket/Year', 0);
