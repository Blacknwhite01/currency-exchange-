package com.currencyx.dto;

import java.time.Instant;

/**
 * Describes how current the rate data in a response is.
 *
 * @param status          CURRENT when served within the provider's update cycle; STALE when a refresh
 *                        failed and older data (in memory or from the database) is being served instead
 * @param providerUpdated when the provider produced these rates
 * @param retrievedAt     when this application fetched them
 * @param nextUpdate      when the provider expects to publish new rates (null if unknown)
 * @param notice          human-readable explanation when status is STALE
 */
public record Freshness(
        String provider,
        String status,
        Instant providerUpdated,
        Instant retrievedAt,
        Instant nextUpdate,
        String notice) {
}
