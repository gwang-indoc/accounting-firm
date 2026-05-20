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
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PortalMessageController.class)
@Import(PortalMessageControllerTest.TestSecurityConfig.class)
class PortalMessageControllerTest {

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

    private UsernamePasswordAuthenticationToken portalUser() {
        User u = new User(); u.setId(99L); u.setEmail("client@x.com"); u.setRole("USER");
        return new UsernamePasswordAuthenticationToken(u, null,
            List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void listMyThreads_returnsOk() throws Exception {
        when(service.listPortalThreads(99L)).thenReturn(
            List.of(new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 1, "preview")));
        mvc.perform(get("/api/portal/threads").with(authentication(portalUser())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[0].id").value(50));
    }

    @Test
    void createThread_returns201() throws Exception {
        var resp = new MessageThreadDto(200L, 7L, "Q", LocalDateTime.now(), LocalDateTime.now(), 1, 0, List.of());
        when(service.createThreadAsClient(eq(99L), eq("Q"), eq("hello"))).thenReturn(resp);
        mvc.perform(post("/api/portal/threads")
                .with(authentication(portalUser()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new NewThreadRequest("Q", "hello"))))
           .andExpect(status().isCreated())
           .andExpect(jsonPath("$.id").value(200));
    }

    @Test
    void createThread_blankBody_returns400() throws Exception {
        mvc.perform(post("/api/portal/threads")
                .with(authentication(portalUser()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"subject\":\"x\",\"body\":\"\"}"))
           .andExpect(status().isBadRequest());
    }

    @Test
    void getThread_returnsFullThread() throws Exception {
        var msg = new MessageDto(1L, 50L, SenderType.ADMIN, 42L, "from admin", LocalDateTime.now());
        var resp = new MessageThreadDto(50L, 7L, "x", LocalDateTime.now(), LocalDateTime.now(), 0, 0, List.of(msg));
        when(service.getThreadAsClient(50L, 99L)).thenReturn(resp);
        mvc.perform(get("/api/portal/threads/50").with(authentication(portalUser())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.messages[0].body").value("from admin"));
    }

    @Test
    void postReply_returns201() throws Exception {
        var resp = new MessageDto(2L, 50L, SenderType.CLIENT, 99L, "my reply", LocalDateTime.now());
        when(service.postClientReply(eq(50L), eq("my reply"), eq(99L))).thenReturn(resp);
        mvc.perform(post("/api/portal/threads/50/messages")
                .with(authentication(portalUser()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new NewMessageRequest("my reply"))))
           .andExpect(status().isCreated())
           .andExpect(jsonPath("$.body").value("my reply"));
    }

    @Test
    void unreadCount_returnsCount() throws Exception {
        when(service.getPortalUnreadCount(99L)).thenReturn(4);
        mvc.perform(get("/api/portal/messages/unread-count").with(authentication(portalUser())))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.unreadCount").value(4));
    }

    @Test
    void createThread_whenNoLinkedClient_returns409() throws Exception {
        when(service.createThreadAsClient(anyLong(), anyString(), anyString()))
            .thenThrow(new com.gwhaitech.accountingfirm.messaging.exception.NoLinkedClientException());
        mvc.perform(post("/api/portal/threads")
                .with(authentication(portalUser()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new NewThreadRequest("x", "y"))))
           .andExpect(status().isConflict());
    }

    @Test
    void getThread_whenForbidden_returns403() throws Exception {
        when(service.getThreadAsClient(eq(50L), anyLong()))
            .thenThrow(new com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException());
        mvc.perform(get("/api/portal/threads/50").with(authentication(portalUser())))
           .andExpect(status().isForbidden());
    }
}
