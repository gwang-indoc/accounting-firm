package com.gwhaitech.accountingfirm.contact.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("dev")
class ContactSecurityTest {

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "dummy");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "dummy");
        registry.add("app.jwt.secret", () -> "dummy-jwt-secret-that-is-at-least-32-characters-long");
        registry.add("app.storage.upload-dir", () -> "/tmp/test-uploads");
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void unauthenticatedPostIsPermitted() {
        var headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        String body = """
            {"name":"Alice","email":"alice@example.com","subject":"Hello","message":"World","companyUrl":""}
        """;
        ResponseEntity<Void> response = restTemplate.postForEntity(
            "/api/contact",
            new org.springframework.http.HttpEntity<>(body, headers),
            Void.class);
        // Desired: not 401. Before SecurityConfig fix, will be 401 -> RED.
        assertNotEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void unauthenticatedGetIsRejected() {
        ResponseEntity<Void> response = restTemplate.exchange(
            "/api/contact", HttpMethod.GET, null, Void.class);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
