package com.trendstv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendstv.model.TrendItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class RedditService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String[] SUBREDDITS = {
        "popular", "technology", "worldnews", "science", "gaming",
        "movies", "music", "sports", "business", "entertainment"
    };

    @Autowired
    public RedditService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<TrendItem> fetchTrending() {
        List<TrendItem> items = new ArrayList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TrendsTV/1.0 (Social Trends Aggregator)");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = "https://www.reddit.com/r/popular/hot.json?limit=25";
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode posts = root.path("data").path("children");

                for (JsonNode post : posts) {
                    JsonNode data = post.path("data");
                    String title = data.path("title").asText("");
                    if (title.isBlank()) continue;

                    String thumbnail = data.path("thumbnail").asText("");
                    if (thumbnail.equals("self") || thumbnail.equals("default") || thumbnail.equals("nsfw")) {
                        thumbnail = "";
                    }

                    String category = mapSubredditToCategory(data.path("subreddit").asText("popular"));

                    TrendItem item = new TrendItem(
                        "reddit_" + data.path("id").asText(),
                        title,
                        data.path("selftext").asText("").length() > 200
                            ? data.path("selftext").asText("").substring(0, 200) + "..."
                            : data.path("selftext").asText(""),
                        "https://reddit.com" + data.path("permalink").asText(""),
                        thumbnail,
                        "Reddit",
                        "reddit",
                        category,
                        data.path("score").asLong(0),
                        data.path("num_comments").asInt(0)
                    );
                    items.add(item);
                }
            }
        } catch (Exception e) {
            // Return empty on failure
        }
        return items;
    }

    private String mapSubredditToCategory(String subreddit) {
        return switch (subreddit.toLowerCase()) {
            case "technology", "programming", "tech" -> "Technology";
            case "worldnews", "news", "politics" -> "News";
            case "science" -> "Science";
            case "gaming", "games" -> "Gaming";
            case "movies", "television", "tv" -> "Entertainment";
            case "music" -> "Music";
            case "sports", "nba", "nfl", "soccer" -> "Sports";
            case "business", "finance", "investing" -> "Business";
            default -> "Trending";
        };
    }
}
