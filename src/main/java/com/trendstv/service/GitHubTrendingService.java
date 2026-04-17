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
public class GitHubTrendingService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public GitHubTrendingService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<TrendItem> fetchTrending() {
        List<TrendItem> items = new ArrayList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.set("User-Agent", "TrendsTV/1.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // Query repos created in the last week sorted by stars
            String url = "https://api.github.com/search/repositories"
                    + "?q=created:>2024-01-01&sort=stars&order=desc&per_page=25";

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode repos = root.path("items");

                for (JsonNode repo : repos) {
                    String name = repo.path("full_name").asText("");
                    String description = repo.path("description").asText("");
                    if (description.length() > 200) description = description.substring(0, 200) + "...";

                    String language = repo.path("language").asText("Code");
                    String ownerAvatar = repo.path("owner").path("avatar_url").asText("");
                    long stars = repo.path("stargazers_count").asLong(0);

                    TrendItem item = new TrendItem(
                        "gh_" + repo.path("id").asText(),
                        name + (description.isBlank() ? "" : " — " + description),
                        description,
                        repo.path("html_url").asText(""),
                        ownerAvatar,
                        "GitHub",
                        "github",
                        "Technology",
                        stars,
                        repo.path("forks_count").asInt(0)
                    );
                    items.add(item);
                }
            }
        } catch (Exception e) {
            // Return empty on failure
        }
        return items;
    }
}
