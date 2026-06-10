package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
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

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserLookupController.class)
@Import(UserLookupControllerTest.TestSecurityConfig.class)
class UserLookupControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    JwtService jwtService;

    @MockitoBean
    UserRepository userRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void returnsNameWhenEmailFound() throws Exception {
        User user = new User();
        user.setEmail("jane@example.com");
        user.setName("Jane Smith");
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/admin/users/lookup").param("email", "jane@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Jane Smith"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void returns404WhenEmailNotFound() throws Exception {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/admin/users/lookup").param("email", "unknown@example.com"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void returns403ForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/users/lookup").param("email", "any@example.com"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void returns400WhenEmailParamMissing() throws Exception {
        mockMvc.perform(get("/api/admin/users/lookup"))
                .andExpect(status().isBadRequest());
    }
}
