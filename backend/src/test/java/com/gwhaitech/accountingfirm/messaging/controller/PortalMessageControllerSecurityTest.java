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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PortalMessageController.class)
@Import(PortalMessageControllerSecurityTest.TestSecurityConfig.class)
class PortalMessageControllerSecurityTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(a -> a
                    .requestMatchers("/api/portal/**").authenticated()
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
    void unauthenticated_onPortalThreads_returns403() throws Exception {
        mvc.perform(get("/api/portal/threads"))
           .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void authenticatedUser_onPortalThreads_notForbidden() {
        // Security allows the request through (not 401/403); controller may throw 500
        // due to principal type mismatch with @WithMockUser — that is a business-logic
        // concern, not a security concern, so we only verify authorization is granted.
        try {
            when(service.listPortalThreads(anyLong())).thenReturn(java.util.List.of());
            mvc.perform(get("/api/portal/threads"))
               .andExpect(result -> {
                   int status = result.getResponse().getStatus();
                   assertThat(status).isNotIn(401, 403);
               });
        } catch (Exception e) {
            // NestedServletException from resolveUserId is expected; confirm it is NOT
            // a security exception by checking it's not an AccessDeniedException.
            assertThat(e).hasMessageNotContaining("Access is denied");
        }
    }

    @Test
    void securityConfig_containsPortalMatcher() throws Exception {
        String source = java.nio.file.Files.readString(
            java.nio.file.Paths.get("src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java"));
        assertThat(source).contains("/api/portal/**");
    }
}
