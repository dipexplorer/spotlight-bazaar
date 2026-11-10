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

## 🛠️ High-Level Tech Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons.
* **Visual Map Layer:** High-performance, touch-optimized visual map (Leaflet / Mapbox / Canvas-based isometric 2.5D street view) with Three.js acceleration where beneficial. Prioritizes sub-second load times on budget mobile devices over heavy 3D downloads.
* **Database & Auth:** Supabase (PostgreSQL with PostGIS for spatial queries).
* **Edge & Hosting:** Vercel + Cloudflare Edge CDN (leveraging 120-second snapshot caching for viral traffic spikes).
* **Communication & Leads:** Direct WhatsApp Click-to-Chat API links (`https://wa.me/...`).
* **Payments & Billing:** Razorpay / Cashfree (Subscription plans: ₹499–₹999/month for Pro/Verified tiers).

---

## 📂 Project Architecture & Documentation Index

Every AI agent and developer working on this project must consult the following authoritative documents in this directory:

1. **[`PRD_PRODUCT_REQUIREMENTS.md`](file:///mnt/data2/SIDE_HUSSLE/projects/spotlight-bazaar/PRD_PRODUCT_REQUIREMENTS.md):** Detailed product specifications, user personas, open-elective category mechanics, and feature backlog.
2. **[`TECH_ARCHITECTURE.md`](file:///mnt/data2/SIDE_HUSSLE/projects/spotlight-bazaar/TECH_ARCHITECTURE.md):** Complete frontend, backend, map rendering, edge caching, and WhatsApp dispatch architecture.
3. **[`DATA_MODEL.md`](file:///mnt/data2/SIDE_HUSSLE/projects/spotlight-bazaar/DATA_MODEL.md):** PostgreSQL schema, table definitions, PostGIS location queries, and index strategies.
4. **[`ROADMAP_30_DAYS.md`](file:///mnt/data2/SIDE_HUSSLE/projects/spotlight-bazaar/ROADMAP_30_DAYS.md):** 4-week sprint execution plan from MVP build to initial 100 businesses onboarded.
5. **[`AGENT_GUIDELINES.md`](file:///mnt/data2/SIDE_HUSSLE/projects/spotlight-bazaar/AGENT_GUIDELINES.md):** Coding rules, design language standards (Nerqiva dark aesthetic & speed), and system prompts for AI code generation.

