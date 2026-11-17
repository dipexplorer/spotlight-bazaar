# 📍 Spotlight Bazaar
*India's Open 3D Business Street & Interactive Commercial Discovery Platform*

> **Spotlight Bazaar** is a real-time 3D interactive business map built directly over live OpenStreetMap geography. Any Indian business—from digital engineering studios and cafes to wedding photographers, boutique salons, tutors, and local specialists—can claim a 3D commercial plot at their exact GPS location, showcase their services, and receive direct customer leads via WhatsApp with zero middlemen.

---

## 🌟 Core Vision

* **The Problem:** Traditional business directories resell the same customer inquiry to multiple competing businesses at once, creating spam calls and a race-to-the-bottom price war, while charging steep upfront listing fees with no conversion guarantees.
* **The Solution:** A high-speed, interactive 3D business street built on real-world map coordinates where genuine businesses own a dedicated 3D storefront plot and connect directly with customers.
* **Open-Elective Discovery:** Zero category restrictions—whether a software studio, indie bakery, interior designer, clinic, or local specialist, any real business across India can claim its plot.
* **Direct Commercial Handshake:** Visitors explore cities in interactive 3D, walk streets in 3rd-person POV, inspect business profiles and rate cards, and start a **1-tap direct WhatsApp chat**—no broker, no lead reselling.

---

## ✨ Key Features

* **Real OpenStreetMap + Custom 3D WebGL Engine:** MapLibre GL JS vector basemaps combined with a custom Three.js architectural layer (`LiveOsmMap` + `osm3dBuildings`).
* **Zoom-Adaptive Seamless Road Blending:** Automated access roads connect 3D business plots natively into the underlying OpenStreetMap street geometry across zoom levels and Day/Night themes.
* **Interactive 3rd-Person Street Walk Mode:** Smooth 60fps over-the-shoulder game camera (`W/A/S/D` or Arrow keys to walk & turn, `Q/E` or drag to orbit, `Shift` to sprint).
* **Custom 3D Architectural Storefronts:** Flagship launch plot featuring **Nerqiva Studio** (North Guwahati, Assam — `nerqivastudio.in`) with a detailed glass showroom, cantilevered carport, solar roof terrace, and 3D illuminated facade signage.
* **Direct Lead & Storefront Drawer:** Click any business plot or card to view details, visit their website, or message directly via WhatsApp.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons.
* **Live 3D Map Engine:** MapLibre GL JS (CARTO Voyager & Dark Matter OpenStreetMap styles) + Three.js custom 3D WebGL layer.
* **Database & Spatial Layer:** Supabase (PostgreSQL + PostGIS) with automatic seed fallback.
* **Lead Dispatch:** Direct WhatsApp Click-to-Chat (`https://wa.me/...`) and interactive storefront drawer.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Add your Supabase credentials in .env.local (optional — falls back to seed data)

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000/?city=guwahati](http://localhost:3000/?city=guwahati) to explore the live 3D map and click **Walk (WASD)** to enter 3rd-person street view.

---

## 📂 Documentation

1. **[`PRD_PRODUCT_REQUIREMENTS.md`](./PRD_PRODUCT_REQUIREMENTS.md):** Product specifications, personas, and feature roadmap.
2. **[`TECH_ARCHITECTURE.md`](./TECH_ARCHITECTURE.md):** Frontend, backend, 3D rendering, and spatial data architecture.
3. **[`DATA_MODEL.md`](./DATA_MODEL.md):** PostgreSQL schema, PostGIS location queries, and indexing strategy.
4. **[`ROADMAP_30_DAYS.md`](./ROADMAP_30_DAYS.md):** Launch sprint milestones and rollout plan.
5. **[`AGENT_GUIDELINES.md`](./AGENT_GUIDELINES.md):** Engineering standards and design guidelines.
