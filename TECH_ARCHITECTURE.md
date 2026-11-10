# 🏗️ TECHNICAL ARCHITECTURE SPECIFICATION
**Project Name:** Spotlight Bazaar  
**Architecture Type:** Mobile-First Modern Web Application (Edge-Cached SSR + Interactive Canvas)  
**Target Runtime:** Node.js 20+ / Vercel Edge Runtime / Supabase  

---

## 1. System Architecture Overview

```
                                  [ USER CLIENTS ]
                    (Mobile Safari / Chrome on 4G Android/iOS)
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          CLOUDFLARE EDGE CDN          │
                     │  - SSL / DDoS Protection              │
                     │  - Edge Caching (/api/boot max-age=120)│
                     │  - Static Asset Delivery (Brotli)     │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          VERCEL EDGE RUNTIME          │
                     │             (Next.js 15)              │
                     │  - Server Components (SSR / SEO)      │
                     │  - Client Components (Visual Map)     │
                     │  - Edge API Routes                    │
                     └───────┬───────────────────────┬───────┘
                             │                       │
                             ▼                       ▼
                ┌────────────────────────┐  ┌──────────────────────┐
                │   SUPABASE (POSTGRES)  │  │   SUPABASE STORAGE   │
                │  - Relational Schema   │  │   / CLOUDINARY       │
                │  - PostGIS Spatial     │  │  - Compressed Images │
                │  - Row-Level Security  │  │  - WebP / AVIF       │
                └────────────┬───────────┘  └──────────────────────┘
                             │
                             ▼
                ┌────────────────────────┐
                │   EXTERNAL SERVICES    │
                │  - WhatsApp API Links  │
                │  - Razorpay Subscriptions
                │  - Meta Graph Webhooks │
                └────────────────────────┘
```

---

## 2. Technology Stack Breakdown

| Layer | Selected Technology | Strategic Justification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Instant Server-Side Rendering (SSR) for local SEO pages (`/b/[city]/[category]`), combined with snappy React client interactivity on the visual map. |
| **Styling & Motion** | **Tailwind CSS + Framer Motion** | Micro-interactions, slide-up bottom sheets for mobile storefronts, and NERQIVA-grade sleek aesthetic without layout shifts. |
| **Visual Map Engine** | **Leaflet / Canvas with Custom Isometric Markers** | *India Again* used pure Three.js, which creates high battery/GPU drain on low-end Indian Android phones. Leaflet/Canvas gives 60fps fluid touch response with custom SVG storefront illustrations. Three.js is reserved for high-end desktop visualizers. |
| **Database** | **Supabase (PostgreSQL 16 + PostGIS)** | Native geospatial support (`ST_DWithin`, `ST_Point`) for instant "Find storefronts near my pincode" spatial queries. Free-tier generous capacity. |
| **Asset Storage** | **Supabase Storage or Cloudinary** | Automatic client-side compression to WebP/AVIF format with max width 1200px to ensure mobile portfolio galleries load under 800ms. |
| **Edge Cache & Shield** | **Cloudflare** | Employs the proven *India Again* architectural pattern: `/api/boot` is cached at the edge for 120 seconds (`cache-control: public, max-age=120`). If a Reel gets 50,000 views in 1 hour, the database receives only 30 requests. |
| **Leads Channel** | **Native WhatsApp Click-to-Chat API** | Direct link redirection (`https://wa.me/91[PHONE]?text=...`). Eliminates server-side SMS costs and delivers 100% lead delivery with zero spam brokerage. |

---

## 3. Core API Endpoints

### 1. `GET /api/boot`
* **Purpose:** Initial payload loader for the interactive map and discovery grid.
* **Cache Strategy:** `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.
* **Response Payload Structure:**
```json
{
  "day": 4,
  "total_storefronts": 348,
  "total_cities": 22,
  "featured": [ ...storefront_ids ],
  "categories": [
    { "id": "creative", "name": "Creative & Weddings", "count": 142 },
    { "id": "food", "name": "Food & Cafes", "count": 68 },
    { "id": "tech", "name": "Tech & Freelancers", "count": 84 }
  ],
  "storefronts": [
    [
      "studio-prism",
      "Studio Prism",
      "creative",
      "Guwahati",
      "Assam",
      26.1445,
      91.7362,
      "Starts ₹25k",
      "https://cdn.bazaar.live/thumbs/p1.webp",
      true,
      1793853204785
    ]
  ]
}
```

### 2. `POST /api/register`
* **Purpose:** Creates a new business storefront in 60 seconds.
* **Payload Validation:**
  - `business_name`: 2–60 chars, required.
  - `category_id`: Valid category string, required.
  - `city`: String, required.
  - `pincode`: Valid 6-digit Indian postal code.
  - `whatsapp`: Valid 10-digit Indian mobile number (`^[6-9]\d{9}$`).
  - `starting_price`: String (e.g. "Starts ₹15,000" or "On Request").
  - `portfolio_images`: Array of 3–6 image URLs.
* **Response:** Returns newly created storefront slug and shareable link.

### 3. `GET /b/[slug]` (Dynamic Server Route)
* **Purpose:** Individual business storefront profile page.
* **SEO Features:** Full OpenGraph tags (`og:title`, `og:image`, `og:description`) and Schema.org `LocalBusiness` JSON-LD structured data for Google indexing.

### 4. `POST /api/analytics/lead-click`
* **Purpose:** Increments lead conversion counter when a client taps "Chat on WhatsApp".
* **Payload:** `{ "storefront_id": "uuid", "source": "map_drawer" | "profile_page" }`.

---

## 4. Mobile Visual Canvas Architecture

To ensure 60fps performance on budget mobile phones:

1. **Lightweight Geometries:** Interactive pins are rendered as SVG sprite icons instead of heavy 3D GLTF polygon meshes.
2. **Viewport Clustering:** Markers cluster automatically at city/state levels (e.g. "Guwahati: 42 businesses") and expand into individual storefronts as the user zooms into street level.
3. **Optimistic Local Caching:**
   - When a business owner registers on their mobile device, their storefront details are saved immediately to `localStorage ('sb-my-storefront')`.
   - The map displays their storefront pin instantly with an animated "Your Storefront is Live" pulse, without waiting for the 120-second edge cache to refresh.

---

## 5. Automated Video / Reel Production Engine (NERQIVA Asset)

Leveraging NERQIVA's internal marketing engine (`Playwright + Chromium 9:16 Video Automation`):
* A background script launches a headless browser with vertical mobile viewport (1080x1920 at 60fps).
* Script navigates to the newly registered storefront URL: `https://bazaar.live/b/[slug]?mode=reel`.
* The camera smoothly zooms from the pan-India map down to the exact city street, opening the storefront showcase card and highlighting the business's portfolio photos with animated typography.
* Automatically renders and saves an MP4 video clip ready for Instagram Reel publication with zero manual editing.

