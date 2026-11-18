-- ====================================================================
-- SPOTLIGHT BAZAAR · COMPLETE SUPABASE POSTGRESQL + POSTGIS SCHEMA
-- ====================================================================
-- Run this in your Supabase Dashboard -> SQL Editor (in 1 click).

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT 'Store',
    sort_order INT DEFAULT 0
);

INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
('creative-weddings', 'Creative & Weddings', 'creative-weddings', 'Camera', 1),
('beauty-wellness', 'Beauty & Wellness', 'beauty-wellness', 'Sparkles', 2),
('food-hospitality', 'Food & Cafes', 'food-hospitality', 'Coffee', 3),
('tech-freelance', 'Tech & Freelancers', 'tech-freelance', 'Laptop', 4),
('home-services', 'Home & Local Services', 'home-services', 'Wrench', 5),
('coaching-education', 'Coaching & Education', 'coaching-education', 'GraduationCap', 6),
('artisan-retail', 'Artisans & Boutiques', 'artisan-retail', 'ShoppingBag', 7),
('other-business', 'Other Businesses', 'other-business', 'Store', 8)
ON CONFLICT (id) DO NOTHING;

-- 3. CITIES TABLE
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO cities (name, state, lat, lon, slug, is_active) VALUES
('Guwahati', 'Assam', 26.1445, 91.7362, 'guwahati', true),
('Mumbai', 'Maharashtra', 19.0760, 72.8777, 'mumbai', true),
('Bengaluru', 'Karnataka', 12.9716, 77.5946, 'bangalore', true),
('Delhi', 'Delhi', 28.6139, 77.2090, 'delhi', true),
('Jaipur', 'Rajasthan', 26.9124, 75.7873, 'jaipur', true),
('Kochi', 'Kerala', 9.9312, 76.2673, 'kochi', true),
('Kolkata', 'West Bengal', 22.5726, 88.3639, 'kolkata', true),
('Hyderabad', 'Telangana', 17.3850, 78.4867, 'hyderabad', true),
('Pune', 'Maharashtra', 18.5204, 73.8567, 'pune', true),
('Chandigarh', 'Punjab', 30.7333, 76.7794, 'chandigarh', true)
ON CONFLICT (slug) DO NOTHING;

-- 4. BUSINESSES TABLE (Storefronts on the 3D High Street)
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE RESTRICT,
    city_id INT REFERENCES cities(id) ON DELETE SET NULL,
    city_name VARCHAR(100) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    pincode VARCHAR(6),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    facing_bearing DOUBLE PRECISION,
    road_anchor_lat DOUBLE PRECISION,
    road_anchor_lon DOUBLE PRECISION,
    connector_type VARCHAR(20) CHECK (connector_type IS NULL OR connector_type IN ('osm_road', 'colony_branch', 'frontage')),
    geom GEOMETRY(Point, 4326),
    whatsapp_phone VARCHAR(15) NOT NULL,
    instagram_handle VARCHAR(100),
    website_url TEXT,
    google_maps_url TEXT,
    starting_price VARCHAR(80),
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    total_views INT DEFAULT 0,
    total_leads INT DEFAULT 0,
    plot_level INT NOT NULL DEFAULT 1 CHECK (plot_level BETWEEN 1 AND 3),
    bazaar_coins INT NOT NULL DEFAULT 50,
    plot_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update PostGIS Point
CREATE OR REPLACE FUNCTION update_business_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_businesses_geom ON businesses;
CREATE TRIGGER trg_businesses_geom
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION update_business_geom();

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_businesses_geom ON businesses USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city_name);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- 5. PORTFOLIO ITEMS TABLE
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(255),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_business ON portfolio_items(business_id);

-- 6. LEAD EVENTS TABLE (WhatsApp clicks, Waves, Views)
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    event_type VARCHAR(50) DEFAULT 'whatsapp_click',
    client_ip_hash VARCHAR(64),
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_business ON lead_events(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_created ON lead_events(created_at);

-- 6B. LIVE STREET BROADCASTS (Deals, Coupons, Hiring, Need Service, Events)
CREATE TABLE IF NOT EXISTS business_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    post_type VARCHAR(30) NOT NULL CHECK (post_type IN ('deal', 'need_service', 'hiring', 'event')),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    coupon_code VARCHAR(32),
    cta_label VARCHAR(40),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_posts_business ON business_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_posts_active_expires ON business_posts(is_active, expires_at DESC);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active businesses & reference data
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view cities" ON cities FOR SELECT USING (true);
CREATE POLICY "Public can view active businesses" ON businesses FOR SELECT USING (status = 'active');
CREATE POLICY "Public can view portfolio items" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "Public can view active business posts" ON business_posts FOR SELECT USING (is_active = true AND expires_at > NOW());

-- Allow public inserts for registration and analytics
CREATE POLICY "Public can register a business" ON businesses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert portfolio items" ON portfolio_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert lead events" ON lead_events FOR INSERT WITH CHECK (true);

-- 8. INITIAL SEED STOREFRONTS
INSERT INTO businesses (
    slug, name, tagline, description, category_id, city_name, state_name,
    pincode, lat, lon, whatsapp_phone, instagram_handle, starting_price,
    logo_url, is_verified, is_featured, status, total_views, total_leads
) VALUES
(
    'studio-prism-guwahati',
    'Studio Prism',
    'Boutique Wedding & Narrative Cinematography in Assam',
    'Capturing timeless wedding moments, cultural heritage, and candid portraits across Northeast India.',
    'creative-weddings',
    'Guwahati',
    'Assam',
    '781005',
    26.1445,
    91.7362,
    '+919876543210',
    'studioprism_ghy',
    '₹45,000 / event',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    true,
    true,
    'active',
    142,
    18
),
(
    'northeast-brew-lab-guwahati',
    'Northeast Brew Lab',
    'Artisanal Single-Origin Roasted Coffee & Pastries',
    'Specialty coffee sourced directly from Meghalaya, Nagaland, and Assam shade-grown estates.',
    'food-hospitality',
    'Guwahati',
    'Assam',
    '781003',
    26.1550,
    91.7450,
    '+919876543211',
    'nebrewlab',
    '₹220 / cup',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80',
    true,
    false,
    'active',
    89,
    12
),
(
    'brahmaputra-weaves-guwahati',
    'Brahmaputra Weaves',
    'Handloom Muga & Eri Silk Sarees Crafted by Master Weavers',
    'Preserving Assam silk weaving heritage with contemporary silhouettes and pure organic golden threads.',
    'artisan-retail',
    'Guwahati',
    'Assam',
    '781001',
    26.1600,
    91.7200,
    '+919876543212',
    'brahmaputraweaves',
    '₹4,500 / saree',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80',
    true,
    false,
    'active',
    76,
    9
),
(
    'bandra-brew-lab-mumbai',
    'Bandra Brew Lab',
    'Craft Cold Brews & Sourdough Bakery on Pali Hill',
    'Artisanal micro-roastery serving fresh pour-overs, sea-salt croissants, and coastal Mumbai vibes.',
    'food-hospitality',
    'Mumbai',
    'Maharashtra',
    '400050',
    19.0596,
    72.8295,
    '+919876543213',
    'bandrabrewlab',
    '₹280 / cup',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&auto=format&fit=crop&q=80',
    true,
    true,
    'active',
    210,
    34
)
ON CONFLICT (slug) DO NOTHING;

