package com.currencyx.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Provider provider, Refresh refresh, Demo demo, Cors cors) {

    public record Provider(
            String apiKey,
            String keyedBaseUrl,
            String openBaseUrl,
            Duration timeout,
            String storageBase,
            Duration retryAfterFailure) {

        public boolean hasApiKey() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public record Refresh(String cron) {
    }

    public record Demo(boolean enabled, int days) {
    }

    public record Cors(List<String> allowedOrigins) {
    }
}
