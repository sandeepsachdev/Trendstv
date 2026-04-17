package com.trendstv.service;

import com.trendstv.model.TrendItem;
import com.trendstv.model.TrendsResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrendingService {

    private final RedditService redditService;
    private final GitHubTrendingService gitHubTrendingService;
    private final HackerNewsService hackerNewsService;
    private final ProductHuntService productHuntService;

    @Autowired
    public TrendingService(RedditService redditService,
                           GitHubTrendingService gitHubTrendingService,
                           HackerNewsService hackerNewsService,
                           ProductHuntService productHuntService) {
        this.redditService = redditService;
        this.gitHubTrendingService = gitHubTrendingService;
        this.hackerNewsService = hackerNewsService;
        this.productHuntService = productHuntService;
    }

    @Cacheable(value = "trends", key = "#source + '_' + #category")
    public TrendsResponse getTrends(String source, String category) {
        List<TrendItem> all = fetchAll();
        List<TrendItem> filtered = filterItems(all, source, category);

        Map<String, Long> sourceCounts = all.stream()
                .collect(Collectors.groupingBy(TrendItem::getSource, Collectors.counting()));

        return new TrendsResponse(filtered, sourceCounts, Instant.now());
    }

    @CacheEvict(value = "trends", allEntries = true)
    public void refreshCache() {}

    public List<TrendItem> fetchAll() {
        List<TrendItem> all = new ArrayList<>();
        try { all.addAll(redditService.fetchTrending()); } catch (Exception ignored) {}
        try { all.addAll(gitHubTrendingService.fetchTrending()); } catch (Exception ignored) {}
        try { all.addAll(hackerNewsService.fetchTrending()); } catch (Exception ignored) {}
        try { all.addAll(productHuntService.fetchTrending()); } catch (Exception ignored) {}

        all.sort(Comparator.comparingLong(TrendItem::getScore).reversed());
        return all;
    }

    private List<TrendItem> filterItems(List<TrendItem> items, String source, String category) {
        return items.stream()
                .filter(i -> source == null || source.isBlank() || source.equalsIgnoreCase(i.getSource()))
                .filter(i -> category == null || category.isBlank() || category.equalsIgnoreCase(i.getCategory()))
                .collect(Collectors.toList());
    }
}
