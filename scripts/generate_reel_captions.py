#!/usr/bin/env python3
"""
Spotlight Bazaar — Instagram Reel Caption & Voiceover Script Engine
Generates viral voiceover scripts and high-conversion Instagram captions.
"""

import sys
import argparse

def generate_day_n_reel(day: int = 1, population: int = 6, city: str = "Guwahati"):
    voiceover = f"""
🎙️ SPOKEN VOICEOVER SCRIPT (Day {day})
-----------------------------------------------------------
[0.0s - 1.5s] Day {day}. This is India's open business street.
[1.5s - 3.2s] Active storefronts today: {population}.
[3.2s - 6.0s] No Justdial call centers. No ₹50,000 listing packages.
[6.0s - 8.5s] Just real wedding photographers, cafes, and creators...
[8.5s - 11.0s] with transparent starting prices and 1-tap WhatsApp chat.
[11.0s - 14.0s] Comment your business name and city below.
[14.0s - 16.5s] Every comment gets their official storefront on the map.
-----------------------------------------------------------
"""

    caption = f"""
📝 INSTAGRAM POST CAPTION
-----------------------------------------------------------
Day {day}: Building India's open business street from scratch. 🇮🇳

Today we added {population} verified storefronts across {city} and India. 

Why we built this:
❌ No selling your phone number to 10 competing call centers.
❌ No ₹50,000 upfront non-refundable directory fees.
✅ 1-Tap direct WhatsApp chat with real clients.
✅ Transparent starting rates upfront.

Want your business on the map?
👇 Drop your BUSINESS NAME and CITY in the comments below.
Our automated system will DM your 60-second storefront claim link instantly.

📍 Live Map: spotlight.nerqiva.com
⚡ An open initiative engineered by @nq_insta

.
.
#SmallBusinessIndia #IndianEntrepreneurs #WeddingPhotographerIndia #GuwahatiBusiness #BangaloreStartups #CreativeFreelancers #VocalForLocalIndia #SpotlightBazaar #Nerqiva
-----------------------------------------------------------
"""
    print(voiceover)
    print(caption)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Reel Voiceover & Caption")
    parser.add_argument("--day", type=int, default=1, help="Day counter number")
    parser.add_argument("--count", type=int, default=6, help="Total active storefronts count")
    parser.add_argument("--city", type=str, default="Guwahati", help="Focus city")
    args = parser.parse_args()

    generate_day_n_reel(args.day, args.count, args.city)
