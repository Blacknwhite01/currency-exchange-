package com.currencyx.controller;

import java.util.List;

import com.currencyx.dto.ConversionResponse;
import com.currencyx.dto.CurrencyDto;
import com.currencyx.dto.LatestRatesResponse;
import com.currencyx.service.ConversionService;
import com.currencyx.service.CurrencyCatalog;
import com.currencyx.service.RateService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RateController {

    private final RateService rateService;
    private final ConversionService conversionService;
    private final CurrencyCatalog catalog;

    public RateController(RateService rateService, ConversionService conversionService, CurrencyCatalog catalog) {
        this.rateService = rateService;
        this.conversionService = conversionService;
        this.catalog = catalog;
    }

    /** Currencies present in the provider's latest data, with display metadata. */
    @GetMapping("/currencies")
    public List<CurrencyDto> currencies() {
        return catalog.describe(rateService.latest().rates().rates().keySet());
    }

    @GetMapping("/rates/latest")
    public LatestRatesResponse latest(@RequestParam(defaultValue = "USD") String base) {
        return conversionService.latest(base);
    }

    @GetMapping("/convert")
    public ConversionResponse convert(@RequestParam String from, @RequestParam String to,
                                      @RequestParam String amount) {
        return conversionService.convert(from, to, amount);
    }
}
