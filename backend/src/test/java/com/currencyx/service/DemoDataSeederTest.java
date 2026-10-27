package com.currencyx.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.currencyx.entity.RateSnapshot;
import com.currencyx.entity.SnapshotSource;
import com.currencyx.repository.SnapshotWriter;

import org.junit.jupiter.api.Test;

class DemoDataSeederTest {

    private static RateSnapshot snapshot(String target, String rate) throws Exception {
        Constructor<RateSnapshot> constructor = RateSnapshot.class.getDeclaredConstructor();
        constructor.setAccessible(true);
        RateSnapshot s = constructor.newInstance();
        set(s, "baseCurrency", "USD");
        set(s, "targetCurrency", target);
        set(s, "rate", new BigDecimal(rate));
        return s;
    }

    private static void set(Object target, String field, Object value) throws Exception {
        Field f = RateSnapshot.class.getDeclaredField(field);
        f.setAccessible(true);
        f.set(target, value);
    }

    @Test
    void generatesLabelledHistoryOnlyBeforeFirstRealObservation() throws Exception {
        LocalDate anchor = LocalDate.of(2026, 10, 20);
        List<SnapshotWriter.Row> rows = DemoDataSeeder.generate(
                List.of(snapshot("USD", "1"), snapshot("EUR", "0.92")), anchor, 30, Instant.now());

        assertThat(rows).hasSize(60);
        assertThat(rows).allMatch(r -> r.source() == SnapshotSource.DEMO);
        assertThat(rows).allMatch(r -> r.effectiveDate().isBefore(anchor));
        assertThat(rows).filteredOn(r -> r.target().equals("USD"))
                .allMatch(r -> r.rate().compareTo(BigDecimal.ONE) == 0);
        assertThat(rows).filteredOn(r -> r.target().equals("EUR"))
                .allMatch(r -> r.rate().doubleValue() > 0.75 && r.rate().doubleValue() < 1.1);
    }

    @Test
    void isDeterministic() throws Exception {
        LocalDate anchor = LocalDate.of(2026, 10, 20);
        List<RateSnapshot> start = List.of(snapshot("INR", "83.5"));
        Instant now = Instant.parse("2026-10-20T00:00:00Z");
        assertThat(DemoDataSeeder.generate(start, anchor, 10, now))
                .isEqualTo(DemoDataSeeder.generate(start, anchor, 10, now));
    }
}
