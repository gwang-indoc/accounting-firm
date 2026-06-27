package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.ClientEngagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({ClientEngagementController.class, AdminEngagementController.class})
@Import(ClientEngagementSecurityTest.TestSecurityConfig.class)
class ClientEngagementSecurityTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().permitAll()
                )
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, e) -> res.sendError(HttpStatus.UNAUTHORIZED.value()))
                );
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClientEngagementService engagementService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    private static Authentication adminAuth() {
        User admin = new User();
        admin.setId(99L);
        admin.setEmail("admin@test.com");
        admin.setName("Admin");
        return new UsernamePasswordAuthenticationToken(admin, null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private static Authentication userAuth() {
        return new UsernamePasswordAuthenticationToken("user@test.com", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void listEngagements_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/clients/10/engagements"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listEngagements_nonAdmin_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/clients/10/engagements")
                .with(authentication(userAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAllEngagements_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/admin/engagements"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllEngagements_nonAdmin_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/engagements")
                .with(authentication(userAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    void listEngagements_admin_returns200() throws Exception {
        when(engagementService.listForClient(eq(10L), any())).thenReturn(List.of());
        mockMvc.perform(get("/api/admin/clients/10/engagements")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk());
    }
}
