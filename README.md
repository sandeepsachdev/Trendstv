# TrendsTV

A Google Trends TV-style web app that displays the latest breaking news from 19 mainstream media outlets worldwide, with a focus on Australian news. Stories are ranked by recency and displayed in a cinematic fullscreen or multi-cell grid layout that automatically cycles through the latest headlines.

## News Sources

### Australia
| Outlet | RSS Feed |
|---|---|
| ABC News | `abc.net.au` |
| Sydney Morning Herald | `smh.com.au` |
| The Age | `theage.com.au` |
| The Guardian Australia | `theguardian.com/australia-news` |
| Sky News Australia | `skynews.com.au` |
| news.com.au | `news.com.au` |
| Herald Sun | `heraldsun.com.au` |
| The Australian | `theaustralian.com.au` |

### United Kingdom
| Outlet | RSS Feed |
|---|---|
| BBC News | `bbc.co.uk/news` |
| The Guardian | `theguardian.com/world` |
| The Independent | `independent.co.uk` |
| The Telegraph | `telegraph.co.uk` |

### Global / USA
| Outlet | RSS Feed |
|---|---|
| Reuters | `reuters.com` |
| AP News | `apnews.com` |
| Google News | `news.google.com` |
| CNN | `cnn.com` |
| NPR | `npr.org` |
| NY Times | `nytimes.com` |
| Al Jazeera | `aljazeera.com` |

## Features

- **Fullscreen single-item mode** — one story at a time with a cinematic full-bleed background, Ken Burns zoom, A/B crossfade, animated progress bar, and a queue strip of upcoming headlines
- **Grid mode (2×2 or 3×3)** — multiple stories on screen simultaneously; each cell independently refreshes to a new random story every 5–9 seconds with its own crossfade and flash animation
- **Layout switcher** — toggle between 1, 4, and 9 items from the top bar
- **Region filter** — filter by Australia, UK, USA, or Global
- **Source filter** — dynamically built from available sources with brand colour dots; filter to a single outlet
- **Category filter** — Australia, World, Politics, Business, Technology, Science, Sports, Entertainment
- **Keyboard navigation** — ← → arrows to navigate, Space to pause (single mode)
- **Pause on hover** — hovering over single mode pauses auto-advance
- **Recency scoring** — stories ranked by publish time; items older than 36 hours are excluded
- **Caffeine cache** — server-side 10-minute cache; auto-evicted by scheduler
- **No API keys required** — all sources use public RSS feeds

## Running Locally

```bash
./mvnw spring-boot:run
```

Open http://localhost:8080

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your repo — Render auto-detects `render.yaml`
4. Click **Deploy**

No environment variables are required. The app works out of the box on Render's free tier.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Java 17 |
| Framework | Spring Boot 3.2 |
| RSS parsing | Rome 2.1.0 |
| Templating | Thymeleaf |
| Caching | Caffeine (10-min TTL) |
| Frontend | Vanilla JS + CSS (no frameworks) |
| Container | Docker multi-stage build (Alpine JRE) |
| Deploy | Render (via `render.yaml`) |

## Project Structure

```
src/main/java/com/trendstv/
├── TrendsTvApplication.java
├── config/
│   └── AppConfig.java          # RestTemplate (5s/12s timeout), Caffeine cache
├── controller/
│   └── TrendsController.java   # GET /, GET /api/trends, POST /api/trends/refresh
├── model/
│   ├── RssFeedSource.java      # Feed name, URL, region
│   ├── TrendItem.java          # Single story
│   └── TrendsResponse.java     # API response envelope
├── scheduler/
│   └── TrendsRefreshScheduler.java
└── service/
    ├── RssNewsService.java     # Fetches 19 feeds concurrently, parses with Rome
    └── TrendingService.java    # Cache wrapper + filter logic

src/main/resources/
├── templates/index.html        # Thymeleaf shell (JS renders everything)
├── static/css/main.css
└── static/js/app.js            # Single/grid TV engine, filter panel, auto-cycle
```

---

## Prompts used to create this project

The following prompts were used in a Claude Code session to build this app from scratch.

---

**Prompt 1 — Initial build:**
> Create a spring boot app which looks like https://trends.google.com/tv/ but sources items from what is trending on multiple social media sites. The should be easy to deploy on render and have a docker file

Produced the full Spring Boot scaffold: Maven structure, `pom.xml`, `TrendItem` / `TrendsResponse` models, Caffeine cache config, REST controller, four social-media services (Reddit, Hacker News, GitHub, Product Hunt), 10-minute refresh scheduler, `application.properties`, `Dockerfile`, `render.yaml`. Frontend was a static card grid at this point.

---

**Prompt 2 — Match Google Trends TV design:**
> This isn't the same design as the site I asked for. It has a grid where items get updated randomly every few seconds. Continue from where you left off.

Rewrote the frontend:
- Fullscreen A/B crossfade slide layers with Ken Burns zoom
- Animated progress bar, queue strip of upcoming thumbnails
- Pause-on-hover, keyboard navigation (← → Space)
- Filter panel (source + category chips) in the top bar

---

**Prompt 3 — Add adjustable grid layout:**
> Google trends tv also allow you adjust how many items on the screen at a time in a grid pattern

Added:
- Layout picker (1 / 4 / 9) in the top bar
- 2×2 and 3×3 CSS grid modes
- Each cell independently cycles with its own A/B crossfade every 5–9 s (staggered)
- Flash-ring animation on cell refresh; "Open ↗" hover hint

---

**Prompt 4 — Add prompts to README:**
> Add the prompts used to create this to the readme file

---

**Prompt 5 — Replace social sources with mainstream news:**
> Add all the news sources with mainstream media sources like the Sydney Morning Herald and Google News the Australian Broadcasting Corporation
> Replace the news sources I mean

Replaced Reddit/HN/GitHub/ProductHunt with 19 mainstream RSS feeds. Added `RssNewsService` using the Rome 2.1.0 RSS/Atom parser, fetching all feeds concurrently with an 8-thread pool. Scoring changed to recency-based (0–86400 pts; stories >36 h old dropped). Thumbnails extracted from RSS enclosures or `<img>` tags in HTML descriptions. Categories inferred from RSS entry tags and title keywords.

Frontend: source chips now built dynamically from API `sourceCounts` with per-outlet brand colour dots. New Region filter (Australia / UK / USA / Global). Category filter updated for news topics. Single-mode overlay shows region badge and relative time ("3h ago").

---

**Prompt 6 — Update README:**
> Update the readme
