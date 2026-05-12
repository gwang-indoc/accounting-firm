package com.gwhaitech.accountingfirm.contact.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    @Test
    void allowsUpToFiveSubmissionsFromSameIp() {
        RateLimiter limiter = new RateLimiter(5);
        for (int i = 0; i < 5; i++) {
            assertTrue(limiter.tryAcquire("1.2.3.4"), "Expected true on attempt " + (i + 1));
        }
        assertFalse(limiter.tryAcquire("1.2.3.4"), "Expected false on 6th attempt");
    }

    @Test
    void differentIpsHaveIndependentBuckets() {
        RateLimiter limiter = new RateLimiter(5);
        for (int i = 0; i < 5; i++) limiter.tryAcquire("1.2.3.4");
        assertTrue(limiter.tryAcquire("5.6.7.8"), "Different IP should not be rate-limited");
    }
}
