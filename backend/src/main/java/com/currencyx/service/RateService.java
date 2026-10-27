package com.currencyx.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.regex.Pattern;

import com.currencyx.client.ProviderException;
import com.currencyx.client.ProviderRates;
import com.currencyx.client.RateProvider;
import com.currencyx.config.AppProperties;
import com.currencyx.dto.Freshness;
import com.currencyx.exception.ApiException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * Owns the latest known rates. Rates are fetched from the provider only when its published
 * next-update time has passed, so repeated user requests never trigger repeated external calls.
 * When a refresh fails, the previous valid data (in memory, else the newest stored snapshot) is
 * served and marked STALE rather than being replaced by anything invented.
 */
@Service
public class RateService {

    private static final Logger log = LoggerFactory.getLogger(RateService.class);
    private static final Pattern CODE = Pattern.compile("[A-Z]{3}");
    /** Used when the provider does not publish a next-update time. */
    private static final Duration DEFAULT_REFRESH = Duration.ofHours(1);
    /** Never call the provider more often than this, even if it reports an earlier next update. */
    private static final Duration MIN_FETCH_INTERVAL = Duration.ofMinutes(10);

    /** Rates expressed against the storage base, plus how fresh they are. */
    public record RatesView(ProviderRates rates, Freshness freshness) {
    }

    private final RateProvider provider;
    private final SnapshotStore store;
    private final Clock clock;
    private final String storageBase;
    private final Duration retryAfterFailure;

    private ProviderRates current;
    private boolean currentFromDatabase;
    private Instant lastSuccessfulFetch;
    private String lastError;
    private ProviderException.Reason lastErrorReason;
    private Instant lastErrorAt;

    public RateService(RateProvider provider, SnapshotStore store, Clock clock, AppProperties properties) {
        this.provider = provider;
        this.store = store;
        this.clock = clock;
        this.storageBase = properties.provider().storageBase();
        this.retryAfterFailure = properties.provider().retryAfterFailure();
    }

    public String storageBase() {
        return storageBase;
    }

    /** Latest rates against the storage base, refreshing from the provider first if due. */
    public synchronized RatesView latest() {
        refreshIfDue();
        if (current == null) {
            loadFromDatabase();
        }
        if (current == null) {
            if (lastErrorReason == ProviderException.Reason.QUOTA_EXCEEDED) {
                throw ApiException.unavailable("PROVIDER_QUOTA_EXCEEDED",
                        "The exchange-rate provider's request quota has been reached and no stored rates are available yet.");
            }
            throw ApiException.unavailable("RATES_UNAVAILABLE",
                    "Exchange rates are unavailable right now"
                            + (lastError != null ? " (" + lastError + ")" : "") + ". Please try again later.");
        }
        return new RatesView(current, freshness());
    }

    /** Latest rates re-expressed against {@code base}. */
    public Map<String, BigDecimal> ratesFor(String base, RatesView view) {
        Map<String, BigDecimal> stored = view.rates().rates();
        BigDecimal baseRate = stored.get(base);
        Map<String, BigDecimal> result = new TreeMap<>();
        stored.forEach((code, rate) -> result.put(code, RateMath.roundRate(RateMath.crossRate(baseRate, rate))));
        return result;
    }

    /** Fetches from the provider when the cached data has passed its next-update time. Safe to call often. */
    public synchronized void refreshIfDue() {
        Instant now = clock.instant();
        if (current != null && !currentFromDatabase && now.isBefore(dueAt(current))) {
            return;
        }
        if (lastErrorAt != null && now.isBefore(lastErrorAt.plus(retryAfterFailure))) {
            return;
        }
        try {
            ProviderRates fetched = provider.fetchLatest(storageBase);
            current = fetched;
            currentFromDatabase = false;
            lastSuccessfulFetch = now;
            lastError = null;
            lastErrorReason = null;
            lastErrorAt = null;
            persist(fetched);
        } catch (ProviderException e) {
            lastError = e.getMessage();
            lastErrorReason = e.getReason();
            lastErrorAt = now;
            log.warn("Rate refresh failed ({}): {}", e.getReason(), e.getMessage());
        }
    }

    /**
     * Normalises and validates a currency code. Codes are checked against the latest provider data
     * when it is available; otherwise only the format is checked.
     */
    public synchronized String requireSupported(String rawCode, String parameter) {
        String code = CurrencyCatalog.normalize(rawCode);
        if (!CODE.matcher(code).matches()) {
            throw ApiException.badRequest("INVALID_CURRENCY",
                    "'" + parameter + "' must be a three-letter currency code such as USD.");
        }
        if (current != null && !current.rates().containsKey(code)) {
            throw ApiException.badRequest("UNSUPPORTED_CURRENCY",
                    "Currency " + code + " is not supported by the current rate provider.");
        }
        return code;
    }

    public synchronized Optional<Instant> lastSuccessfulFetch() {
        return Optional.ofNullable(lastSuccessfulFetch);
    }

    public synchronized Optional<String> lastError() {
        return Optional.ofNullable(lastError);
    }

    public synchronized Optional<Instant> lastErrorAt() {
        return Optional.ofNullable(lastErrorAt);
    }

    public synchronized Optional<ProviderRates> currentRates() {
        return Optional.ofNullable(current);
    }

    public String providerName() {
        return provider.name();
    }

    public String providerMode() {
        return provider.mode();
    }

    private Instant dueAt(ProviderRates rates) {
        Instant next = rates.nextUpdate() != null ? rates.nextUpdate() : rates.retrievedAt().plus(DEFAULT_REFRESH);
        Instant earliestAllowed = rates.retrievedAt().plus(MIN_FETCH_INTERVAL);
        return next.isAfter(earliestAllowed) ? next : earliestAllowed;
    }

    private void persist(ProviderRates fetched) {
        try {
            store.saveProviderRates(fetched);
        } catch (DataAccessException e) {
            // Conversions can still be served from memory; history simply misses this observation.
            log.error("Could not store rate snapshot", e);
        }
    }

    private void loadFromDatabase() {
        try {
            store.latestStored(storageBase).ifPresent(stored -> {
                current = stored;
                currentFromDatabase = true;
            });
        } catch (DataAccessException e) {
            log.error("Could not read stored rates", e);
        }
    }

    private Freshness freshness() {
        boolean stale = currentFromDatabase || lastErrorAt != null;
        String notice = null;
        if (stale) {
            notice = "Could not refresh rates from the provider"
                    + (lastError != null ? " (" + lastError + ")" : "")
                    + ". Showing the most recent rates available, published "
                    + current.providerUpdated() + ".";
        }
        return new Freshness(provider.name(), stale ? "STALE" : "CURRENT", current.providerUpdated(),
                current.retrievedAt(), currentFromDatabase ? null : current.nextUpdate(), notice);
    }
}
