package com.trendstv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendstv.model.TrendItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Service
public class HackerNewsService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String BASE = "https://hacker-news.firebaseio.com/v0";

    @Autowired
    public HackerNewsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<TrendItem> fetchTrending() {
        List<TrendItem> items = new ArrayList<>();
        try {
            String json = restTemplate.getForObject(BASE + "/topstories.json", String.class);
            if (json == null) return items;

            int[] ids = objectMapper.readValue(json, int[].class);
            int limit = Math.min(25, ids.length);

            ExecutorService executor = Executors.newFixedThreadPool(5);
            List<Future<TrendItem>> futures = new ArrayList<>();

            for (int i = 0; i < limit; i++) {
                final int id = ids[i];
                futures.add(executor.submit(() -> fetchStory(id)));
            }

            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.SECONDS);

            for (Future<TrendItem> future : futures) {
                try {
                    TrendItem item = future.get(2, TimeUnit.SECONDS);
                    if (item != null) items.add(item);
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            // Return empty on failure
        }
        return items;
    }

    private TrendItem fetchStory(int id) {
        try {
            String json = restTemplate.getForObject(BASE + "/item/" + id + ".json", String.class);
            if (json == null) return null;

            JsonNode node = objectMapper.readTree(json);
            String type = node.path("type").asText("");
            if (!type.equals("story")) return null;

            String title = node.path("title").asText("");
            if (title.isBlank()) return null;

            String url = node.path("url").asText("https://news.ycombinator.com/item?id=" + id);
            String category = inferCategory(title, url);

            return new TrendItem(
                "hn_" + id,
                title,
                "",
                url,
                "",
                "Hacker News",
                "hackernews",
                category,
                node.path("score").asLong(0),
                node.path("descendants").asInt(0)
            );
        } catch (Exception e) {
            return null;
        }
    }

    private String inferCategory(String title, String url) {
        String lower = title.toLowerCase();
        if (lower.contains("ai") || lower.contains("machine learning") || lower.contains("llm")) return "Technology";
        if (lower.contains("startup") || lower.contains("funding") || lower.contains("ipo")) return "Business";
        if (lower.contains("science") || lower.contains("research") || lower.contains("study")) return "Science";
        if (lower.contains("security") || lower.contains("hack") || lower.contains("vulnerab")) return "Technology";
        if (url.contains("github.com")) return "Technology";
        return "Technology";
    }
}
