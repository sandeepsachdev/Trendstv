package com.trendstv.controller;

import com.trendstv.model.TrendsResponse;
import com.trendstv.service.TrendingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
public class TrendsController {

    private final TrendingService trendingService;

    @Autowired
    public TrendsController(TrendingService trendingService) {
        this.trendingService = trendingService;
    }

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/api/trends")
    @ResponseBody
    public ResponseEntity<TrendsResponse> getTrends(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String category) {
        TrendsResponse response = trendingService.getTrends(source, category);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/trends/refresh")
    @ResponseBody
    public ResponseEntity<String> refresh() {
        trendingService.refreshCache();
        return ResponseEntity.ok("Cache cleared");
    }
}
