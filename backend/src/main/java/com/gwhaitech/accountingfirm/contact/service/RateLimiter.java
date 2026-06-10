package com.gwhaitech.accountingfirm.contact.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimiter {

    private final int limit;
    private final ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>();

    public RateLimiter() {
        this.limit = 5;
    }

    RateLimiter(int limit) {
        this.limit = limit;
    }

    public boolean tryAcquire(String ip) {
        AtomicInteger count = counters.computeIfAbsent(ip, k -> new AtomicInteger(0));
        return count.incrementAndGet() <= limit;
    }

    @Scheduled(fixedRate = 3_600_000)
    public void reset() {
        counters.clear();
    }
}
