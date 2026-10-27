package com.currencyx.dto;

import java.math.BigDecimal;
import java.util.Map;

public record LatestRatesResponse(String base, Map<String, BigDecimal> rates, Freshness freshness) {
}
