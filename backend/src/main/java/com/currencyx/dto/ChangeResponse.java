package com.currencyx.dto;

import java.math.BigDecimal;

/**
 * Movement between the two most recent stored daily observations of a pair. This is a change between
 * daily observations, not an intraday market movement. Change fields are null when there is no usable
 * previous observation.
 *
 * @param direction UP, DOWN, FLAT, or null when it cannot be determined
 */
public record ChangeResponse(
        String from,
        String to,
        RatePoint previous,
        RatePoint latest,
        BigDecimal absoluteChange,
        BigDecimal percentChange,
        String direction,
        Long daysBetween,
        String basis,
        String note) {
}
