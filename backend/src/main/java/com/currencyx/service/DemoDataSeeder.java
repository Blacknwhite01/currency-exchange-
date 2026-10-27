package com.currencyx.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Set;

import com.currencyx.config.AppProperties;
import com.currencyx.entity.RateSnapshot;
import com.currencyx.entity.SnapshotSource;
import com.currencyx.repository.RateSnapshotRepository;
import com.currencyx.repository.SnapshotWriter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds synthetic history so charts can be demonstrated before real observations have accumulated.
 * Demo rows are generated only for dates before the first real observation, are stored with
 * source=DEMO, and are flagged in every API response and in the UI. Disabling the demo setting
 * removes them on the next start.
 */
@Service
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    /** Currencies pegged or tightly managed; they get a much smaller simulated daily movement. */
    private static final Set<String> PEGGED = Set.of(
            "AED", "SAR", "HKD", "BHD", "OMR", "QAR", "JOD", "PAB", "BMD", "BSD", "BBD", "BZD", "XCD",
            "AWG", "ANG", "XCG", "DJF", "KYD", "CUP", "ERN", "BAM", "BGN", "DKK", "FOK", "XAF", "XOF",
            "XPF", "KMF", "CVE", "STN", "NAD", "LSL", "SZL", "BTN", "GGP", "IMP", "JEP", "FKP", "GIP",
            "SHP", "TVD", "KID", "CLF", "CNH", "MOP");
    private static final Set<String> MAJOR = Set.of(
            "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "SEK", "NOK", "CNY", "SGD", "INR");

    private final AppProperties.Demo config;
    private final String storageBase;
    private final RateSnapshotRepository repository;
    private final SnapshotWriter writer;
    private final Clock clock;

    public DemoDataSeeder(AppProperties properties, RateSnapshotRepository repository, SnapshotWriter writer, Clock clock) {
        this.config = properties.demo();
        this.storageBase = properties.provider().storageBase();
        this.repository = repository;
        this.writer = writer;
        this.clock = clock;
    }

    /** Seeds demo history when enabled and absent; removes it when disabled. */
    @Transactional
    public void reconcile() {
        boolean present = repository.existsBySource(SnapshotSource.DEMO);
        if (!config.enabled()) {
            if (present) {
                log.info("Demo data disabled: removed {} demo rows", writer.deleteBySource(SnapshotSource.DEMO));
            }
            return;
        }
        if (present) {
            return;
        }
        LocalDate anchorDate = repository.findEarliestDate(storageBase, SnapshotSource.PROVIDER);
        if (anchorDate == null) {
            log.info("Demo data not seeded yet: it is anchored to the first real observation, which is not stored yet");
            return;
        }
        List<RateSnapshot> anchor = repository.findByBaseCurrencyAndEffectiveDateAndSource(
                storageBase, anchorDate, SnapshotSource.PROVIDER);
        List<SnapshotWriter.Row> rows = generate(anchor, anchorDate, config.days(), clock.instant());
        writer.insertAll(rows);
        log.info("Seeded {} demo rows covering {} days before {}", rows.size(), config.days(), anchorDate);
    }

    /**
     * Walks each currency backwards from its first real rate with a deterministic, mean-reverting
     * random walk. The output is plausible-looking but explicitly not market data.
     */
    static List<SnapshotWriter.Row> generate(List<RateSnapshot> anchor, LocalDate anchorDate, int days, Instant now) {
        MathContext precision = new MathContext(12);
        List<SnapshotWriter.Row> rows = new ArrayList<>(anchor.size() * days);
        for (RateSnapshot start : anchor) {
            String code = start.getTargetCurrency();
            double anchorRate = start.getRate().doubleValue();
            boolean isBase = code.equals(start.getBaseCurrency());
            double volatility = PEGGED.contains(code) ? 0.0003 : MAJOR.contains(code) ? 0.0045 : 0.007;
            Random random = new Random(code.hashCode() * 31L + anchorDate.toEpochDay());

            double value = anchorRate;
            for (int back = 1; back <= days; back++) {
                if (!isBase) {
                    double reversion = -0.02 * Math.log(value / anchorRate);
                    value = value * Math.exp(volatility * random.nextGaussian() + reversion);
                }
                LocalDate date = anchorDate.minusDays(back);
                rows.add(new SnapshotWriter.Row(start.getBaseCurrency(), code,
                        new BigDecimal(value, precision), date,
                        date.atStartOfDay().toInstant(ZoneOffset.UTC), now, SnapshotSource.DEMO));
            }
        }
        return rows;
    }
}
