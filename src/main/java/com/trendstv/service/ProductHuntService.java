package com.trendstv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendstv.model.TrendItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductHuntService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${producthunt.token:}")
    private String token;

    @Autowired
    public ProductHuntService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<TrendItem> fetchTrending() {
        List<TrendItem> items = new ArrayList<>();
        if (token == null || token.isBlank()) return items;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String query = """
                {
                  "query": "{ posts(first: 20, order: VOTES) { edges { node { id name tagline url votesCount commentsCount thumbnail { url } topics { edges { node { name } } } } } } }"
                }
                """;

            HttpEntity<String> entity = new HttpEntity<>(query, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                "https://api.producthunt.com/v2/api/graphql",
                HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode edges = root.path("data").path("posts").path("edges");

                for (JsonNode edge : edges) {
                    JsonNode node = edge.path("node");
                    String name = node.path("name").asText("");
                    if (name.isBlank()) continue;

                    String thumbnailUrl = node.path("thumbnail").path("url").asText("");
                    String category = "Technology";
                    JsonNode topics = node.path("topics").path("edges");
                    if (topics.isArray() && topics.size() > 0) {
                        category = topics.get(0).path("node").path("name").asText("Technology");
                    }

                    TrendItem item = new TrendItem(
                        "ph_" + node.path("id").asText(),
                        name,
                        node.path("tagline").asText(""),
                        node.path("url").asText(""),
                        thumbnailUrl,
                        "Product Hunt",
                        "producthunt",
                        category,
                        node.path("votesCount").asLong(0),
                        node.path("commentsCount").asInt(0)
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
