# Gita Guide 🪈

A Krishna-themed astrology & guidance web app prototype (Astrotalk-style), in English and Hindi.

**Features**
- **Shloka of the Day** – a Bhagavad Gita verse in Sanskrit with meaning and a daily lesson.
- **Daily Rashifal** – per-rashi reading (career, love, health, lucky colour/number) tied to a Gita teaching. Changes daily.
- **Free Kundli** – Lagna, Moon sign, Nakshatra/pada, Sun sign, and a North Indian chart with all nine grahas. Calculated in the browser (simplified orbital elements + Lahiri ayanamsa, whole-sign houses), so it's approximate. No data leaves the device.
- **Ask Gita Guide** – a mock chat. Pre-written, keyword-matched replies with a relevant shloka. No backend or AI.
- English / हिंदी toggle (saved in the browser).

**Run locally**: open `index.html`, or run `python3 -m http.server` and visit http://localhost:8000.

**Deploy on GitHub Pages**: Settings → Pages → Source: *Deploy from a branch* → pick the branch and `/ (root)`.

No build step. The files are `index.html`, `css/style.css`, `js/data.js` (all text content), `js/astro.js` (calculations) and `js/app.js` (UI).
