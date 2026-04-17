# TrendsTV

A Google Trends TV-style web app that aggregates what's trending across multiple social platforms — Reddit, Hacker News, GitHub, and Product Hunt — displayed in a dark, TV-grid UI.

## Features

- **Real-time aggregation** from Reddit (r/popular), Hacker News top stories, GitHub trending repos, and Product Hunt daily posts
- **Filter by source** (Reddit, Hacker News, GitHub, Product Hunt)
- **Filter by category** (Technology, News, Science, Gaming, etc.)
- **Auto-refresh** every 10 minutes with 10-minute server-side cache
- **TV grid layout** with cards showing thumbnails, scores, and comment counts
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

| Variable | Source |
|---|---|
| `GITHUB_TOKEN` | [GitHub Settings → Developer tokens](https://github.com/settings/tokens) |
| `PRODUCTHUNT_TOKEN` | [Product Hunt API Dashboard](https://www.producthunt.com/v2/oauth/applications) |

## Tech Stack

- Java 17 + Spring Boot 3.2
- Thymeleaf (server-side template)
- Caffeine cache (10-min TTL)
- Vanilla JS + CSS (no frameworks)
- Docker multi-stage build
