package com.currencyx.dto;

/**
 * @param flag flag-icons country/region code, or null when the currency has no single representative flag
 */
public record CurrencyDto(String code, String name, String symbol, String flag, boolean popular) {
}
