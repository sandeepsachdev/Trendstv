package com.trendstv.scheduler;

import com.trendstv.service.TrendingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TrendsRefreshScheduler {

    private final TrendingService trendingService;

    @Autowired
    public TrendsRefreshScheduler(TrendingService trendingService) {
        this.trendingService = trendingService;
    }

    @Scheduled(fixedRateString = "${trends.refresh.interval:600000}")
    public void refresh() {
        trendingService.refreshCache();
    }
}
