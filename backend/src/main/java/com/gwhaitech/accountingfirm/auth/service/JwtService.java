package com.gwhaitech.accountingfirm.auth.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(JwtConfig config) {
        byte[] keyBytes = config.getSecret() != null ? config.getSecret().getBytes(StandardCharsets.UTF_8) : new byte[0];
        if (keyBytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 bytes for HS256; got " + keyBytes.length);
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = config.getExpirationMs();
    }

    public String issueToken(User user) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("role", user.getRole())
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public int expirationSeconds() {
        return (int) (expirationMs / 1000);
    }

    public Claims validateToken(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
