# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Project Name:** Spotlight Bazaar  
**Author:** NERQIVA Systems / Product Engineering  
**Version:** 1.0 (MVP)  
**Status:** Approved for Implementation  

---

## 1. Product Summary & Mission Statement

Spotlight Bazaar is an **open-elective visual discovery platform** that allows any legitimate Indian small business, freelancer, or commercial service provider to claim an interactive digital storefront on a shared visual map. 

By adapting the viral, gamified participation mechanics of *India Again*, Spotlight Bazaar turns the passive directory into a living, high-conversion commercial ecosystem where clients discover curated local talent and initiate direct WhatsApp conversations.

---

## 2. The "Open-Elective" Principle

Unlike traditional vertical directories that restrict listings to a single domain (e.g., only weddings on WedMeGood, only blue-collar repair on Urban Company), **Spotlight Bazaar operates as an open-elective directory**:

* **Any business can claim a spot:**
  * 📸 *Creative & Media:* Wedding photographers, cinematographers, drone pilots, video editors, UGC creators.
  * 💄 *Beauty & Wellness:* Bridal makeup artists, hair stylists, nail salons, freelance yoga trainers.
  * ☕ *Food & Hospitality:* Boutique cafes, home bakers, cloud kitchens, regional specialty foods.
  * 💻 *Tech & Professional:* Freelance software engineers, UI/UX designers, copywriters, tax consultants.
  * 🛠️ *Local Services & Home:* AC repair, custom furniture makers, interior designers, electricians.
  * 🎓 *Education & Coaching:* Independent tutors, music instructors, fitness coaches.
  * 🧵 *Artisans & Boutiques:* Handloom weavers, pottery artists, custom tailoring studios.
* **Organization via Dynamic Tags & Categories:** The system uses hierarchical tagging (`Category` → `Subcategory` → `Price Tier` → `City / Locality`) so users can fluidly filter from the entire national directory down to a single neighborhood niche in 1 click.

---

## 3. The 4-Step Viral Growth Loop

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. THE TOP-OF-FUNNEL HOOK (Instagram Reels / Shorts)                   │
│    - Reel showing a dynamic visual map: "Day 1 of building India's     │
│      open business street. Comment your business & city to claim."     │
│    - Trigger: Local business ego, vanity, and the hunt for free leads. │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. 60-SECOND ZERO-FRICTION ONBOARDING                                  │
│    - Vendor taps bio link or automated DM.                             │
│    - Submits: Business Name, Category, City/Pincode, WhatsApp Number,  │
│      Instagram Handle, Starting Price, and 3-6 Best Photos.            │
│    - No lengthy corporate KYC or mandatory passwords for v1.           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. INSTANT VISUAL GRATIFICATION & SHARE CARD                           │
│    - Their digital storefront appears on the interactive map instantly │
│      with an optimistic UI.                                            │
│    - Auto-generated 9:16 Instagram Story graphic:                      │
│      "We just claimed Storefront #142 on Spotlight Bazaar Guwahati!"   │
│    - Vendor shares the story to their followers, driving organic viral │
│      referrals of other local business owners.                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. DIRECT WHATSAPP LEAD DELIVERY                                       │
│    - Visiting customers browse by city and category.                   │
│    - 1-Tap "Chat on WhatsApp" button pre-fills high-intent message:     │
│      "Hi [Business], saw your storefront on Spotlight Bazaar! I'd like │
│       to check availability and quotes for [Date/Service]."            │
│    - Vendor gets real customers → Validates immediate product utility. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. User Personas

### Persona 1: The Small Business Owner / Freelancer ("Rohan")
* **Profile:** 26-year-old freelance wedding photographer or boutique cafe owner in Guwahati.
* **Goal:** Wants high-paying clients without paying ₹50,000 upfront to WedMeGood or getting spammed by Justdial telemarketers.
* **Key Motivation:** Wants a sleek, modern link that makes their business look premium and credible when shared on WhatsApp and Instagram.

