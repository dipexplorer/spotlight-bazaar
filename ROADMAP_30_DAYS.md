# 📅 30-DAY EXECUTION ROADMAP & SPRINT SCHEDULE
**Project Name:** Spotlight Bazaar  
**Execution Mode:** Solo Founder / High-Agency Engineering Sprint  
**Target Milestone:** 50 Live Storefronts & First 100 Delivered WhatsApp Leads in 30 Days  

---

## Sprint Breakdown (Weeks 1 to 4)

```
┌────────────────────────────────────────────────────────────────────────┐
│ WEEK 1: MVP FOUNDATION & 60-SECOND ONBOARDING                          │
│ Goal: Working Next.js app with Supabase DB + Onboarding Form           │
│ Exit Criteria: Admin and test business can create a live storefront.  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WEEK 2: INTERACTIVE VISUAL CANVAS & WHATSAPP BRIDGE                    │
│ Goal: Fast mobile interactive map, category filters & WhatsApp chat    │
│ Exit Criteria: Map loads under 1.2s; 1-tap WhatsApp chat opens with    │
│ pre-filled message; local storage optimistic updates work.            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WEEK 3: INITIAL RECRUITMENT & CONTENT ENGINE LAUNCH                    │
│ Goal: 30–50 real businesses onboarded + First Day-N Reels posted       │
│ Exit Criteria: Day 1 & Day 2 Reels published on Instagram; 30 live    │
│ storefronts claimed across Guwahati / Bangalore / Delhi.               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WEEK 4: LEAD MEASUREMENT & MONETIZATION EXPERIMENT                     │
│ Goal: First 100 WhatsApp leads delivered + Test Paid "Verified" Badge  │
│ Exit Criteria: ≥100 verified WhatsApp clicks logged; first ₹499/mo    │
│ Pro subscription converted via Razorpay.                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Task Breakdown

### Week 1: Core Engine & Onboarding (Days 1–7)
- [ ] Initialize Next.js 15 project in `/projects/spotlight-bazaar` with Tailwind CSS v4 and TypeScript.
- [ ] Provision Supabase PostgreSQL database and execute SQL schema from `DATA_MODEL.md`.
- [ ] Implement mobile-first 60-second onboarding form (`/register`):
  - Image upload with client-side WebP compression.
  - Auto-complete for Indian cities and pincodes.
  - Validation for Indian WhatsApp phone numbers.
- [ ] Build dynamic storefront profile page (`/b/[slug]`):
  - Portfolio grid, starting price banner, and sticky "Connect on WhatsApp" CTA.
- [ ] Configure OpenGraph tags and LocalBusiness JSON-LD for programmatic Google SEO.

### Week 2: Visual Map & Mobile Polish (Days 8–14)
- [ ] Integrate lightweight interactive map (Leaflet / Canvas with custom SVG pins).
- [ ] Implement hierarchical filters: Main Category (Creative, Food, Tech, Home, Beauty, etc.) + Price Tier + City.
- [ ] Build `/api/boot` edge route with Cloudflare 120s caching.
- [ ] Add optimistic local caching (`localStorage: 'sb-my-storefront'`) so new owners see their storefront immediately.
- [ ] Implement Lead Event logging (`/api/analytics/lead-click`) to record WhatsApp conversation starts.
- [ ] Deploy MVP to Vercel production domain.

### Week 3: Content Engine & Initial 50 Businesses (Days 15–21)
- [ ] Setup automated 9:16 vertical video recording script using Playwright:
  - Takes storefront slug, records cinematic camera zoom into the city map, highlights portfolio.
- [ ] Manually onboard first 20 businesses (friends, local vendors, wedding studios, cafes) to ensure the map looks bustling on Day 1.
- [ ] Launch Day 1 Instagram Reel on `@NQ_INSTA`:
  *"Building India's Open Business Street from scratch. Comment your business name and city to claim your digital storefront."*
- [ ] Deploy automated DM reply or bio link leading to the 60-second registration form.

### Week 4: Lead Verification & Paid Subscriptions (Days 22–30)
- [ ] Monitor analytics dashboard: Track total impressions, storefront views, and WhatsApp clicks.
- [ ] Send weekly WhatsApp digest to listed businesses:
  *"Your storefront had 38 views and 4 client WhatsApp clicks this week on Spotlight Bazaar."*
- [ ] Introduce **"Guild Verified" Badge** & Featured Spotlight for ₹499/month (integrate Razorpay payment link).
- [ ] Run Kill/Continue decision audit.

---

## 🛑 Kill / Continue Gates (Strict Decision Metrics)

| Gate (Day 30) | Threshold Required | Action if Below Threshold | Action if Met / Exceeded |
| :--- | :--- | :--- | :--- |
| **Live Storefronts** | At least **35 verified businesses** | Simplify onboarding form to 3 fields; recruit via direct DM outreach. | Proceed to Phase 2 automated expansion. |
| **WhatsApp Leads Delivered** | At least **50 real lead clicks** | Reposition hook from general directory to high-converting category (e.g. Wedding Creatives only). | Scale Instagram reel production; turn on paid ads. |
| **Vendor NPS / Feedback** | At least 5 vendors report real inquiries | Interview vendors to discover why conversion failed. | Launch self-serve ₹499/mo Pro tier. |

