package com.gwhaitech.accountingfirm.client.exception;

public class EngagementNotFoundException extends RuntimeException {
    public EngagementNotFoundException(Long clientId, int taxYear) {
        super("Engagement not found for client " + clientId + " tax year " + taxYear);
    }
}
