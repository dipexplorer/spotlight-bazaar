# 🗄️ DATA MODEL & DATABASE SPECIFICATION
**Database Engine:** PostgreSQL 16 with PostGIS extension  
**ORM / Client:** Supabase JavaScript Client / Prisma / Drizzle  

---

## 1. Relational Entity Relationship Diagram (ERD)

```
┌────────────────────┐          ┌───────────────────────┐
│     categories     │          │        cities         │
├────────────────────┤          ├───────────────────────┤
│ id (PK, text)      │          │ id (PK, serial)       │
│ name (text)        │          │ name (text)           │
│ slug (text, UNIQUE)│          │ state (text)          │
│ icon (text)        │          │ lat, lon (float)      │
│ sort_order (int)   │          │ slug (text, UNIQUE)   │
└─────────┬──────────┘          └───────────┬───────────┘
          │ 1                               │ 1
          │                                 │
          │ N                               │ N
┌─────────▼─────────────────────────────────▼───────────┐
│                      businesses                       │
├───────────────────────────────────────────────────────┤
│ id (PK, uuid)                                         │
│ slug (text, UNIQUE)                                   │
│ name (text)                                           │
│ tagline (text)                                        │
│ category_id (FK -> categories.id)                     │
│ city_id (FK -> cities.id)                             │
│ pincode (varchar(6))                                  │
│ lat, lon (double precision)                           │
│ geom (geometry(Point, 4326))                          │
│ whatsapp_phone (varchar(15))                          │
│ instagram_handle (text)                               │
│ website_url (text)                                    │
│ starting_price (text)                                 │
│ logo_url (text)                                       │
│ is_verified (boolean, default false)                  │
│ is_featured (boolean, default false)                  │
│ status (text: 'active', 'pending', 'suspended')       │
│ total_views (int, default 0)                          │
│ total_leads (int, default 0)                          │
│ created_at (timestamptz)                              │
│ updated_at (timestamptz)                              │
└─────────┬──────────────────────┬──────────────────────┘
          │ 1                    │ 1
          │                      │
          │ N                    │ N
┌─────────▼──────────────┐  ┌────▼──────────────────────┐
│    portfolio_items     │  │       lead_events         │
├────────────────────────┤  ├───────────────────────────┤
│ id (PK, uuid)          │  │ id (PK, uuid)             │
│ business_id (FK)       │  │ business_id (FK)          │
│ image_url (text)       │  │ event_type (whatsapp_lead)│
│ caption (text)         │  │ client_ip_hash (text)     │
│ sort_order (int)       │  │ created_at (timestamptz)  │
└────────────────────────┘  └───────────────────────────┘
```

---

## 2. PostgreSQL DDL Schema

```sql
-- Enable UUID and PostGIS extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. CATEGORIES TABLE (Open Elective)
CREATE TABLE categories (
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
('other-business', 'Other Businesses', 'other-business', 'Store', 8);

-- 2. CITIES TABLE
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_cities_slug ON cities(slug);

-- 3. BUSINESSES TABLE (The Digital Storefronts)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    geom GEOMETRY(Point, 4326),
    whatsapp_phone VARCHAR(15) NOT NULL,
    instagram_handle VARCHAR(100),
    website_url TEXT,
    starting_price VARCHAR(80),
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    total_views INT DEFAULT 0,
    total_leads INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically populate the PostGIS geometry column
CREATE OR REPLACE FUNCTION update_business_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_geom
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION update_business_geom();

-- Spatial & Filter Indexes
CREATE INDEX idx_businesses_geom ON businesses USING GIST (geom);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_city ON businesses(city_name);
CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_status ON businesses(status);

-- 4. PORTFOLIO ITEMS TABLE
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(255),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_business ON portfolio_items(business_id);

-- 5. LEAD EVENTS (Analytics & Proof)
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    event_type VARCHAR(50) DEFAULT 'whatsapp_click',
    client_ip_hash VARCHAR(64),
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_events_business ON lead_events(business_id);
CREATE INDEX idx_lead_events_created ON lead_events(created_at);
```

---

## 3. PostGIS Proximity Query Example

Finding the closest 20 storefronts within a 15 km radius of a customer's location:

```sql
SELECT 
    id, name, slug, starting_price, logo_url,
    ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:user_lon, :user_lat), 4326)) AS distance_meters
FROM businesses
WHERE status = 'active'
  AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(:user_lon, :user_lat), 4326), 15000)
ORDER BY distance_meters ASC
LIMIT 20;
```

