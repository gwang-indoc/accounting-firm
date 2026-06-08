package com.gwhaitech.accountingfirm.auth.service;

import jakarta.servlet.http.Cookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtCookieHelper {

    private final boolean secure;
    private final int expirationSeconds;

    public JwtCookieHelper(
            @Value("${app.cookie.secure:true}") boolean secure,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.secure = secure;
        this.expirationSeconds = (int) (expirationMs / 1000);
    }

    public Cookie buildJwtCookie(String value, int maxAge) {
        Cookie cookie = new Cookie("jwt", value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setSecure(secure);
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        return cookie;
    }

    public Cookie buildJwtCookie(String value) {
        return buildJwtCookie(value, expirationSeconds);
    }

    public Cookie clearJwtCookie() {
        return buildJwtCookie("", 0);
    }
}
