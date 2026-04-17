package com.trendstv.model;

import java.time.Instant;

public class TrendItem {
    private String id;
    private String title;
    private String description;
    private String url;
    private String imageUrl;
    private String source;
    private String sourceIcon;
    private String category;
    private long score;
    private int commentCount;
    private Instant fetchedAt;

    public TrendItem() {}

    public TrendItem(String id, String title, String description, String url,
                     String imageUrl, String source, String sourceIcon,
                     String category, long score, int commentCount) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.url = url;
        this.imageUrl = imageUrl;
        this.source = source;
        this.sourceIcon = sourceIcon;
        this.category = category;
        this.score = score;
        this.commentCount = commentCount;
        this.fetchedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getSourceIcon() { return sourceIcon; }
    public void setSourceIcon(String sourceIcon) { this.sourceIcon = sourceIcon; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public long getScore() { return score; }
    public void setScore(long score) { this.score = score; }
    public int getCommentCount() { return commentCount; }
    public void setCommentCount(int commentCount) { this.commentCount = commentCount; }
    public Instant getFetchedAt() { return fetchedAt; }
    public void setFetchedAt(Instant fetchedAt) { this.fetchedAt = fetchedAt; }
}
