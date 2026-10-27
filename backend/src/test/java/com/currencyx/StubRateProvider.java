package com.currencyx;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import com.currencyx.client.ProviderException;
import com.currencyx.client.ProviderRates;
import com.currencyx.client.RateProvider;

/** Test double for the external provider: returns configurable rates or a configured failure. */
public class StubRateProvider implements RateProvider {

    public static final Map<String, BigDecimal> DEFAULT_RATES = Map.of(
            "USD", new BigDecimal("1"),
            "EUR", new BigDecimal("0.92"),
            "GBP", new BigDecimal("0.79"),
            "INR", new BigDecimal("83.5"),
            "JPY", new BigDecimal("150"));

    private Map<String, BigDecimal> rates = DEFAULT_RATES;
    private Instant providerUpdated = Instant.parse("2026-10-20T00:00:00Z");
    private Instant nextUpdate = Instant.parse("2026-10-21T00:00:00Z");
    private ProviderException failure;
    private int calls;

    @Override
    public synchronized ProviderRates fetchLatest(String baseCurrency) {
        calls++;
        if (failure != null) {
            throw failure;
        }
        return new ProviderRates(baseCurrency, rates, providerUpdated, nextUpdate, providerUpdated.plusSeconds(60));
    }

    @Override
    public String name() {
        return "Stub provider";
    }

    @Override
    public String mode() {
        return "test";
    }

    public synchronized void publish(Map<String, BigDecimal> rates, Instant updated, Instant next) {
        this.rates = rates;
        this.providerUpdated = updated;
        this.nextUpdate = next;
    }

    public synchronized void fail(ProviderException failure) {
        this.failure = failure;
    }

    public synchronized int calls() {
        return calls;
    }
}
