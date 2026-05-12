package com.gwhaitech.accountingfirm.contact.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("dev")
class LoggingMailSenderTest {

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "dummy");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "dummy");
        registry.add("app.jwt.secret", () -> "dummy-jwt-secret-that-is-at-least-32-characters-long");
        registry.add("app.storage.upload-dir", () -> "/tmp/test-uploads");
    }

    @Autowired
    private JavaMailSender mailSender;

    @Test
    void devProfileUsesLoggingMailSender() {
        assertThat(mailSender).isInstanceOf(LoggingMailSender.class);
    }
}
