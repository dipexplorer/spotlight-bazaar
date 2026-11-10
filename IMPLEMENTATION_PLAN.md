# 🛠️ SPOTLIGHT BAZAAR — STEP-BY-STEP IMPLEMENTATION PLAN
**Project:** Spotlight Bazaar (Open-Elective Business Directory & Discovery Canvas)  
**Location:** `/mnt/data2/SIDE_HUSSLE/projects/spotlight-bazaar/`  
**Target Delivery:** 2-Week MVP Build (Ready for 50 Business Onboardings)  

---

## Overview of Implementation Phases

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: Project Scaffolding & Development Environment (Day 1)         │
│ Next.js 15, Tailwind CSS, TypeScript, Project Directory Architecture   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Database Setup, PostGIS & Core Edge APIs (Day 2–3)            │
│ Supabase PostgreSQL, PostGIS DDL, Seed Data, /api/boot & /api/register │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: 60-Second Mobile Onboarding Flow (Day 4–5)                    │
│ Multi-step fast form, image compression, optimistic local storage      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Digital Storefront Profile Page (`/b/[slug]`) (Day 6–7)       │
│ SSR SEO page, portfolio lightbox, WhatsApp Click-to-Chat sticky bar    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Interactive Visual Canvas & Map Layer (Day 8–10)              │
│ Mobile-touch map (Leaflet/Canvas), SVG pins, category filters, drawers │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Automated 9:16 Reel Generator & Lead Tracking (Day 11–12)     │
│ Playwright video script for Instagram Reels + WhatsApp lead analytics  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Production Deployment, Cloudflare & Soft Launch (Day 13–14)   │
│ Vercel deploy, Cloudflare 120s Edge cache, Onboarding first 20 vendors │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Technical Tasks by Phase

### 🚀 Phase 0: Workspace & Scaffolding (Day 1)
* **Goal:** Initialize a rock-solid, production-ready Next.js 15 repository with all foundational libraries.
* **Tasks:**
  1. Initialize Next.js 15 with App Router, TypeScript, and Tailwind CSS in `/projects/spotlight-bazaar`:
     ```bash
     npx create-next-app@latest . --typescript --tailwind --app --eslint --use-npm
     ```
  2. Install required core dependencies:
     ```bash
     npm install @supabase/supabase-js leaflet react-leaflet @types/leaflet framer-motion lucide-react clsx tailwind-merge canvas-confetti @types/canvas-confetti
     ```
  3. Establish folder structure:
     ```
     src/
     ├── app/
     │   ├── api/boot/route.ts
     │   ├── api/register/route.ts
     │   ├── api/analytics/lead-click/route.ts
     │   ├── b/[slug]/page.tsx
     │   ├── register/page.tsx
     │   ├── layout.tsx
     │   └── page.tsx (Interactive Map / Directory)
     ├── components/
     │   ├── map/ (InteractiveCanvas, StorefrontPin, CityCluster, MapControls)
     │   ├── storefront/ (StorefrontDrawer, PortfolioGallery, WhatsAppCTA, RateBadge)
     │   ├── onboarding/ (RegisterForm, ImageUploader, ShareCardModal)
     │   └── ui/ (HeaderTicker, CategoryFilterPill, SearchBar)
     ├── lib/
     │   ├── supabase/ (client.ts, server.ts, types.ts)
     │   ├── utils/ (compressImage.ts, formatPrice.ts, waLink.ts)
     │   └── constants/ (categories.ts, initialCities.ts)
     └── public/
         └── assets/places/ (sharded Indian city/town static json)
     ```
  4. Create `.env.example` with Supabase and Cloudflare configuration keys.

---

