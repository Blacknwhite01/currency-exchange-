package com.currencyx.client;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * A validated set of rates from the provider.
 *
 * @param baseCurrency    currency every rate is expressed against
 * @param rates           units of each currency per one unit of the base
 * @param providerUpdated when the provider says these rates were produced
 * @param nextUpdate      when the provider expects to publish new rates (may be null)
 * @param retrievedAt     when this application received the response
 */
public record ProviderRates(
        String baseCurrency,
        Map<String, BigDecimal> rates,
        Instant providerUpdated,
        Instant nextUpdate,
        Instant retrievedAt) {
}
