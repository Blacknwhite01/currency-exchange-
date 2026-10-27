package com.currencyx.controller;

import com.currencyx.dto.ChangeResponse;
import com.currencyx.dto.CompareResponse;
import com.currencyx.dto.HistoryResponse;
import com.currencyx.service.HistoryService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AnalyticsController {

    private final HistoryService historyService;

    public AnalyticsController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping("/history")
    public HistoryResponse history(@RequestParam String from, @RequestParam String to,
                                   @RequestParam(defaultValue = "1M") String period) {
        return historyService.history(from, to, period);
    }

    @GetMapping("/analytics/compare")
    public CompareResponse compare(@RequestParam String base, @RequestParam String symbols,
                                   @RequestParam(defaultValue = "1M") String period) {
        return historyService.compare(base, symbols, period);
    }

    @GetMapping("/analytics/change")
    public ChangeResponse change(@RequestParam String from, @RequestParam String to) {
        return historyService.change(from, to);
    }
}