### 🗄️ Phase 1: Database, PostGIS & Edge APIs (Day 2–3)
* **Goal:** Set up persistent storage with spatial queries and high-concurrency edge endpoints.
* **Tasks:**
  1. Execute PostgreSQL DDL from `DATA_MODEL.md` in Supabase:
     - Enable `postgis` and `uuid-ossp` extensions.
     - Create `categories`, `cities`, `businesses`, `portfolio_items`, and `lead_events` tables.
     - Set up `idx_businesses_geom` spatial GIST index.
  2. Insert initial seed data (15 sample diverse businesses across Guwahati, Bangalore, Mumbai):
     - Wedding photographer, boutique cafe, MUA, freelance developer, home baker, AC technician.
  3. Create Supabase client singletons (`src/lib/supabase/client.ts` & `server.ts`).
  4. Implement `GET /api/boot`:
     - Fetches active storefronts, category counts, and city pins.
     - Adds HTTP headers: `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.
  5. Implement `POST /api/register`:
     - Validates input (sanitizes name, checks 10-digit Indian WhatsApp format).
     - Inserts business record and portfolio URLs.
  6. Implement `POST /api/analytics/lead-click`:
     - Non-blocking beacon logging WhatsApp click timestamps.

---

### 📝 Phase 2: 60-Second Mobile Onboarding (Day 4–5)
* **Goal:** A frictionless, mobile-first registration wizard that lets business owners claim a storefront in under 1 minute.
* **Tasks:**
  1. Build `/register` multi-step micro-wizard:
     - **Step 1: The Business Identity:** Name, Tagline, Category Tag, City, and Pincode.
     - **Step 2: The Commercial Offer:** Starting Price ("Starts ₹15,000"), WhatsApp Business Number, Instagram handle.
     - **Step 3: Visual Proof:** 3 to 6 image uploaders with browser-side WebP compression (reduces 10MB phone photos to ~150KB before upload).
     - **Step 4: Mandatory DPDP Consent Checkbox:** Single explicit consent to display public commercial info.
  2. Optimistic UI (`rememberBuilt`):
     - Store newly submitted storefront into `localStorage ('sb-my-storefront')`.
     - Owner is immediately redirected to `/b/[slug]?new=true` with celebratory confetti animation.
  3. Dynamic Instagram Story Share Card:
     - Component generating a sleek 9:16 graphic: *"We just claimed Storefront #142 on Spotlight Bazaar! Discover our portfolio & rates."* with 1-click image download.

---

### 🖼️ Phase 3: Digital Storefront Showcase (`/b/[slug]`) (Day 6–7)
* **Goal:** High-conversion mobile profile page that turns visiting clients into WhatsApp inquiries.
* **Tasks:**
  1. Build dynamic SSR page `src/app/b/[slug]/page.tsx`:
     - Server-side data fetch for sub-second load times.
     - Dynamic OpenGraph image generation (`og:image`) showing business photos and price badge.
  2. Storefront Layout Components:
     - **Hero Header:** Brand avatar, verified badge, city tag, and live visitor counter.
     - **Transparent Rate Card Banner:** Prominent display of starting rates to eliminate price guessing.
     - **Portfolio Gallery:** Mobile swipeable carousel or responsive 2-column masonry grid with full-screen photo lightbox.
     - **Sticky Bottom Action Bar:** Persistent green button: **"Chat on WhatsApp"** with pre-filled lead text.
  3. WhatsApp Click Beacon:
     - When client taps WhatsApp button, fire analytics ping before opening `wa.me` URL.

---

### 🗺️ Phase 4: Interactive Visual Canvas (Day 8–10)
* **Goal:** A high-speed, 60fps mobile visual map that lets visitors explore businesses without GPU lag.
* **Tasks:**
  1. Build `InteractiveCanvas.tsx` using Leaflet / Canvas:
     - Custom dark-mode map tiles (CartoDB Dark Matter or Mapbox Dark).
     - Custom SVG storefront marker pins color-coded by category (Rose for Weddings, Amber for Food, Cyan for Tech, Emerald for Home Services).
  2. Marker Clustering & City Zoom:
     - Pan-India view shows city hubs with counts (e.g. "Guwahati: 42", "Bangalore: 110").
     - Tapping a city smoothly flies the camera into neighborhood street level.
  3. Top Ticker & Filter System:
     - Top bar: *"Day 1 · Total Active Storefronts: 58 across 4 Cities"*.
     - Horizontal scrolling category filter pills (Creative, Food, Tech, Home, Beauty, All).
  4. Storefront Preview Drawer (Bottom Sheet):
     - Tapping any pin slides up an elegant mobile drawer with 3 sample photos, starting rate, and "Chat on WhatsApp" CTA.

---

### 🎬 Phase 5: Automated Reel Production & Lead Tracker (Day 11–12)
* **Goal:** Marketing automation to generate daily Instagram Reels highlighting new businesses.
* **Tasks:**
  1. Build Playwright script (`scripts/record_storefront_reel.py`):
     - Opens browser at 1080x1920 (9:16 mobile resolution).
     - Smoothly pans from map down to the newly registered business pin.
     - Opens storefront drawer, cycles through 3 portfolio images, displays "@handle on Spotlight Bazaar".
     - Exports ready-to-post 10-second 60fps MP4 video.
  2. Lead Reporting Dashboard:
     - Simple admin route `/admin/leads` to monitor total views, total WhatsApp clicks, and active businesses.

---

### 🚢 Phase 6: Deployment, Optimization & Soft Launch (Day 13–14)
* **Goal:** Launch publicly, verify edge caching, and onboard initial 20–30 real businesses.
* **Tasks:**
  1. Deploy to Vercel and link custom domain (`bazaar.live` or `spotlightbazaar.in`).
  2. Configure Cloudflare proxy & page rules for 120s caching on `/api/boot`.
  3. Manually onboard first 20 businesses in target city (Guwahati / Bangalore).
  4. Publish Day 1 Launch Reel on `@NQ_INSTA`:
     *"Building India's Open Business Street. Comment your business & city to claim your spot."*
  5. Monitor first 100 WhatsApp inquiries.

