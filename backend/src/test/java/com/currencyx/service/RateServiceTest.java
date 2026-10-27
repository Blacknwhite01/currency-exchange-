package com.currencyx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import com.currencyx.MutableClock;
import com.currencyx.StubRateProvider;
import com.currencyx.client.ProviderException;
import com.currencyx.client.ProviderRates;
import com.currencyx.config.AppProperties;
import com.currencyx.exception.ApiException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateServiceTest {

    /** Store with no database behind it. */
    static class EmptyStore extends SnapshotStore {
        EmptyStore() {
            super(null, null);
        }

        @Override
        public boolean saveProviderRates(ProviderRates rates) {
            return true;
        }

        @Override
        public Optional<ProviderRates> latestStored(String base) {
            return Optional.empty();
        }
    }

    private StubRateProvider provider;
    private MutableClock clock;
    private RateService service;

    @BeforeEach
    void setUp() {
        provider = new StubRateProvider();
        clock = new MutableClock(Instant.parse("2026-10-20T12:00:00Z"));
        AppProperties properties = new AppProperties(
                new AppProperties.Provider(null, null, null, Duration.ofSeconds(5), "USD", Duration.ofMinutes(5)),
                null, null, null);
        service = new RateService(provider, new EmptyStore(), clock, properties);
    }

    @Test
    void failsClearlyWhenNoDataExistsAnywhere() {
        provider.fail(new ProviderException(ProviderException.Reason.QUOTA_EXCEEDED, "quota"));
        assertThatThrownBy(service::latest)
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("PROVIDER_QUOTA_EXCEEDED");
    }

    @Test
    void waitsBeforeRetryingAfterFailure() {
        provider.fail(new ProviderException(ProviderException.Reason.UNAVAILABLE, "down"));
        service.refreshIfDue();
        service.refreshIfDue();
        assertThat(provider.calls()).isEqualTo(1);

        clock.advance(Duration.ofMinutes(6));
        service.refreshIfDue();
        assertThat(provider.calls()).isEqualTo(2);
    }

    @Test
    void refetchesOnlyAfterProviderNextUpdate() {
        service.latest();
        clock.advance(Duration.ofHours(6));
        service.latest();
        assertThat(provider.calls()).isEqualTo(1);

        clock.advance(Duration.ofHours(7)); // past 2026-10-21T00:00Z
        service.latest();
        assertThat(provider.calls()).isEqualTo(2);
    }
}
