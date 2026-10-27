package com.currencyx.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import com.currencyx.dto.ChangeResponse;
import com.currencyx.dto.CompareResponse;
import com.currencyx.dto.HistoryResponse;
import com.currencyx.dto.RatePoint;
import com.currencyx.entity.RateSnapshot;
import com.currencyx.entity.SnapshotSource;
import com.currencyx.exception.ApiException;
import com.currencyx.repository.RateSnapshotRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds chart series from stored snapshots only. A point exists for a date only when both
 * currencies of a pair were observed on that date; gaps are left as gaps, never filled in.
 */
@Service
@Transactional(readOnly = true)
public class HistoryService {

    static final int MAX_COMPARE = 5;
    /** How far back to look for the two most recent observations of a pair. */
    private static final int CHANGE_LOOKBACK_DAYS = 45;

    private final RateSnapshotRepository repository;
    private final RateService rateService;
    private final Clock clock;

    public HistoryService(RateSnapshotRepository repository, RateService rateService, Clock clock) {
        this.repository = repository;
        this.rateService = rateService;
        this.clock = clock;
    }

    public HistoryResponse history(String rawFrom, String rawTo, String rawPeriod) {
        String from = rateService.requireSupported(rawFrom, "from");
        String to = rateService.requireSupported(rawTo, "to");
        Period period = Period.parse(rawPeriod);
        LocalDate end = today();
        LocalDate start = end.minusDays(period.days());

        List<RatePoint> points = series(loadGrid(Set.of(from, to), start, end), from, to, false);
        int demo = (int) points.stream().filter(p -> SnapshotSource.DEMO.name().equals(p.source())).count();
        return new HistoryResponse(from, to, period.label(), start, end, points, points.size() - demo, demo);
    }

    public CompareResponse compare(String rawBase, String rawSymbols, String rawPeriod) {
        String base = rateService.requireSupported(rawBase, "base");
        Period period = Period.parse(rawPeriod);
        if (rawSymbols == null || rawSymbols.isBlank()) {
            throw ApiException.badRequest("INVALID_SYMBOLS", "Choose at least one currency to compare.");
        }
        Set<String> symbols = new LinkedHashSet<>();
        for (String raw : rawSymbols.split(",")) {
            if (!raw.isBlank()) {
                String code = rateService.requireSupported(raw, "symbols");
                if (!code.equals(base)) {
                    symbols.add(code);
                }
            }
        }
        if (symbols.isEmpty() || symbols.size() > MAX_COMPARE) {
            throw ApiException.badRequest("INVALID_SYMBOLS",
                    "Compare between 1 and " + MAX_COMPARE + " currencies other than the base currency.");
        }

        LocalDate end = today();
        LocalDate start = end.minusDays(period.days());
        Set<String> codes = new LinkedHashSet<>(symbols);
        codes.add(base);
        TreeMap<LocalDate, Map<String, RateSnapshot>> grid = loadGrid(codes, start, end);

        boolean demo = false;
        List<CompareResponse.Series> series = new ArrayList<>();
        for (String symbol : symbols) {
            List<RatePoint> points = series(grid, base, symbol, true);
            demo |= points.stream().anyMatch(p -> SnapshotSource.DEMO.name().equals(p.source()));
            BigDecimal startRate = points.isEmpty() ? null : points.getFirst().rate();
            BigDecimal endRate = points.isEmpty() ? null : points.getLast().rate();
            BigDecimal change = points.size() < 2 ? null : RateMath.percentChange(startRate, endRate);
            series.add(new CompareResponse.Series(symbol, points, startRate, endRate, change));
        }
        return new CompareResponse(base, period.label(), start, end, series, demo);
    }

    public ChangeResponse change(String rawFrom, String rawTo) {
        String from = rateService.requireSupported(rawFrom, "from");
        String to = rateService.requireSupported(rawTo, "to");
        LocalDate end = today();
        List<RatePoint> points = series(loadGrid(Set.of(from, to), end.minusDays(CHANGE_LOOKBACK_DAYS), end), from, to, false);
        String basis = "DAILY_OBSERVATION";

        if (points.isEmpty()) {
            return new ChangeResponse(from, to, null, null, null, null, null, null, basis,
                    "No stored observations for this pair yet. Movement appears once daily rates have been collected.");
        }
        RatePoint latest = points.getLast();
        if (points.size() == 1) {
            return new ChangeResponse(from, to, null, latest, null, null, null, null, basis,
                    "Only one observation is stored so far. Movement appears after the next daily update.");
        }
        RatePoint previous = points.get(points.size() - 2);
        BigDecimal absolute = latest.rate().subtract(previous.rate());
        BigDecimal percent = RateMath.percentChange(previous.rate(), latest.rate());
        String direction = switch (absolute.signum()) {
            case 1 -> "UP";
            case -1 -> "DOWN";
            default -> "FLAT";
        };
        long days = ChronoUnit.DAYS.between(previous.date(), latest.date());
        String note = SnapshotSource.DEMO.name().equals(previous.source()) || SnapshotSource.DEMO.name().equals(latest.source())
                ? "Includes demo data that is not a real market observation."
                : null;
        return new ChangeResponse(from, to, previous, latest, RateMath.roundRate(absolute), percent,
                direction, days, basis, note);
    }

    private TreeMap<LocalDate, Map<String, RateSnapshot>> loadGrid(Set<String> codes, LocalDate start, LocalDate end) {
        List<RateSnapshot> rows = repository.findByBaseCurrencyAndTargetCurrencyInAndEffectiveDateBetweenOrderByEffectiveDateAsc(
                rateService.storageBase(), codes, start, end);
        TreeMap<LocalDate, Map<String, RateSnapshot>> grid = new TreeMap<>();
        for (RateSnapshot row : rows) {
            grid.computeIfAbsent(row.getEffectiveDate(), d -> new HashMap<>()).put(row.getTargetCurrency(), row);
        }
        return grid;
    }

    private static List<RatePoint> series(TreeMap<LocalDate, Map<String, RateSnapshot>> grid,
                                          String from, String to, boolean withChange) {
        List<RatePoint> points = new ArrayList<>();
        BigDecimal first = null;
        for (Map.Entry<LocalDate, Map<String, RateSnapshot>> day : grid.entrySet()) {
            RateSnapshot source = day.getValue().get(from);
            RateSnapshot target = day.getValue().get(to);
            if (source == null || target == null) {
                continue;
            }
            BigDecimal rate = RateMath.roundRate(RateMath.crossRate(source.getRate(), target.getRate()));
            if (first == null) {
                first = rate;
            }
            boolean demo = source.getSource() == SnapshotSource.DEMO || target.getSource() == SnapshotSource.DEMO;
            points.add(new RatePoint(day.getKey(), rate,
                    withChange ? RateMath.percentChange(first, rate) : null,
                    demo ? SnapshotSource.DEMO.name() : SnapshotSource.PROVIDER.name()));
        }
        return points;
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
