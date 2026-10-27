package com.currencyx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class RateMathTest {

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    @Test
    void convertsFromBaseCurrency() {
        // 100 USD -> INR where USD=1, INR=83.5
        assertThat(RateMath.convert(bd("100"), bd("1"), bd("83.5"))).isEqualByComparingTo("8350");
    }

    @Test
    void convertsBetweenTwoNonBaseCurrencies() {
        // amount × target ÷ source: 100 EUR -> INR with EUR=0.92, INR=83.5
        BigDecimal result = RateMath.convert(bd("100"), bd("0.92"), bd("83.5"));
        assertThat(RateMath.roundAmount(result)).isEqualByComparingTo("9076.08695652");
    }

    @Test
    void convertingToSameCurrencyReturnsAmount() {
        assertThat(RateMath.convert(bd("12.34"), bd("0.79"), bd("0.79"))).isEqualByComparingTo("12.34");
    }

    @Test
    void swappingPairProducesReciprocalRate() {
        BigDecimal forward = RateMath.crossRate(bd("0.92"), bd("83.5"));
        BigDecimal backward = RateMath.crossRate(bd("83.5"), bd("0.92"));
        assertThat(RateMath.roundRate(forward.multiply(backward))).isEqualByComparingTo("1");
    }

    @Test
    void roundTripConversionKeepsPrecision() {
        BigDecimal there = RateMath.convert(bd("1000"), bd("1.0"), bd("0.333333"));
        BigDecimal back = RateMath.convert(there, bd("0.333333"), bd("1.0"));
        assertThat(RateMath.roundAmount(back)).isEqualByComparingTo("1000");
    }

    @Test
    void avoidsBinaryFloatingPointErrors() {
        // 0.1 + 0.2 style errors must not appear: 0.3 × 3 ÷ 1 = 0.9 exactly
        assertThat(RateMath.convert(bd("0.3"), bd("1"), bd("3"))).isEqualByComparingTo("0.9");
    }

    @Test
    void rejectsNonPositiveRates() {
        assertThatThrownBy(() -> RateMath.convert(bd("1"), bd("0"), bd("2")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> RateMath.crossRate(bd("1"), bd("-2")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void percentChangeFollowsFormula() {
        assertThat(RateMath.percentChange(bd("80"), bd("84"))).isEqualByComparingTo("5");
        assertThat(RateMath.percentChange(bd("84"), bd("80"))).isEqualByComparingTo("-4.7619");
    }

    @Test
    void percentChangeIsNullWithoutUsablePreviousRate() {
        assertThat(RateMath.percentChange(null, bd("1"))).isNull();
        assertThat(RateMath.percentChange(BigDecimal.ZERO, bd("1"))).isNull();
    }
}