### Persona 2: The Hiring Client / Customer ("Pooja")
* **Profile:** 28-year-old planning an event, looking for a home baker, or hiring a local designer.
* **Frustration:** Hates filling out inquiry forms that result in 10 aggressive call-center spam calls within 5 minutes.
* **Goal:** Wants to browse visual portfolios, see honest starting prices upfront, and chat directly on WhatsApp.

### Persona 3: The Platform Admin / Curator (Founder)
* **Goal:** Monitor directory health, approve verified badges, feature top performers, and manage subscription billing.

---

## 5. Functional Requirements (MVP Scope)

### Module 1: The Interactive Visual Canvas (Map & Grid)
* **FR-1.1:** Interactive city canvas supporting smooth pan, zoom, and tap gestures on mobile touchscreens.
* **FR-1.2:** Dynamic filtering by **City**, **Pincode**, **Main Category** (Creative, Beauty, Food, Tech, Home, Education, Other), and **Price Tier** (Budget, Mid-Tier, Premium, Luxury).
* **FR-1.3:** Seamless toggle between **Interactive Visual Map View** and **Curated Grid/List View** for high-speed browsing on slower mobile connections.
* **FR-1.4:** Real-time counter at the top: *"Day N · Total Active Storefronts: 412 across 18 Cities"*.

### Module 2: The 60-Second Business Onboarding Flow
* **FR-2.1:** Mobile-optimized onboarding form:
  1. Business Name & Tagline.
  2. Category & Open-Elective Tags (e.g. `Wedding Photography`, `Cloud Kitchen`).
  3. City, State, and Area/Pincode (auto-suggested).
  4. WhatsApp Business Phone Number (validated).
  5. Instagram Handle / Website link.
  6. Starting Price (e.g. *"Starts from ₹15,000"*).
  7. 3 to 6 high-resolution portfolio images (optimized on upload).
* **FR-2.2:** Optimistic UI: Storefront renders locally immediately upon submission so the owner can preview their storefront without waiting.

### Module 3: Digital Storefront Profile Page (`/b/[slug]`)
* **FR-3.1:** Fast-loading, responsive showcase page featuring:
  - High-impact visual header and business avatar/logo.
  - Category tags and verified location pin.
  - High-res visual portfolio gallery (grid + full-screen light box).
  - Clear, prominent starting price display.
  - Big Sticky Call-to-Action: **"Connect on WhatsApp"**.
* **FR-3.2:** Privacy-safe WhatsApp link generator pre-populating:
  `https://wa.me/91[PHONE]?text=Hi%20[NAME],%20I%20found%20your%20storefront%20on%20Spotlight%20Bazaar!`
* **FR-3.3:** Built-in visitor counter: *"42 potential clients viewed this storefront this week"*.

### Module 4: Verification & Trust Badges
* **FR-4.1:** **"Claimed Storefront"** (Default tier, free forever).
* **FR-4.2:** **"Guild Verified" Badge** (Issued after admin checks Instagram authenticity and active WhatsApp presence).
* **FR-4.3:** **"Pincode Pioneer / Mayor" Badge** (Awarded to the first 3 businesses to register in any specific pin code).

---

## 6. Non-Functional Requirements (Performance & Security)

* **Performance:** Maximum First Contentful Paint (FCP) under **1.2 seconds** on a 4G Indian mobile connection.
* **Device Responsiveness:** 100% optimized for vertical mobile screens (360px–420px width), which represents >85% of traffic.
* **Data Privacy (DPDP Act Compliance):** No raw business phone numbers or personal emails exposed in unauthenticated public API payloads; contact points are accessed exclusively through WhatsApp click-to-chat links.
* **Scalability:** Edge-cached API snapshots via Cloudflare / Vercel Edge to survive sudden Instagram viral traffic spikes (10,000+ concurrent visitors) without database crashes.

---

## 7. Out of Scope for Version 1 (Explicit Boundaries)

* ❌ In-app chat messaging (handled 100% natively by WhatsApp).
* ❌ Payment escrow or checkout inside the platform (clients pay vendors directly via UPI/Bank).
* ❌ Complex 3D avatar walking controls (WASD controls confuse non-gamer mobile users; clean 2D/2.5D visual map converts significantly higher).
* ❌ Mandatory login passwords for consumers (consumers browse completely free without login friction).

