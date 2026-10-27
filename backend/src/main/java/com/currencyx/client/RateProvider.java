package com.currencyx.client;

/**
 * Source of the latest exchange rates. Implementations must return validated data
 * or throw {@link ProviderException}; they must never return partial or guessed values.
 */
public interface RateProvider {

    ProviderRates fetchLatest(String baseCurrency);

    /** Human-readable provider name shown as the data source in the UI. */
    String name();

    /** Short description of the access mode, e.g. "open access" or "API key". */
    String mode();
}
