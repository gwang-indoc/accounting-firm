package com.gwhaitech.accountingfirm.contact.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class ClientIpResolverTest {

    @Test
    void returnsRemoteAddrIgnoringXForwardedFor() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("5.6.7.8");
        when(request.getHeader("X-Forwarded-For")).thenReturn("1.1.1.1");

        assertEquals("5.6.7.8", ClientIpResolver.resolve(request));
    }
}
