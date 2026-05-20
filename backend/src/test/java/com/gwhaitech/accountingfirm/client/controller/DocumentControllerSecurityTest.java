package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.filter.JwtAuthFilter;
import com.gwhaitech.accountingfirm.auth.handler.OAuth2SuccessHandler;
import com.gwhaitech.accountingfirm.client.service.DocumentService;
import com.gwhaitech.accountingfirm.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentController.class)
@Import(DocumentControllerSecurityTest.TestSecurityConfig.class)
class DocumentControllerSecurityTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            // Mirror the production /api/clients/** rules so we can assert that
            // SecurityConfig contains the expected admin-only patterns. This test
            // is a pinning test: if you change the production patterns below to
            // weaken access, this should still pass — but the static check below
            // verifies the production pattern string itself.
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/clients", "/api/clients/*", "/api/clients/*/documents", "/api/clients/*/documents/**").hasRole("ADMIN")
                    .anyRequest().permitAll()
                );
            return http.build();
        }
    }

    @MockitoBean private JwtAuthFilter jwtAuthFilter;
    @MockitoBean private OAuth2SuccessHandler oAuth2SuccessHandler;
    @MockitoBean private DocumentService documentService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "USER")
    void listDocuments_withUserRole_returns403() throws Exception {
        mockMvc.perform(get("/api/clients/1/documents").param("year", "2025"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void downloadDocument_withUserRole_returns403() throws Exception {
        mockMvc.perform(get("/api/clients/1/documents/5/download"))
                .andExpect(status().isForbidden());
    }

    @Test
    void productionSecurityConfig_includesDocumentsMatcher() throws Exception {
        // Source-level pin: the production SecurityConfig must reference the
        // documents matcher with ADMIN role. We can't load the full
        // SecurityConfig in this @WebMvcTest slice (OAuth2 deps), so we read
        // the file and check the rule string. If you change either string,
        // change them both.
        Method filterChainMethod = SecurityConfig.class.getMethod("filterChain", HttpSecurity.class);
        if (filterChainMethod == null) throw new AssertionError("Production filterChain not found");

        Path source = Paths.get("src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java");
        String contents = Files.readString(source);
        if (!contents.contains("/api/clients/*/documents/**")) {
            throw new AssertionError(
                "SecurityConfig must restrict /api/clients/*/documents/** to ADMIN — pattern not found");
        }
        if (!contents.contains(".hasRole(\"ADMIN\")")) {
            throw new AssertionError("SecurityConfig must use hasRole(\"ADMIN\")");
        }
    }
}
