package com.currencyx.service;

import java.util.Arrays;

import com.currencyx.exception.ApiException;

/** Chart periods. Ranges are measured in calendar days back from today (UTC). */
public enum Period {
    ONE_DAY("1D", 1),
    ONE_WEEK("1W", 7),
    ONE_MONTH("1M", 30),
    ONE_YEAR("1Y", 365);

    private final String label;
    private final int days;

    Period(String label, int days) {
        this.label = label;
        this.days = days;
    }

    public String label() {
        return label;
    }

    public int days() {
        return days;
    }

    public static Period parse(String value) {
        if (value == null || value.isBlank()) {
            return ONE_MONTH;
        }
        return Arrays.stream(values())
                .filter(p -> p.label.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("INVALID_PERIOD",
                        "Period must be one of 1D, 1W, 1M or 1Y."));
    }
}
