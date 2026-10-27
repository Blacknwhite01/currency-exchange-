package com.currencyx.controller;

import com.currencyx.client.ProviderRates;
import com.currencyx.dto.StatusResponse;
import com.currencyx.entity.SnapshotSource;
import com.currencyx.repository.RateSnapshotRepository;
import com.currencyx.service.RateService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Data-freshness and collection status for the UI's freshness indicator. */
@RestController
@RequestMapping("/api")
public class StatusController {

    private final RateService rateService;
    private final RateSnapshotRepository repository;

    public StatusController(RateService rateService, RateSnapshotRepository repository) {
        this.rateService = rateService;
        this.repository = repository;
    }

    @GetMapping("/status")
    public StatusResponse status() {
        String base = rateService.storageBase();
        ProviderRates current = rateService.currentRates().orElse(null);
        return new StatusResponse(
                rateService.providerName(),
                rateService.providerMode(),
                base,
                rateService.lastSuccessfulFetch().orElse(null),
                current == null ? null : current.providerUpdated(),
                current == null ? null : current.nextUpdate(),
                rateService.lastError().orElse(null),
                rateService.lastErrorAt().orElse(null),
                repository.countDistinctDates(base, SnapshotSource.PROVIDER),
                repository.findEarliestDate(base, SnapshotSource.PROVIDER),
                repository.findLatestDate(base, SnapshotSource.PROVIDER),
                repository.existsBySource(SnapshotSource.DEMO));
    }
}
