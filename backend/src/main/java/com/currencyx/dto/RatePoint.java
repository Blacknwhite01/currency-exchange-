package com.currencyx.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One stored observation of a pair.
 *
 * @param changePct percentage change from the first point in the series (only set for comparisons)
 * @param source    PROVIDER for real observations, DEMO for synthetic demo data
 */
public record RatePoint(LocalDate date, BigDecimal rate, BigDecimal changePct, String source) {
}
