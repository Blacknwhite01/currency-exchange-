package com.currencyx.repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;

import com.currencyx.entity.SnapshotSource;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Bulk writes for {@code rate_snapshot}. Plain JDBC batching is used because a single provider
 * response contains ~160 rows and demo seeding inserts tens of thousands, which JPA identity
 * generation cannot batch. All statements are parameterised.
 */
@Repository
public class SnapshotWriter {

    private static final String INSERT = "insert into rate_snapshot "
            + "(base_currency, target_currency, rate, effective_date, provider_updated_at, retrieved_at, source) "
            + "values (?, ?, ?, ?, ?, ?, ?)";
    private static final int BATCH_SIZE = 1000;

    public record Row(String base, String target, BigDecimal rate, LocalDate effectiveDate,
                      Instant providerUpdatedAt, Instant retrievedAt, SnapshotSource source) {
    }

    private final JdbcTemplate jdbc;

    public SnapshotWriter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insertAll(List<Row> rows) {
        Calendar utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        jdbc.batchUpdate(INSERT, rows, BATCH_SIZE, (ps, row) -> {
            ps.setString(1, row.base());
            ps.setString(2, row.target());
            ps.setBigDecimal(3, row.rate());
            ps.setObject(4, row.effectiveDate());
            ps.setTimestamp(5, Timestamp.from(row.providerUpdatedAt()), utc);
            ps.setTimestamp(6, Timestamp.from(row.retrievedAt()), utc);
            ps.setString(7, row.source().name());
        });
    }

    public int deleteForDate(String base, LocalDate effectiveDate) {
        return jdbc.update("delete from rate_snapshot where base_currency = ? and effective_date = ?",
                base, effectiveDate);
    }

    public int deleteBySource(SnapshotSource source) {
        return jdbc.update("delete from rate_snapshot where source = ?", source.name());
    }
}
