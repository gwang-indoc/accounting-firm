package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
import com.gwhaitech.accountingfirm.client.exception.ClientAccessDeniedException;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.service.ClientService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;

@WebMvcTest(ClientController.class)
@Import(ClientControllerTest.TestSecurityConfig.class)
class ClientControllerTest {

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
    private ClientService clientService;

    private static final Long ADMIN_ID = 99L;

    private static Authentication adminAuth() {
        User admin = new User();
        admin.setId(ADMIN_ID);
        admin.setEmail("admin@test.com");
        admin.setName("Admin");
        return new UsernamePasswordAuthenticationToken(admin, null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private ClientDto sampleDto() {
        return new ClientDto(1L, "Acme Corp", "contact@acme.com", "555-1234",
                LocalDateTime.of(2026, 1, 1, 0, 0), null, ADMIN_ID);
    }

    @Test
    void postClients_withName_returns201AndDto() throws Exception {
        when(clientService.createClient(any(), eq(ADMIN_ID))).thenReturn(sampleDto());

        mockMvc.perform(post("/api/clients")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Acme","email":"contact@acme.com"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Acme Corp"));
    }

    @Test
    void postClients_withoutName_returns400() throws Exception {
        mockMvc.perform(post("/api/clients")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getClients_returnsOnlyCallerClients() throws Exception {
        when(clientService.findAll(ADMIN_ID)).thenReturn(List.of(sampleDto()));

        mockMvc.perform(get("/api/clients")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].adminId").value(ADMIN_ID));
    }

    @Test
    void getClientById_existing_returns200AndDto() throws Exception {
        when(clientService.findById(eq(1L), eq(ADMIN_ID))).thenReturn(sampleDto());

        mockMvc.perform(get("/api/clients/1")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Acme Corp"));
    }

    @Test
    void getClientById_notFound_returns404() throws Exception {
        when(clientService.findById(eq(999L), eq(ADMIN_ID))).thenThrow(new ClientNotFoundException(999L));

        mockMvc.perform(get("/api/clients/999")
                .with(authentication(adminAuth())))
                .andExpect(status().isNotFound());
    }

    @Test
    void getClientById_differentAdmin_returns403() throws Exception {
        when(clientService.findById(eq(2L), eq(ADMIN_ID))).thenThrow(new ClientAccessDeniedException(2L));

        mockMvc.perform(get("/api/clients/2")
                .with(authentication(adminAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    void putClient_existing_returns200AndDto() throws Exception {
        when(clientService.updateClient(eq(1L), any(), eq(ADMIN_ID))).thenReturn(sampleDto());

        mockMvc.perform(put("/api/clients/1")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Updated","email":"u@u.com","phone":"111"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void putClient_withoutName_returns400() throws Exception {
        mockMvc.perform(put("/api/clients/1")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"u@u.com"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void putClient_notFound_returns404() throws Exception {
        when(clientService.updateClient(eq(999L), any(), eq(ADMIN_ID)))
                .thenThrow(new ClientNotFoundException(999L));

        mockMvc.perform(put("/api/clients/999")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"X"}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteClient_existing_returns204() throws Exception {
        doNothing().when(clientService).deleteClient(eq(1L), eq(ADMIN_ID));

        mockMvc.perform(delete("/api/clients/1")
                .with(authentication(adminAuth())))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteClient_notFound_returns404() throws Exception {
        doThrow(new ClientNotFoundException(999L)).when(clientService).deleteClient(eq(999L), eq(ADMIN_ID));

        mockMvc.perform(delete("/api/clients/999")
                .with(authentication(adminAuth())))
                .andExpect(status().isNotFound());
    }
}
