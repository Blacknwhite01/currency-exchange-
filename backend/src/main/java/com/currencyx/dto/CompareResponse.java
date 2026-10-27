package com.currencyx.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Comparison of several currencies against one base. Each series carries both raw rates and the
 * percentage change from its first observation so that currencies with very different magnitudes
 * can share one scale.
 */
public record CompareResponse(
        String base,
        String period,
        LocalDate startDate,
        LocalDate endDate,
        List<Series> series,
        boolean containsDemoData) {

    public record Series(String code, List<RatePoint> points, BigDecimal startRate, BigDecimal endRate,
                         BigDecimal changePct) {
    }
}
