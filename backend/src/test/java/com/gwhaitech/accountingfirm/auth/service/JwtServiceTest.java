package com.gwhaitech.accountingfirm.auth.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        JwtConfig config = new JwtConfig();
        // 64+ char secret for HS256 (512 bits)
        config.setSecret("test-secret-key-that-is-long-enough-for-hs256-algorithm-test-pad");
        config.setExpirationMs(86400000L);

        jwtService = new JwtService(config);

        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setName("Test User");
        testUser.setGoogleSub("google-sub-123");
        testUser.setRole("USER");
    }

    @Test
    void issueToken_producesParseableJwt() {
        String token = jwtService.issueToken(testUser);

        assertThat(token).isNotBlank();

        // Verify it can be parsed back
        Claims claims = jwtService.validateToken(token);
        assertThat(claims.getSubject()).isEqualTo("1");
    }

    @Test
    void validateToken_returnsClaims() {
        String token = jwtService.issueToken(testUser);
        Claims claims = jwtService.validateToken(token);

        assertThat(claims.getSubject()).isEqualTo(testUser.getId().toString());
        assertThat(claims.get("role", String.class)).isEqualTo(testUser.getRole());
    }

    @Test
    void validateToken_expiredTokenThrows() {
        JwtConfig expiredConfig = new JwtConfig();
        expiredConfig.setSecret("test-secret-key-that-is-long-enough-for-hs256-algorithm-test-pad");
        expiredConfig.setExpirationMs(-1L);

        JwtService expiredJwtService = new JwtService(expiredConfig);
        String expiredToken = expiredJwtService.issueToken(testUser);

        assertThatThrownBy(() -> jwtService.validateToken(expiredToken))
                .isInstanceOf(JwtException.class);
    }
}
