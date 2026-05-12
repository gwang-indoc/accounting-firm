package com.gwhaitech.accountingfirm.contact.web;

import com.gwhaitech.accountingfirm.contact.repository.ContactMessageRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ContactIntegrationTest {

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:postgresql://localhost:5432/accounting_firm");
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "dummy");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "dummy");
        registry.add("app.jwt.secret", () -> "dummy-jwt-secret-that-is-at-least-32-characters-long");
        registry.add("app.storage.upload-dir", () -> "/tmp/test-uploads");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @Test
    void fullHappyPath() throws Exception {
        long countBefore = contactMessageRepository.count();

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Alice","email":"alice@example.com","subject":"Hello","message":"World","companyUrl":""}
                """))
            .andExpect(status().isAccepted());

        long countAfter = contactMessageRepository.count();
        assertTrue(countAfter > countBefore, "Expected a new row in contact_messages");
    }
}
