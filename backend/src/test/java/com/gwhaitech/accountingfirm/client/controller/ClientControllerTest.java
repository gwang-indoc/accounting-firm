package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.service.ClientService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

    private ClientDto sampleDto() {
        return new ClientDto(1L, "Acme Corp", "contact@acme.com", "555-1234",
                LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    @Test
    void postClients_withName_returns201AndDto() throws Exception {
        when(clientService.createClient(any())).thenReturn(sampleDto());

        mockMvc.perform(post("/api/clients")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Acme"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Acme Corp"));
    }

    @Test
    void postClients_withoutName_returns400() throws Exception {
        mockMvc.perform(post("/api/clients")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getClients_returns200AndArray() throws Exception {
        when(clientService.findAll()).thenReturn(List.of(sampleDto()));

        mockMvc.perform(get("/api/clients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void getClientById_existing_returns200AndDto() throws Exception {
        when(clientService.findById(1L)).thenReturn(sampleDto());

        mockMvc.perform(get("/api/clients/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Acme Corp"));
    }

    @Test
    void getClientById_notFound_returns404() throws Exception {
        when(clientService.findById(999L)).thenThrow(new ClientNotFoundException(999L));

        mockMvc.perform(get("/api/clients/999"))
                .andExpect(status().isNotFound());
    }
}
