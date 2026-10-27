package com.currencyx.dto;

import java.time.LocalDate;
import java.util.List;

public record HistoryResponse(
        String from,
        String to,
        String period,
        LocalDate startDate,
        LocalDate endDate,
        List<RatePoint> points,
        int realObservations,
        int demoObservations) {
}
