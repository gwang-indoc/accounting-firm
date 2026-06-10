package com.gwhaitech.accountingfirm.contact.service;

import jakarta.servlet.http.HttpServletRequest;

public class ClientIpResolver {

    private ClientIpResolver() {}

    /**
     * Returns the TCP-level remote address. X-Forwarded-For is intentionally ignored:
     * single-instance deployment with no reverse proxy; spoofed headers must not affect rate limiting.
     */
    public static String resolve(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
