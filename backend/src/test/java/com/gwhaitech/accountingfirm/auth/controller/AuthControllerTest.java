package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtCookieHelper;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import(AuthControllerTest.TestSecurityConfig.class)
class AuthControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/oauth2/**", "/login/oauth2/**", "/api/auth/**").permitAll()
                    .requestMatchers("/api/**").authenticated()
                    .anyRequest().denyAll()
                )
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, e) ->
                        res.sendError(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED))
                );
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    // These mocks satisfy JwtAuthFilter's constructor so it can be wired in context
    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private JwtCookieHelper jwtCookieHelper;

    @BeforeEach
    void setUpCookieMocks() {
        when(jwtCookieHelper.clearJwtCookie()).thenReturn(new Cookie("jwt", "") {{
            setMaxAge(0); setHttpOnly(true); setPath("/");
        }});
        when(jwtCookieHelper.buildJwtCookie(any(String.class))).thenAnswer(inv -> {
            Cookie c = new Cookie("jwt", inv.getArgument(0));
            c.setHttpOnly(true); c.setPath("/"); c.setMaxAge(86400);
            return c;
        });
    }

    private User testUser() {
        User user = new User();
        user.setId(1L); user.setEmail("test@example.com");
        user.setName("Test User"); user.setRole("USER");
        return user;
    }

    @Test
    void authenticatedUser_getMe_returns200WithUserDto() throws Exception {
        User user = testUser();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            user, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        mockMvc.perform(get("/api/auth/me")
                .with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void unauthenticated_getMe_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_clearsCookieAndReturns200() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                .with(user("test@example.com").roles("USER")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("jwt=")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Max-Age=0")));
    }

    @Test
    void register_endpointRemoved_returns404() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"fullName":"Alice","email":"alice@example.com",
                         "password":"secret123","confirmPassword":"secret123"}
                        """))
                .andExpect(status().isNotFound());
    }

    @Test
    void login_endpointRemoved_returns404() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"test@example.com","password":"secret123"}
                        """))
                .andExpect(status().isNotFound());
    }
}
