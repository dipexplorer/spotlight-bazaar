# 📍 SPOTLIGHT BAZAAR (India Again for Businesses)
*An Open-Elective Interactive Visual Directory & Commercial Discovery Engine*

> **Quick Summary:** Inspired by the viral phenomenon of `indiaagain.live` (where 19,675+ people claimed 3D houses across 2,966 Indian towns in 7 days via Instagram comments), **Spotlight Bazaar** adapts this viral collective participation mechanic into an **open-elective commercial directory**. Any Indian business—from wedding photographers and cafes to tech freelancers, boutique salons, coaching tutors, and local repair specialists—can claim their interactive digital storefront, showcase their work, and receive direct, non-brokered customer leads via WhatsApp.

---

## 🌟 The Core Vision

* **The Problem:** Incumbent Indian directories (Justdial, Sulekha, IndiaMART) sell the same customer inquiry to 10 competing businesses at once, sparking an aggressive price war and spamming users. Meanwhile, platforms like WedMeGood charge exorbitant upfront fees (₹50,000+) with zero conversion guarantees. On Instagram, small businesses struggle with discovery because their links get buried in Linktrees.
* **The Solution:** A high-speed, visually stunning interactive map/bazaar where **any business owner** can comment or register to claim their digital storefront. 
* **The "Open-Elective" Rule:** **Zero category restrictions.** Whether it is a luxury wedding cinematographer, an indie bakery, a mobile phone technician, a yoga trainer, or a freelance UI designer—any genuine business in India can claim their spot.
* **The Commercial Handshake:** Customers browse by city, pin code, or category on an interactive visual canvas, inspect verified portfolios/rates, and initiate conversations with **1-tap WhatsApp Click-to-Chat**. No middleman, no spam calls.

---

## 🚀 Key Differences: India Again vs. Spotlight Bazaar

| Feature / Dimension | India Again (`indiaagain.live`) | Spotlight Bazaar (This Project) |
| :--- | :--- | :--- |
| **Participant** | Casual Instagram viewers / gamers | **Real business owners & freelancers** |
| **Claimed Asset** | Virtual residential house with `@id` | **Commercial Digital Storefront** with logo, rate card & portfolio |
| **Participation Driver** | Ego, novelty, IPL/city tribalism | **Customer acquisition, brand prestige & free leads** |
| **Customer Retention** | 7–14 day novelty decay (entertainment) | **Continuous economic utility** (real client inquiries & views) |
| **Action Channel** | Look around in 3D & leave | **1-Tap Direct WhatsApp Chat** to close paying clients |
| **Monetization** | None (*"Free. No money."*) | **Freemium → Verified Badge, Featured Pins & Growth Tools** |

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons.
* **Live 3D Map Engine:** MapLibre GL JS (OpenStreetMap / CARTO Voyager & Dark Matter basemaps) paired with a custom WebGL Three.js 3D architectural layer (`LiveOsmMap` + `osm3dBuildings`).
* **3D Experience:** Seamless zoom-adaptive OSM road blending, custom 3D architectural studio plots (flagship launch: **Nerqiva Studio**, North Guwahati), day/night theme lighting, and a 60fps 3rd-person over-the-shoulder street-walking camera (`WASD` / Arrow keys / `Q` & `E` orbit / `Shift` sprint).
* **Database & Auth:** Supabase (PostgreSQL with PostGIS spatial queries) with graceful seed fallback.
* **Communication & Leads:** Direct WhatsApp Click-to-Chat (`https://wa.me/...`) and storefront dialogue drawer.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local (optional — falls back to flagship seed data)

# 3. Start development server
npm run dev
```

Open [http://localhost:3000/?city=guwahati](http://localhost:3000/?city=guwahati) to explore the live 3D map and click **Walk (WASD)** to enter 3rd-person street view.

---

## 📂 Project Architecture & Documentation Index

1. **[`PRD_PRODUCT_REQUIREMENTS.md`](./PRD_PRODUCT_REQUIREMENTS.md):** Product specifications, user personas, open-elective category mechanics, and feature backlog.
2. **[`TECH_ARCHITECTURE.md`](./TECH_ARCHITECTURE.md):** Frontend, backend, map rendering, edge caching, and WhatsApp dispatch architecture.
3. **[`DATA_MODEL.md`](./DATA_MODEL.md):** PostgreSQL schema, table definitions, PostGIS location queries, and index strategies.
4. **[`ROADMAP_30_DAYS.md`](./ROADMAP_30_DAYS.md):** 4-week sprint execution plan from MVP build to initial 100 businesses onboarded.
5. **[`AGENT_GUIDELINES.md`](./AGENT_GUIDELINES.md):** Coding rules, design language standards, and implementation guidelines.

