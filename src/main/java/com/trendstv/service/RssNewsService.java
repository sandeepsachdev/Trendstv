package com.trendstv.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import com.trendstv.model.RssFeedSource;
import com.trendstv.model.TrendItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.jdom2.Element;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RssNewsService {

    private static final List<RssFeedSource> FEEDS = List.of(
        // ── Australia ─────────────────────────────────────────────
        new RssFeedSource("ABC News",              "https://www.abc.net.au/news/feed/45910/rss.xml",          "Australia"),
        new RssFeedSource("Sydney Morning Herald", "https://www.smh.com.au/rss/feed.xml",                    "Australia"),
        new RssFeedSource("The Age",               "https://www.theage.com.au/rss/feed.xml",                 "Australia"),
        new RssFeedSource("The Guardian AU",       "https://www.theguardian.com/australia-news/rss",         "Australia"),
        new RssFeedSource("Sky News Australia",    "https://feeds.skynews.com/feeds/rss/home.xml",           "Australia"),
        new RssFeedSource("news.com.au",           "https://www.news.com.au/content-feeds/latest-news-national/", "Australia"),
        new RssFeedSource("Herald Sun",            "https://www.heraldsun.com.au/feed",                      "Australia"),
        new RssFeedSource("The Australian",        "https://www.theaustralian.com.au/feed/",                 "Australia"),
        // ── UK ────────────────────────────────────────────────────
        new RssFeedSource("BBC News",              "https://feeds.bbci.co.uk/news/rss.xml",                  "UK"),
        new RssFeedSource("The Guardian",          "https://www.theguardian.com/world/rss",                  "UK"),
        new RssFeedSource("The Independent",       "https://www.independent.co.uk/news/rss",                 "UK"),
        new RssFeedSource("The Telegraph",         "https://www.telegraph.co.uk/rss.xml",                    "UK"),
        // ── USA ───────────────────────────────────────────────────
        new RssFeedSource("Reuters",               "https://feeds.reuters.com/reuters/topNews",              "Global"),
        new RssFeedSource("AP News",               "https://feeds.apnews.com/rss/apf-topnews",              "Global"),
        new RssFeedSource("Google News",           "https://news.google.com/rss?hl=en&gl=AU&ceid=AU:en",    "Global"),
        new RssFeedSource("CNN",                   "http://rss.cnn.com/rss/edition.rss",                    "USA"),
        new RssFeedSource("NPR",                   "https://feeds.npr.org/1001/rss.xml",                    "USA"),
        new RssFeedSource("NY Times",              "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "USA"),
        // ── Middle East / Global ──────────────────────────────────
        new RssFeedSource("Al Jazeera",            "https://www.aljazeera.com/xml/rss/all.xml",             "Global")
    );

    private static final Pattern IMG_PATTERN =
        Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
    private static final Pattern TAGS_PATTERN =
        Pattern.compile("<[^>]+>");

    private final RestTemplate restTemplate;

    @Autowired
    public RssNewsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<TrendItem> fetchTrending() {
        List<TrendItem> results = new ArrayList<>();
        ExecutorService exec = Executors.newFixedThreadPool(8);
        List<Future<List<TrendItem>>> futures = new ArrayList<>();

        for (RssFeedSource feed : FEEDS) {
            futures.add(exec.submit(() -> parseFeed(feed)));
        }

        exec.shutdown();
        try { exec.awaitTermination(20, TimeUnit.SECONDS); } catch (InterruptedException ignored) {}

        for (Future<List<TrendItem>> f : futures) {
            try { results.addAll(f.get(1, TimeUnit.SECONDS)); } catch (Exception ignored) {}
        }
        return results;
    }

    private List<TrendItem> parseFeed(RssFeedSource feed) {
        List<TrendItem> items = new ArrayList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TrendsTV/1.0 RSS Reader");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<byte[]> resp = restTemplate.exchange(
                feed.getUrl(), HttpMethod.GET, entity, byte[].class);

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) return items;

            SyndFeed syndFeed = new SyndFeedInput()
                .build(new XmlReader(new ByteArrayInputStream(resp.getBody())));

            long now = System.currentTimeMillis();

            for (SyndEntry entry : syndFeed.getEntries()) {
                String title = entry.getTitle();
                if (title == null || title.isBlank()) continue;

                // Score = recency in 0..86400 range (newer = higher)
                long pubMs  = entry.getPublishedDate() != null
                    ? entry.getPublishedDate().getTime()
                    : entry.getUpdatedDate() != null
                        ? entry.getUpdatedDate().getTime()
                        : now;
                long ageMs  = Math.max(0, now - pubMs);
                long score  = Math.max(0, TimeUnit.HOURS.toMillis(36) - ageMs) / 1000;

                // Skip items older than 36 hours
                if (score == 0) continue;

                String rawDesc = entry.getDescription() != null
                    ? entry.getDescription().getValue() : "";

                String image   = extractImage(entry, rawDesc);
                String desc    = stripTags(rawDesc);
                if (desc.length() > 220) desc = desc.substring(0, 220) + "…";

                String category = inferCategory(entry);
                String url      = entry.getLink() != null ? entry.getLink() : "";

                String id = feed.getName().replaceAll("\\s", "_") + "_"
                    + Integer.toHexString((title + url).hashCode());

                TrendItem item = new TrendItem(
                    id, title.trim(), desc, url,
                    image, feed.getName(), feed.getRegion(),
                    category, score, 0
                );
                item.setPublishedAt(Instant.ofEpochMilli(pubMs));
                items.add(item);
            }
        } catch (Exception ignored) {}
        return items;
    }

    private String extractImage(SyndEntry entry, String descHtml) {
        // 1. Enclosures
        if (entry.getEnclosures() != null) {
            for (var enc : entry.getEnclosures()) {
                if (enc.getUrl() != null && enc.getUrl().startsWith("http")) return enc.getUrl();
            }
        }
        // 2. media:content / media:thumbnail — direct or nested inside media:group
        if (entry.getForeignMarkup() != null) {
            String url = findMediaUrl(entry.getForeignMarkup());
            if (url != null) return url;
        }
        // 3. content:encoded <img> tag
        if (entry.getContents() != null) {
            for (var c : entry.getContents()) {
                if (c.getValue() != null) {
                    Matcher m2 = IMG_PATTERN.matcher(c.getValue());
                    if (m2.find()) {
                        String src = m2.group(1);
                        if (src.startsWith("http")) return src;
                    }
                }
            }
        }
        // 4. HTML description <img> tag
        Matcher m = IMG_PATTERN.matcher(descHtml);
        if (m.find()) {
            String src = m.group(1);
            if (src.startsWith("http")) return src;
        }
        return null;
    }

    private String findMediaUrl(List<Element> elements) {
        for (Element el : elements) {
            String name = el.getName();
            if ("content".equals(name) || "thumbnail".equals(name)) {
                String url = el.getAttributeValue("url");
                if (url != null && url.startsWith("http")) return url;
            }
            if (!el.getChildren().isEmpty()) {
                String url = findMediaUrl(el.getChildren());
                if (url != null) return url;
            }
        }
        return null;
    }

    private String stripTags(String html) {
        if (html == null || html.isBlank()) return "";
        return TAGS_PATTERN.matcher(html).replaceAll(" ")
            .replaceAll("\\s{2,}", " ").trim();
    }

    private String inferCategory(SyndEntry entry) {
        List<String> cats = entry.getCategories() == null
            ? List.of()
            : entry.getCategories().stream()
                .map(c -> c.getName() != null ? c.getName().toLowerCase() : "")
                .toList();

        String combined = String.join(" ", cats)
            + " " + (entry.getTitle() != null ? entry.getTitle().toLowerCase() : "");

        if (matches(combined, "tech", "ai ", "artificial intelligence", "cyber", "digital", "software")) return "Technology";
        if (matches(combined, "sport", "cricket", "football", "soccer", "tennis", "basketball", "nrl", "afl", "rugby")) return "Sports";
        if (matches(combined, "business", "economy", "finance", "market", "stock", "invest", "trade")) return "Business";
        if (matches(combined, "science", "health", "medical", "climate", "space", "research")) return "Science";
        if (matches(combined, "entertainment", "film", "movie", "music", "celebrity", "culture", "arts")) return "Entertainment";
        if (matches(combined, "politic", "election", "government", "parliament", "senate", "prime minister")) return "Politics";
        if (matches(combined, "world", "international", "global", "ukraine", "middle east")) return "World";
        if (matches(combined, "australia", "sydney", "melbourne", "brisbane", "perth", "canberra")) return "Australia";
        return "News";
    }

    private boolean matches(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }
}
