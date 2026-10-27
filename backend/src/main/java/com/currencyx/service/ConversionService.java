package com.currencyx.service;

import java.math.BigDecimal;
import java.util.Map;

import com.currencyx.dto.ConversionResponse;
import com.currencyx.dto.LatestRatesResponse;
import com.currencyx.exception.ApiException;

import org.springframework.stereotype.Service;

@Service
public class ConversionService {

    static final BigDecimal MAX_AMOUNT = new BigDecimal("1000000000000000");
    static final int MAX_DECIMALS = 8;

    private final RateService rateService;

    public ConversionService(RateService rateService) {
        this.rateService = rateService;
    }

    public LatestRatesResponse latest(String rawBase) {
        RateService.RatesView view = rateService.latest();
        String base = rateService.requireSupported(rawBase, "base");
        return new LatestRatesResponse(base, rateService.ratesFor(base, view), view.freshness());
    }

    public ConversionResponse convert(String rawFrom, String rawTo, String rawAmount) {
        BigDecimal amount = parseAmount(rawAmount);
        RateService.RatesView view = rateService.latest();
        String from = rateService.requireSupported(rawFrom, "from");
        String to = rateService.requireSupported(rawTo, "to");

        Map<String, BigDecimal> rates = view.rates().rates();
        BigDecimal sourceRate = rates.get(from);
        BigDecimal targetRate = rates.get(to);
        BigDecimal result = RateMath.convert(amount, sourceRate, targetRate);
        BigDecimal rate = RateMath.crossRate(sourceRate, targetRate);
        BigDecimal inverse = RateMath.crossRate(targetRate, sourceRate);

        return new ConversionResponse(from, to, amount, RateMath.roundAmount(result),
                RateMath.roundRate(rate), RateMath.roundRate(inverse), view.freshness());
    }

    static BigDecimal parseAmount(String raw) {
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("INVALID_AMOUNT", "Enter an amount to convert.");
        }
        BigDecimal amount;
        try {
            amount = new BigDecimal(raw.trim().replace(",", ""));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("INVALID_AMOUNT", "The amount must be a number, for example 100 or 25.50.");
        }
        if (amount.signum() <= 0) {
            throw ApiException.badRequest("INVALID_AMOUNT", "The amount must be greater than zero.");
        }
        if (amount.compareTo(MAX_AMOUNT) > 0) {
            throw ApiException.badRequest("INVALID_AMOUNT", "The amount is too large to convert.");
        }
        if (amount.stripTrailingZeros().scale() > MAX_DECIMALS) {
            throw ApiException.badRequest("INVALID_AMOUNT", "Use at most " + MAX_DECIMALS + " decimal places.");
        }
        return amount;
    }
}
