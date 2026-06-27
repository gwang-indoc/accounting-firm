package com.gwhaitech.accountingfirm.client.exception;

public class EngagementNotFoundException extends RuntimeException {
    public EngagementNotFoundException(Long engagementId) {
        super("Engagement not found: " + engagementId);
    }
}
