package com.currencyx.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.currencyx.client.ProviderRates;
import com.currencyx.entity.RateSnapshot;
import com.currencyx.entity.SnapshotSource;
import com.currencyx.repository.RateSnapshotRepository;
import com.currencyx.repository.SnapshotWriter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persists provider responses as dated snapshots and reads the most recent stored set back. */
@Service
public class SnapshotStore {

    private static final Logger log = LoggerFactory.getLogger(SnapshotStore.class);

    private final RateSnapshotRepository repository;
    private final SnapshotWriter writer;

    public SnapshotStore(RateSnapshotRepository repository, SnapshotWriter writer) {
        this.repository = repository;
        this.writer = writer;
    }

    /**
     * Stores one observation per currency for the provider's effective date (derived from the
     * provider's own update timestamp, not the request time). Re-fetching the same publication is a
     * no-op; a newer publication on the same date replaces the earlier one, as does real data
     * replacing demo data for that date.
     *
     * @return true when rows were written
     */
    @Transactional
    public boolean saveProviderRates(ProviderRates rates) {
        LocalDate effectiveDate = LocalDate.ofInstant(rates.providerUpdated(), ZoneOffset.UTC);
        List<RateSnapshot> existing = repository.findByBaseCurrencyAndEffectiveDate(rates.baseCurrency(), effectiveDate);
        boolean alreadyStored = !existing.isEmpty() && existing.stream().allMatch(s ->
                s.getSource() == SnapshotSource.PROVIDER
                        && !s.getProviderUpdatedAt().isBefore(rates.providerUpdated()));
        if (alreadyStored) {
            return false;
        }

        writer.deleteForDate(rates.baseCurrency(), effectiveDate);
        List<SnapshotWriter.Row> rows = rates.rates().entrySet().stream()
                .map(e -> new SnapshotWriter.Row(rates.baseCurrency(), e.getKey(), e.getValue(), effectiveDate,
                        rates.providerUpdated(), rates.retrievedAt(), SnapshotSource.PROVIDER))
                .toList();
        writer.insertAll(rows);
        log.info("Stored {} rate observations for {} (base {})", rows.size(), effectiveDate, rates.baseCurrency());
        return true;
    }

    /** The most recent real (non-demo) observations, used when the provider cannot be reached. */
    @Transactional(readOnly = true)
    public Optional<ProviderRates> latestStored(String base) {
        LocalDate latest = repository.findLatestDate(base, SnapshotSource.PROVIDER);
        if (latest == null) {
            return Optional.empty();
        }
        List<RateSnapshot> rows = repository.findByBaseCurrencyAndEffectiveDateAndSource(base, latest, SnapshotSource.PROVIDER);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Map<String, BigDecimal> rates = new HashMap<>();
        Instant updated = rows.getFirst().getProviderUpdatedAt();
        Instant retrieved = rows.getFirst().getRetrievedAt();
        for (RateSnapshot row : rows) {
            rates.put(row.getTargetCurrency(), row.getRate());
        }
        return Optional.of(new ProviderRates(base, Map.copyOf(rates), updated, null, retrieved));
    }
}
