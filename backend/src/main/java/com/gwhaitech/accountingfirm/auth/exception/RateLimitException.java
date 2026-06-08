package com.gwhaitech.accountingfirm.auth.exception;

public class RateLimitException extends RuntimeException {
    public RateLimitException(String reason) {
        super(reason);
    }
}
