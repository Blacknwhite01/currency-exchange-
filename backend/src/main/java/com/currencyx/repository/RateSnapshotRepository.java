package com.currencyx.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import com.currencyx.entity.RateSnapshot;
import com.currencyx.entity.SnapshotSource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RateSnapshotRepository extends JpaRepository<RateSnapshot, Long> {

    List<RateSnapshot> findByBaseCurrencyAndTargetCurrencyInAndEffectiveDateBetweenOrderByEffectiveDateAsc(
            String baseCurrency, Collection<String> targets, LocalDate from, LocalDate to);

    List<RateSnapshot> findByBaseCurrencyAndEffectiveDateAndSource(
            String baseCurrency, LocalDate effectiveDate, SnapshotSource source);

    List<RateSnapshot> findByBaseCurrencyAndEffectiveDate(String baseCurrency, LocalDate effectiveDate);

    @Query("select max(s.effectiveDate) from RateSnapshot s where s.baseCurrency = :base and s.source = :source")
    LocalDate findLatestDate(@Param("base") String base, @Param("source") SnapshotSource source);

    @Query("select min(s.effectiveDate) from RateSnapshot s where s.baseCurrency = :base and s.source = :source")
    LocalDate findEarliestDate(@Param("base") String base, @Param("source") SnapshotSource source);

    @Query("select count(distinct s.effectiveDate) from RateSnapshot s where s.baseCurrency = :base and s.source = :source")
    long countDistinctDates(@Param("base") String base, @Param("source") SnapshotSource source);

    boolean existsBySource(SnapshotSource source);
}
