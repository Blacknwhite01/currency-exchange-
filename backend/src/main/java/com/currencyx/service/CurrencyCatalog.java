package com.currencyx.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.currencyx.dto.CurrencyDto;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Display metadata (names, symbols, flags) for currency codes. Which currencies are actually
 * supported is decided by the provider's latest response, not by this catalog.
 */
@Component
public class CurrencyCatalog {

    public static final List<String> POPULAR = List.of(
            "USD", "EUR", "GBP", "JPY", "INR", "CNY", "AUD", "CAD", "CHF", "SGD", "AED");

    private record Meta(String name, String symbol, String flag) {
    }

    private final Map<String, Meta> metadata = new LinkedHashMap<>();

    public CurrencyCatalog() {
        ClassPathResource resource = new ClassPathResource("currencies.csv");
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }
                String[] parts = line.split("\\|", -1);
                String flag = parts[3].isBlank() ? null : parts[3].trim();
                metadata.put(parts[0].trim(), new Meta(parts[1].trim(), parts[2].trim(), flag));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not load currencies.csv", e);
        }
    }

    /** Builds display entries for the given supported codes: popular currencies first, then alphabetical. */
    public List<CurrencyDto> describe(Collection<String> supportedCodes) {
        List<CurrencyDto> result = new ArrayList<>();
        for (String code : supportedCodes) {
            Meta meta = metadata.get(code);
            result.add(meta == null
                    ? new CurrencyDto(code, code, code, null, false)
                    : new CurrencyDto(code, meta.name(), meta.symbol(), meta.flag(), POPULAR.contains(code)));
        }
        result.sort(Comparator
                .comparingInt((CurrencyDto c) -> c.popular() ? POPULAR.indexOf(c.code()) : Integer.MAX_VALUE)
                .thenComparing(CurrencyDto::code));
        return result;
    }

    public static String normalize(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }
}
