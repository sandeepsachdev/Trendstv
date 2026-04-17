package com.trendstv.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class TrendsResponse {
    private List<TrendItem> items;
    private Map<String, Long> sourceCounts;
    private Instant lastUpdated;
    private int total;

    public TrendsResponse(List<TrendItem> items, Map<String, Long> sourceCounts, Instant lastUpdated) {
        this.items = items;
        this.sourceCounts = sourceCounts;
        this.lastUpdated = lastUpdated;
        this.total = items.size();
    }

    public List<TrendItem> getItems() { return items; }
    public Map<String, Long> getSourceCounts() { return sourceCounts; }
    public Instant getLastUpdated() { return lastUpdated; }
    public int getTotal() { return total; }
}
