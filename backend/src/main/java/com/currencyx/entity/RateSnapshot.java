package com.currencyx.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One observed rate: 1 unit of {@code baseCurrency} = {@code rate} units of {@code targetCurrency},
 * effective on {@code effectiveDate} (the provider's update date, in UTC).
 */
@Entity
@Table(name = "rate_snapshot",
        uniqueConstraints = @UniqueConstraint(name = "uk_snapshot_pair_date",
                columnNames = {"base_currency", "target_currency", "effective_date"}),
        indexes = @Index(name = "idx_snapshot_base_date", columnList = "base_currency, effective_date"))
public class RateSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "base_currency", length = 3, nullable = false)
    private String baseCurrency;

    @Column(name = "target_currency", length = 3, nullable = false)
    private String targetCurrency;

    @Column(name = "rate", precision = 28, scale = 12, nullable = false)
    private BigDecimal rate;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    // Plain TIMESTAMP columns holding UTC values (hibernate.jdbc.time_zone=UTC), matching SnapshotWriter.
    @JdbcTypeCode(SqlTypes.TIMESTAMP)
    @Column(name = "provider_updated_at", nullable = false)
    private Instant providerUpdatedAt;

    @JdbcTypeCode(SqlTypes.TIMESTAMP)
    @Column(name = "retrieved_at", nullable = false)
    private Instant retrievedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 16, nullable = false)
    private SnapshotSource source;

    protected RateSnapshot() {
    }

    public Long getId() {
        return id;
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    public String getTargetCurrency() {
        return targetCurrency;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public Instant getProviderUpdatedAt() {
        return providerUpdatedAt;
    }

    public Instant getRetrievedAt() {
        return retrievedAt;
    }

    public SnapshotSource getSource() {
        return source;
    }
}
