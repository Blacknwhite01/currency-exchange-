package com.currencyx.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Decimal-safe exchange-rate arithmetic. Intermediate results keep 34 significant digits
 * (DECIMAL128); rounding to a fixed scale only happens at the API boundary.
 */
public final class RateMath {

    public static final MathContext CALC = MathContext.DECIMAL128;
    /** Scale used for rates returned by the API. */
    public static final int RATE_SCALE = 10;
    /** Scale used for converted amounts returned by the API. */
    public static final int AMOUNT_SCALE = 8;
    public static final int PERCENT_SCALE = 4;

    private RateMath() {
    }

    /**
     * Converted amount = amount × targetRate ÷ sourceRate, where both rates are quoted
     * against the same common base currency.
     */
    public static BigDecimal convert(BigDecimal amount, BigDecimal sourceRate, BigDecimal targetRate) {
        requirePositive(sourceRate, "sourceRate");
        requirePositive(targetRate, "targetRate");
        return amount.multiply(targetRate, CALC).divide(sourceRate, CALC);
    }

    /** Units of target per one unit of source, from two rates quoted against a common base. */
    public static BigDecimal crossRate(BigDecimal sourceRate, BigDecimal targetRate) {
        requirePositive(sourceRate, "sourceRate");
        requirePositive(targetRate, "targetRate");
        return targetRate.divide(sourceRate, CALC);
    }

    /**
     * Percentage change = ((latest − previous) ÷ previous) × 100.
     *
     * @return null when previous is missing or zero, so callers never show a misleading percentage
     */
    public static BigDecimal percentChange(BigDecimal previous, BigDecimal latest) {
        if (previous == null || latest == null || previous.signum() == 0) {
            return null;
        }
        return latest.subtract(previous, CALC)
                .divide(previous, CALC)
                .multiply(BigDecimal.valueOf(100), CALC)
                .setScale(PERCENT_SCALE, RoundingMode.HALF_EVEN);
    }

    public static BigDecimal roundRate(BigDecimal value) {
        return value.setScale(RATE_SCALE, RoundingMode.HALF_EVEN);
    }

    public static BigDecimal roundAmount(BigDecimal value) {
        return value.setScale(AMOUNT_SCALE, RoundingMode.HALF_EVEN);
    }

    private static void requirePositive(BigDecimal value, String name) {
        if (value == null || value.signum() <= 0) {
            throw new IllegalArgumentException(name + " must be a positive number");
        }
    }
}
