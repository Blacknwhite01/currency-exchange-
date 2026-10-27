package com.currencyx.dto;

import java.time.Instant;

public record ErrorResponse(int status, String code, String message, Instant timestamp) {
}
