package com.currencyx.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.currencyx.exception.ApiException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class AmountValidationTest {

    @Test
    void acceptsPlainAndGroupedNumbers() {
        assertThat(ConversionService.parseAmount("100")).isEqualByComparingTo("100");
        assertThat(ConversionService.parseAmount(" 1,250.75 ")).isEqualByComparingTo("1250.75");
        assertThat(ConversionService.parseAmount("0.00000001")).isEqualByComparingTo("0.00000001");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  ", "abc", "-5", "0", "1e400", "12.123456789", "10000000000000000"})
    void rejectsInvalidAmounts(String raw) {
        assertThatThrownBy(() -> ConversionService.parseAmount(raw))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("INVALID_AMOUNT");
    }
}
