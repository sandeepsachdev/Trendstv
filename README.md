# TrendsTV

A Google Trends TV-style web app that aggregates what's trending across multiple social platforms — Reddit, Hacker News, GitHub, and Product Hunt — displayed in a fullscreen, dark, TV-style UI.

## Features

- **Fullscreen single-item mode** — one trend at a time, cinematic background, auto-cycles every 8 seconds with a progress bar, Ken Burns zoom, crossfade transitions, and a queue strip of upcoming items
- **Grid mode (2×2 or 3×3)** — multiple trends on screen simultaneously; each cell independently cycles to a new random trend every 5–9 seconds with its own crossfade
- **Layout switcher** — toggle between 1, 4, and 9 items from the top bar
- **Filter panel** — filter by source (Reddit / Hacker News / GitHub / Product Hunt) or category (Technology, News, Science, Gaming, etc.)
- **Keyboard navigation** — ← → arrows to navigate, Space to pause (single mode)
- **Pause on hover** — hovering over single mode pauses auto-advance
- **Caffeine cache** — server-side 10-minute cache with auto-refresh scheduler
- **One-click deploy** to Render via `render.yaml`

## Running Locally

```bash
./mvnw spring-boot:run
```

Open http://localhost:8080

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo — Render auto-detects `render.yaml`
4. Click **Deploy**

## Optional API Tokens (for more data)

Set these as environment variables on Render for expanded results:

| Variable | Where to get it |
|---|---|
| `GITHUB_TOKEN` | [GitHub Settings → Developer tokens](https://github.com/settings/tokens) |
| `PRODUCTHUNT_TOKEN` | [Product Hunt API Dashboard](https://www.producthunt.com/v2/oauth/applications) |

## Tech Stack

- Java 17 + Spring Boot 3.2
- Thymeleaf (server-side template)
- Caffeine cache (10-min TTL)
- Vanilla JS + CSS (no frameworks)
- Docker multi-stage build (Alpine JRE runtime)

---

## Prompts used to create this project

The following prompts were used in a Claude Code session to build this app from scratch:

---

**Prompt 1 — Initial build:**
> Create a spring boot app which looks like https://trends.google.com/tv/ but sources items from what is trending on multiple social media sites. The should be easy to deploy on render and have a docker file

This produced the full Spring Boot project: Maven structure, `pom.xml`, models (`TrendItem`, `TrendsResponse`), Caffeine cache config, REST controller (`GET /api/trends`, `POST /api/trends/refresh`), four data-source services (Reddit, Hacker News, GitHub, Product Hunt), a scheduler that evicts cache every 10 minutes, `application.properties`, `Dockerfile`, and `render.yaml`.

The initial frontend was a static card grid — not matching the Google Trends TV design.

---

**Prompt 2 — Redesign to match Google Trends TV:**
> This isn't the same design as the site I asked for. It has a grid where items get updated randomly every few seconds.
> Continue from where you left off.

This rewrote the frontend completely:
- Fullscreen single-item mode with crossfading slide layers (A/B), Ken Burns zoom animation, gradient overlays, animated progress bar, queue strip of upcoming thumbnails, pause-on-hover, and keyboard navigation
- CSS-only transitions with staggered text fade-in on slide change
- Filter panel (source + category chips) accessible from the top bar

---

**Prompt 3 — Add grid layout modes:**
> Google trends tv also allow you adjust how many items on the screen at a time in a grid pattern

This added:
- A layout picker (1 / 4 / 9 items) in the top bar
- Grid mode (`mode-grid`) with 2×2 and 3×3 CSS grid layouts
- Each grid cell has its own independent A/B crossfade background and randomly cycles to a new item every 5–9 seconds (staggered per cell)
- A flash animation on cell refresh and an "Open ↗" hover hint
- Items assigned from a shuffled pool to avoid duplicates across cells at startup

---

**Prompt 4 — Add prompts to README:**
> Add the prompts used to create this to the readme file
