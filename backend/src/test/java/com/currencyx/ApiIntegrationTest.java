package com.currencyx;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import com.currencyx.client.ProviderException;
import com.currencyx.repository.RateSnapshotRepository;
import com.currencyx.service.RateService;
import com.currencyx.service.SnapshotStore;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * End-to-end tests through the HTTP layer with an in-memory H2 database, a stub provider and a
 * controllable clock. Each test gets a fresh context: at startup the stub publishes USD-based
 * rates for 2026-10-20 and the clock reads 2026-10-20T12:00Z.
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ApiIntegrationTest {

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        StubRateProvider stubRateProvider() {
            return new StubRateProvider();
        }

        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(Instant.parse("2026-10-20T12:00:00Z"));
        }
    }

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private StubRateProvider provider;
    @Autowired
    private MutableClock clock;
    @Autowired
    private RateSnapshotRepository repository;
    @Autowired
    private SnapshotStore store;
    @Autowired
    private RateService rateService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void convertsBetweenCrossCurrencies() throws Exception {
        mvc.perform(get("/api/convert").param("from", "eur").param("to", "INR").param("amount", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("EUR"))
                .andExpect(jsonPath("$.to").value("INR"))
                .andExpect(jsonPath("$.result").value(9076.08695652))
                .andExpect(jsonPath("$.rate").value(90.7608695652))
                .andExpect(jsonPath("$.freshness.status").value("CURRENT"))
                .andExpect(jsonPath("$.freshness.provider").value("Stub provider"))
                .andExpect(jsonPath("$.freshness.providerUpdated").value(notNullValue()));
    }

    @Test
    void swappedPairReversesTheConversion() throws Exception {
        mvc.perform(get("/api/convert").param("from", "INR").param("to", "EUR").param("amount", "9076.08695652"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(100.0))
                .andExpect(jsonPath("$.rate").value(0.0110179641))
                .andExpect(jsonPath("$.inverseRate").value(90.7608695652));
    }

    @Test
    void rejectsInvalidInput() throws Exception {
        mvc.perform(get("/api/convert").param("from", "USD").param("to", "EUR").param("amount", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AMOUNT"));
        mvc.perform(get("/api/convert").param("from", "USD").param("to", "XYZ").param("amount", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_CURRENCY"));
        mvc.perform(get("/api/convert").param("from", "US").param("to", "EUR").param("amount", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CURRENCY"));
        mvc.perform(get("/api/convert").param("from", "USD").param("to", "EUR"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_PARAMETER"));
        mvc.perform(get("/api/history").param("from", "USD").param("to", "EUR").param("period", "5Y"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PERIOD"));
    }

    @Test
    void listsSupportedCurrenciesWithPopularFirst() throws Exception {
        mvc.perform(get("/api/currencies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].code").value("USD"))
                .andExpect(jsonPath("$[0].name").value("US Dollar"))
                .andExpect(jsonPath("$[0].popular").value(true));
    }

    @Test
    void latestRatesCanBeRebased() throws Exception {
        mvc.perform(get("/api/rates/latest").param("base", "EUR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.base").value("EUR"))
                .andExpect(jsonPath("$.rates.EUR").value(1.0))
                .andExpect(jsonPath("$.rates.USD").value(1.0869565217));
    }

    @Test
    void doesNotCallProviderAgainBeforeItsNextUpdate() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(get("/api/convert").param("from", "USD").param("to", "GBP").param("amount", "10"))
                    .andExpect(status().isOk());
        }
        assertThat(provider.calls()).isEqualTo(1);
    }

    @Test
    void storesEachProviderPublicationOnce() {
        assertThat(repository.count()).isEqualTo(5);
        boolean written = store.saveProviderRates(provider.fetchLatest("USD"));
        assertThat(written).isFalse();
        assertThat(repository.count()).isEqualTo(5);
    }

    @Test
    void buildsHistoryAndDailyChangeFromStoredObservations() throws Exception {
        publishNextDay("0.95");

        mvc.perform(get("/api/history").param("from", "USD").param("to", "EUR").param("period", "1W"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points", hasSize(2)))
                .andExpect(jsonPath("$.points[0].date").value("2026-10-20"))
                .andExpect(jsonPath("$.points[0].rate").value(0.92))
                .andExpect(jsonPath("$.points[1].rate").value(0.95))
                .andExpect(jsonPath("$.points[1].source").value("PROVIDER"))
                .andExpect(jsonPath("$.realObservations").value(2))
                .andExpect(jsonPath("$.demoObservations").value(0));

        mvc.perform(get("/api/analytics/change").param("from", "USD").param("to", "EUR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previous.rate").value(0.92))
                .andExpect(jsonPath("$.latest.rate").value(0.95))
                .andExpect(jsonPath("$.absoluteChange").value(0.03))
                .andExpect(jsonPath("$.percentChange").value(3.2609))
                .andExpect(jsonPath("$.direction").value("UP"))
                .andExpect(jsonPath("$.daysBetween").value(1))
                .andExpect(jsonPath("$.basis").value("DAILY_OBSERVATION"));
    }

    @Test
    void changeExplainsWhenOnlyOneObservationExists() throws Exception {
        mvc.perform(get("/api/analytics/change").param("from", "USD").param("to", "EUR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latest.rate").value(0.92))
                .andExpect(jsonPath("$.previous").doesNotExist())
                .andExpect(jsonPath("$.percentChange").doesNotExist())
                .andExpect(jsonPath("$.note").value(notNullValue()));
    }

    @Test
    void comparesSeveralCurrenciesAgainstOneBase() throws Exception {
        publishNextDay("0.95");

        mvc.perform(get("/api/analytics/compare").param("base", "USD").param("symbols", "EUR,INR").param("period", "1M"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.series", hasSize(2)))
                .andExpect(jsonPath("$.series[0].code").value("EUR"))
                .andExpect(jsonPath("$.series[0].points", hasSize(2)))
                .andExpect(jsonPath("$.series[0].changePct").value(3.2609))
                .andExpect(jsonPath("$.series[1].changePct").value(0.0))
                .andExpect(jsonPath("$.containsDemoData").value(false));

        mvc.perform(get("/api/analytics/compare").param("base", "USD").param("symbols", "USD"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SYMBOLS"));
    }

    @Test
    void servesPreviousDataMarkedStaleWhenProviderFails() throws Exception {
        clock.advance(Duration.ofDays(2));
        provider.fail(new ProviderException(ProviderException.Reason.QUOTA_EXCEEDED, "Provider request quota reached"));

        mvc.perform(get("/api/convert").param("from", "USD").param("to", "INR").param("amount", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(167.0))
                .andExpect(jsonPath("$.freshness.status").value("STALE"))
                .andExpect(jsonPath("$.freshness.notice").value(notNullValue()));
        assertThat(rateService.lastError()).contains("Provider request quota reached");
    }

    @Test
    void reportsStatus() throws Exception {
        mvc.perform(get("/api/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageBase").value("USD"))
                .andExpect(jsonPath("$.realObservationDays").value(1))
                .andExpect(jsonPath("$.latestRealDate").value("2026-10-20"))
                .andExpect(jsonPath("$.demoDataPresent").value(false));
    }

    private void publishNextDay(String eurRate) throws Exception {
        Map<String, BigDecimal> next = new HashMap<>(StubRateProvider.DEFAULT_RATES);
        next.put("EUR", new BigDecimal(eurRate));
        provider.publish(next, Instant.parse("2026-10-21T00:00:00Z"), Instant.parse("2026-10-22T00:00:00Z"));
        clock.advance(Duration.ofDays(1));
        mvc.perform(get("/api/rates/latest")).andExpect(status().isOk());
    }
}
