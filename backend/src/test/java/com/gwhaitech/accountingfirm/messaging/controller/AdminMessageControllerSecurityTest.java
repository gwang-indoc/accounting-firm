package com.gwhaitech.accountingfirm.messaging.controller;

import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.messaging.service.MessagingService;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminMessageController.class)
@Import(AdminMessageControllerSecurityTest.TestSecurityConfig.class)
class AdminMessageControllerSecurityTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(a -> a
                    .requestMatchers("/api/clients/*/threads", "/api/clients/*/threads/**", "/api/clients/unread-counts").hasRole("ADMIN")
                    .anyRequest().permitAll());
            return http.build();
        }
    }

    @MockitoBean
    JwtService jwtService;

    @MockitoBean
    UserRepository userRepository;

    @MockitoBean
    MessagingService service;

    @Autowired
    MockMvc mvc;

    @Test
    @WithMockUser(roles = "USER")
    void userRole_onListThreads_returns403() throws Exception {
        mvc.perform(get("/api/clients/7/threads")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userRole_onCreateThread_returns403() throws Exception {
        mvc.perform(post("/api/clients/7/threads")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userRole_onUnreadCounts_returns403() throws Exception {
        mvc.perform(get("/api/clients/unread-counts")).andExpect(status().isForbidden());
    }

    @Test
    void securityConfig_containsMessagingMatchers() throws Exception {
        String source = java.nio.file.Files.readString(
            java.nio.file.Paths.get("src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java"));
        assertThat(source).contains("/api/clients/*/threads/**");
        assertThat(source).contains("/api/clients/unread-counts");
    }
}
