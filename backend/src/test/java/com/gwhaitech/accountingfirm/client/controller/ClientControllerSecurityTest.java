package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.filter.JwtAuthFilter;
import com.gwhaitech.accountingfirm.auth.handler.OAuth2SuccessHandler;
import com.gwhaitech.accountingfirm.client.service.ClientService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClientController.class)
@Import(ClientControllerSecurityTest.TestSecurityConfig.class)
class ClientControllerSecurityTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/clients", "/api/clients/*").hasRole("ADMIN")
                    .anyRequest().permitAll()
                );
            return http.build();
        }
    }

    @MockitoBean
    private JwtAuthFilter jwtAuthFilter;

    @MockitoBean
    private OAuth2SuccessHandler oAuth2SuccessHandler;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClientService clientService;

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
    void getClients_withUserRole_returns403() throws Exception {
        mockMvc.perform(get("/api/clients")
                .with(authentication(userAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    void getClients_withAdminRole_returns200() throws Exception {
        when(clientService.findAll(99L)).thenReturn(List.of());
        mockMvc.perform(get("/api/clients")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk());
    }
}
