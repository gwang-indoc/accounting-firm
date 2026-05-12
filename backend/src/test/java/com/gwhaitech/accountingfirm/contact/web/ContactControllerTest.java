package com.gwhaitech.accountingfirm.contact.web;

import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.contact.service.ContactService;
import com.gwhaitech.accountingfirm.contact.service.RateLimiter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContactController.class)
@Import(ContactControllerTest.TestSecurityConfig.class)
class ContactControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private ContactService contactService;

    @MockitoBean
    private RateLimiter rateLimiter;

    @Test
    void validPostReturns202() throws Exception {
        when(rateLimiter.tryAcquire(anyString())).thenReturn(true);
        doNothing().when(contactService).submit(any(), anyString());

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Alice","email":"alice@example.com","subject":"Hello","message":"World","companyUrl":""}
                """))
            .andExpect(status().isAccepted());

        verify(contactService).submit(any(), anyString());
    }

    @Test
    void missingNameReturns400() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"alice@example.com","subject":"Hello","message":"World","companyUrl":""}
                """))
            .andExpect(status().isBadRequest());
        verify(contactService, never()).submit(any(), anyString());
    }

    @Test
    void invalidEmailReturns400() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Alice","email":"not-an-email","subject":"Hello","message":"World","companyUrl":""}
                """))
            .andExpect(status().isBadRequest());
    }

    @Test
    void subjectTooLongReturns400() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Alice\",\"email\":\"alice@example.com\",\"subject\":\""
                    + "x".repeat(201) + "\",\"message\":\"World\",\"companyUrl\":\"\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void messageTooLongReturns400() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Alice\",\"email\":\"alice@example.com\",\"subject\":\"Hello\",\"message\":\""
                    + "x".repeat(5001) + "\",\"companyUrl\":\"\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void honeypotFilledReturns200NotCalling202() throws Exception {
        when(rateLimiter.tryAcquire(anyString())).thenReturn(true);
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Alice","email":"alice@example.com","subject":"Hello","message":"World",
                     "companyUrl":"http://spam.example"}
                """))
            .andExpect(status().isOk());
        verify(contactService, never()).submit(any(), anyString());
        verify(rateLimiter, never()).tryAcquire(anyString());
    }

    @Test
    void rateLimitExceededReturns429() throws Exception {
        when(rateLimiter.tryAcquire(anyString())).thenReturn(false);
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Alice","email":"alice@example.com","subject":"Hello","message":"World","companyUrl":""}
                """))
            .andExpect(status().isTooManyRequests());
        verify(contactService, never()).submit(any(), anyString());
    }
}
