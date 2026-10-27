package com.currencyx.dto;

import java.math.BigDecimal;

/**
 * @param result      converted amount, rounded to 8 decimal places; the UI applies currency-specific display rounding
 * @param rate        units of {@code to} per one unit of {@code from}
 * @param inverseRate units of {@code from} per one unit of {@code to}
 */
public record ConversionResponse(
        String from,
        String to,
        BigDecimal amount,
        BigDecimal result,
        BigDecimal rate,
        BigDecimal inverseRate,
        Freshness freshness) {
}
