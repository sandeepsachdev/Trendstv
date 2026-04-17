package com.trendstv.model;

public class RssFeedSource {
    private final String name;
    private final String url;
    private final String region;   // e.g. "Australia", "UK", "Global"

    public RssFeedSource(String name, String url, String region) {
        this.name   = name;
        this.url    = url;
        this.region = region;
    }

    public String getName()   { return name; }
    public String getUrl()    { return url; }
    public String getRegion() { return region; }
}
