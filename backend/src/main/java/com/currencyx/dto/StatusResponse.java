package com.currencyx.dto;

import java.time.Instant;
import java.time.LocalDate;

public record StatusResponse(
        String provider,
        String providerMode,
        String storageBase,
        Instant lastSuccessfulFetch,
        Instant providerUpdated,
        Instant nextUpdate,
        String lastError,
        Instant lastErrorAt,
        long realObservationDays,
        LocalDate earliestRealDate,
        LocalDate latestRealDate,
        boolean demoDataPresent) {
}
