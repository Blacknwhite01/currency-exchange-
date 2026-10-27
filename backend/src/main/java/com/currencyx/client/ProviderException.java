package com.currencyx.client;

public class ProviderException extends RuntimeException {

    public enum Reason {
        UNAVAILABLE,
        QUOTA_EXCEEDED,
        INVALID_KEY,
        UNSUPPORTED_CURRENCY,
        INVALID_RESPONSE
    }

    private final Reason reason;

    public ProviderException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public ProviderException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
