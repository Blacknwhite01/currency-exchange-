package com.currencyx.client;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;

import com.currencyx.client.ProviderException.Reason;
import com.currencyx.config.AppProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Client for ExchangeRate-API. Uses the keyed v6 endpoint when an API key is configured,
 * otherwise the keyless open-access endpoint. The API key never leaves the backend and is
 * never written to logs or error messages.
 */
@Component
public class ExchangeRateApiClient implements RateProvider {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateApiClient.class);
    private static final Pattern CURRENCY_CODE = Pattern.compile("[A-Z]{3}");

    private final AppProperties.Provider config;
    private final RestClient restClient;

    public ExchangeRateApiClient(AppProperties properties) {
        this.config = properties.provider();
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(config.timeout()).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(config.timeout());
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public String name() {
        return "ExchangeRate-API";
    }

    @Override
    public String mode() {
        return config.hasApiKey() ? "API key" : "open access";
    }

    @Override
    public ProviderRates fetchLatest(String baseCurrency) {
        if (!CURRENCY_CODE.matcher(baseCurrency).matches()) {
            throw new ProviderException(Reason.UNSUPPORTED_CURRENCY, "Invalid base currency: " + baseCurrency);
        }
        String url = config.hasApiKey()
                ? config.keyedBaseUrl() + "/" + config.apiKey().trim() + "/latest/" + baseCurrency
                : config.openBaseUrl() + "/latest/" + baseCurrency;

        ApiResponse body;
        try {
            body = restClient.get().uri(url).exchange((request, response) -> {
                if (response.getStatusCode().value() == 429) {
                    throw new ProviderException(Reason.QUOTA_EXCEEDED, "Provider rate limit reached");
                }
                return response.bodyTo(ApiResponse.class);
            });
        } catch (ProviderException e) {
            throw e;
        } catch (ResourceAccessException e) {
            throw new ProviderException(Reason.UNAVAILABLE, "Exchange-rate provider could not be reached", e);
        } catch (RestClientException e) {
            throw new ProviderException(Reason.INVALID_RESPONSE, "Exchange-rate provider returned an unreadable response", e);
        }
        return validate(body, baseCurrency);
    }

    private ProviderRates validate(ApiResponse body, String requestedBase) {
        if (body == null) {
            throw new ProviderException(Reason.INVALID_RESPONSE, "Empty response from provider");
        }
        if (!"success".equalsIgnoreCase(body.result())) {
            throw mapError(body.errorType());
        }
        if (!requestedBase.equals(body.baseCode())) {
            throw new ProviderException(Reason.INVALID_RESPONSE,
                    "Provider returned base " + body.baseCode() + " instead of " + requestedBase);
        }
        if (body.lastUpdateUnix() == null || body.lastUpdateUnix() <= 0) {
            throw new ProviderException(Reason.INVALID_RESPONSE, "Provider response has no update timestamp");
        }
        Map<String, BigDecimal> source = body.conversionRates() != null ? body.conversionRates() : body.rates();
        if (source == null || source.isEmpty()) {
            throw new ProviderException(Reason.INVALID_RESPONSE, "Provider response contains no rates");
        }

        Map<String, BigDecimal> clean = new TreeMap<>();
        source.forEach((code, rate) -> {
            if (code != null && CURRENCY_CODE.matcher(code).matches() && rate != null && rate.signum() > 0) {
                clean.put(code, rate);
            } else {
                log.warn("Ignoring invalid provider entry {}={}", code, rate);
            }
        });
        if (!clean.containsKey(requestedBase)) {
            clean.put(requestedBase, BigDecimal.ONE);
        }

        Instant next = body.nextUpdateUnix() != null && body.nextUpdateUnix() > 0
                ? Instant.ofEpochSecond(body.nextUpdateUnix())
                : null;
        return new ProviderRates(requestedBase, Map.copyOf(clean),
                Instant.ofEpochSecond(body.lastUpdateUnix()), next, Instant.now());
    }

    private ProviderException mapError(String errorType) {
        String type = errorType == null ? "unknown" : errorType;
        return switch (type) {
            case "quota-reached" -> new ProviderException(Reason.QUOTA_EXCEEDED, "Provider request quota reached");
            case "invalid-key", "inactive-account" ->
                    new ProviderException(Reason.INVALID_KEY, "Provider rejected the configured API key");
            case "unsupported-code" -> new ProviderException(Reason.UNSUPPORTED_CURRENCY, "Provider does not support this currency");
            default -> new ProviderException(Reason.INVALID_RESPONSE, "Provider returned an error: " + type);
        };
    }

    /** Covers both the keyed ("conversion_rates") and open-access ("rates") response shapes. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record ApiResponse(
            @JsonProperty("result") String result,
            @JsonProperty("error-type") String errorType,
            @JsonProperty("base_code") String baseCode,
            @JsonProperty("time_last_update_unix") Long lastUpdateUnix,
            @JsonProperty("time_next_update_unix") Long nextUpdateUnix,
            @JsonProperty("rates") Map<String, BigDecimal> rates,
            @JsonProperty("conversion_rates") Map<String, BigDecimal> conversionRates) {
    }
}
