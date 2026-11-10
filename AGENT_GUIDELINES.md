# 🤖 AGENT GUIDELINES & SYSTEM DIRECTIVES
*Mandatory Instructions for AI Coding Assistants working on Spotlight Bazaar*

> **IMPORTANT DIRECTIVE FOR ANY AI AGENT (Antigravity, Claude, ChatGPT, Cursor, Copilot):**  
> You are working on **Spotlight Bazaar**, an open-elective visual commercial discovery platform built under the NERQIVA / NQ Digital engineering umbrella.
> 
> 🚨 **MANDATORY PREREQUISITE:** You MUST read and strictly adhere to [`STRICT_RULES.md`](./STRICT_RULES.md) before writing any code:
> 1. **Zero Blind AI Slop:** No lazy AI UI/UX patterns (use `/impeccable` design principles).
> 2. **Latest Tech & Live Docs:** Next.js 16+ / latest modern versions; verify docs via Context7.
> 3. **Clarify Before Execution:** Zero blind assumptions.
> 4. **Challenge Suboptimal Choices:** Recommend superior industry standards proactively.
> 5. **Interactive Step-by-Step Execution:** No giant code dumps; proceed atomic step by atomic step.

---

## 1. Core Engineering Principles

### Rule 1: Mobile-First is Non-Negotiable
* Over 85% of traffic originates from vertical mobile screens (360px–420px width) on 4G cellular connections in India.
* Every UI component must be designed and verified for touch targets (minimum 44x44px for clickable areas).
* **Zero Layout Shift (CLS):** Always set explicit aspect ratios on image containers and skeleton loaders for asynchronous content.

### Rule 2: Visual Map Performance Over Heavy 3D Novelty
* Do **NOT** import full-fat 3D rendering engines (heavy Three.js GLTF loaders) on the primary mobile landing page without a lightweight 2D/isometric fallback.
* Use Leaflet, Mapbox, or HTML5 Canvas with custom SVG marker icons for mobile maps. 
* Keep initial JavaScript bundle size strictly **under 150 KB gzip**.

### Rule 3: Native WhatsApp Lead Routing
* Never implement slow, multi-step email inquiry forms or in-app text chat systems.
* The primary conversion action on any storefront must always be a **direct WhatsApp Click-to-Chat button**:
  ```typescript
  const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hi ${businessName}, I found your storefront on Spotlight Bazaar! I would like to inquire about your services.`
  )}`;
  ```
* Always fire the `/api/analytics/lead-click` beacon before or alongside the window navigation.

### Rule 4: Edge Caching Discipline (The India Again Lesson)
* Never expose raw uncached database queries on high-traffic landing endpoints.
* Ensure `/api/boot` uses HTTP Cache-Control headers:
  `Cache-Control: public, s-maxage=120, stale-while-revalidate=300`.

---

## 2. NERQIVA Design & Aesthetic Standards

When creating UI components in Tailwind CSS:

1. **Color Palette:**
   - Background: Deep Dark Charcoal / Black (`#0a0a0c`, `bg-neutral-950`).
   - Cards & Drawers: Frosted glassmorphism (`bg-neutral-900/80 backdrop-blur-md border border-neutral-800`).
   - Primary Accent / Highlights: Vibrant Neon Crimson Red (`#ff1744` or `bg-rose-600`) or Electric Gold/Amber (`amber-400`) for verified badges.
   - Text: Crisp White (`text-white`) for headings; Cool Grey (`text-neutral-400`) for secondary metadata.

2. **Typography Rules:**
   - Headings: Serif or modern geometric sans-serif (e.g. `Playfair Display`, `Cinzel`, or `Plus Jakarta Sans`).
   - Metadata / Badges / Labels: Heavily tracked, uppercase, tiny monospace or sans-serif (e.g. `text-[10px] tracking-widest uppercase font-mono text-neutral-400`).

---

## 3. Data Privacy & Legal Compliance (India DPDP Act 2023)

* **Explicit Consent on Onboarding:** The `/register` form must feature a clear, mandatory consent checkbox stating:
  *"I consent to listing my business details (Name, City, Category, Portfolio, and WhatsApp number) publicly on Spotlight Bazaar for customer discovery."*
* **Phone Number Masking:** Do not display raw phone numbers in plain text across search engine scrapeable HTML. Expose them solely through client-side initiated `wa.me` links.

---

## 4. Code Quality & Conventions

* **Language:** TypeScript only with strict type checking enabled (`strict: true`).
* **Framework:** Next.js 15 (App Router). Prefer React Server Components (RSC) for data-fetching and SEO pages; isolate client interactivity (`'use client'`) to the interactive map canvas and interactive drawers.
* **Component Modularity:** Keep components under 200 lines. Split complex drawers into separate sub-components (`StorefrontHeader`, `PortfolioGallery`, `WhatsAppButton`, `LeadMetrics`).

