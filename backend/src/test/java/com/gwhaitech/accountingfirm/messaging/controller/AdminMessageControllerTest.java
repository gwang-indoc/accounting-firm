package com.gwhaitech.accountingfirm.messaging.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
import com.gwhaitech.accountingfirm.messaging.dto.*;
import com.gwhaitech.accountingfirm.messaging.service.MessagingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminMessageController.class)
@Import(AdminMessageControllerTest.TestSecurityConfig.class)
class AdminMessageControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(a -> a.anyRequest().permitAll());
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

    @Autowired
    ObjectMapper json;

    private UsernamePasswordAuthenticationToken adminAuth() {
        User u = new User();
        u.setId(42L);
        u.setEmail("admin@firm.com");
        u.setRole("ADMIN");
        return new UsernamePasswordAuthenticationToken(u, null,
            List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    @Test
    void listThreads_returnsOk() throws Exception {
        var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 2, 0, null, "preview");
        when(service.listAdminThreads(7L)).thenReturn(List.of(dto));
        mvc.perform(get("/api/clients/7/threads").with(authentication(adminAuth())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[0].id").value(50))
           .andExpect(jsonPath("$[0].subject").value("Tax"));
    }

    @Test
    void listThreads_includesClientUnreadCountAndLastSenderType() throws Exception {
        var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 2, 1, "ADMIN", "preview");
        when(service.listAdminThreads(7L)).thenReturn(List.of(dto));
        mvc.perform(get("/api/clients/7/threads").with(authentication(adminAuth())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[0].clientUnreadCount").value(1))
           .andExpect(jsonPath("$[0].lastSenderType").value("ADMIN"));
    }

    @Test
    void createThread_returns201() throws Exception {
        var resp = new MessageThreadDto(100L, 7L, "Tax", LocalDateTime.now(), LocalDateTime.now(), 0, 1, List.of());
        when(service.createThreadAsAdmin(eq(7L), eq("Tax"), eq("Hi"), anyLong())).thenReturn(resp);
        mvc.perform(post("/api/clients/7/threads")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new NewThreadRequest("Tax", "Hi"))))
           .andExpect(status().isCreated())
           .andExpect(jsonPath("$.id").value(100));
    }

    @Test
    void createThread_blankSubject_returns400() throws Exception {
        mvc.perform(post("/api/clients/7/threads")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"subject\":\"\",\"body\":\"x\"}"))
           .andExpect(status().isBadRequest());
    }

    @Test
    void getThread_returnsThread() throws Exception {
        var msg = new MessageDto(1L, 50L, SenderType.ADMIN, 42L, "hello", LocalDateTime.now());
        var resp = new MessageThreadDto(50L, 7L, "x", LocalDateTime.now(), LocalDateTime.now(), 0, 0, List.of(msg));
        when(service.getThreadAsAdmin(7L, 50L)).thenReturn(resp);
        mvc.perform(get("/api/clients/7/threads/50").with(authentication(adminAuth())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.id").value(50))
           .andExpect(jsonPath("$.messages[0].body").value("hello"));
    }

    @Test
    void postReply_returns201() throws Exception {
        var resp = new MessageDto(2L, 50L, SenderType.ADMIN, 42L, "follow-up", LocalDateTime.now());
        when(service.postAdminReply(eq(7L), eq(50L), eq("follow-up"), anyLong())).thenReturn(resp);
        mvc.perform(post("/api/clients/7/threads/50/messages")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new NewMessageRequest("follow-up"))))
           .andExpect(status().isCreated())
           .andExpect(jsonPath("$.body").value("follow-up"));
    }

    @Test
    void createThread_whenClientNotFound_returns404() throws Exception {
        when(service.createThreadAsAdmin(anyLong(), anyString(), anyString(), anyLong()))
            .thenThrow(new com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException(99L));
        mvc.perform(post("/api/clients/99/threads")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new NewThreadRequest("x", "y"))))
           .andExpect(status().isNotFound());
    }

    @Test
    void unreadCounts_returnsOk() throws Exception {
        when(service.getAdminUnreadCounts()).thenReturn(List.of(new ClientUnreadCountDto(7L, 3L)));
        mvc.perform(get("/api/clients/unread-counts").with(authentication(adminAuth())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[0].clientId").value(7))
           .andExpect(jsonPath("$[0].unreadCount").value(3));
    }
}
