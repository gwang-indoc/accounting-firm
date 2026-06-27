package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.domain.EngagementStatus;
import com.gwhaitech.accountingfirm.client.dto.EngagementDto;
import com.gwhaitech.accountingfirm.client.service.ClientEngagementService;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
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

import com.gwhaitech.accountingfirm.client.dto.EngagementDashboardDto;
import com.gwhaitech.accountingfirm.client.dto.EngagementHistoryDto;
import com.gwhaitech.accountingfirm.client.domain.BusinessType;
import com.gwhaitech.accountingfirm.client.exception.EngagementNotFoundException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({ClientEngagementController.class, AdminEngagementController.class})
@Import(ClientEngagementControllerTest.TestSecurityConfig.class)
class ClientEngagementControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
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
    private ClientEngagementService engagementService;

    private static final Long ADMIN_ID = 99L;

    private static Authentication adminAuth() {
        User admin = new User();
        admin.setId(ADMIN_ID);
        admin.setEmail("admin@test.com");
        admin.setName("Admin");
        return new UsernamePasswordAuthenticationToken(admin, null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private EngagementDto sampleEngagementDto() {
        return new EngagementDto(1L, 10L, (short) 2024, "John Smith", null, EngagementStatus.START,
                ADMIN_ID, LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    @Test
    void createEngagement_returns201WithStartStatus() throws Exception {
        when(engagementService.createEngagement(eq(10L), eq(2024), eq("John Smith"), eq(ADMIN_ID)))
                .thenReturn(sampleEngagementDto());

        mockMvc.perform(post("/api/admin/clients/10/engagements")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"taxYear":2024,"name":"John Smith"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("START"))
                .andExpect(jsonPath("$.taxYear").value(2024))
                .andExpect(jsonPath("$.name").value("John Smith"));
    }

    @Test
    void createEngagement_duplicateTaxYear_returns409() throws Exception {
        when(engagementService.createEngagement(eq(10L), eq(2024), eq("John Smith"), eq(ADMIN_ID)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));

        mockMvc.perform(post("/api/admin/clients/10/engagements")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"taxYear":2024,"name":"John Smith"}
                        """))
                .andExpect(status().isConflict());
    }

    @Test
    void createEngagement_missingTaxYear_returns400() throws Exception {
        mockMvc.perform(post("/api/admin/clients/10/engagements")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEngagement_blankName_returns400() throws Exception {
        mockMvc.perform(post("/api/admin/clients/10/engagements")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"taxYear":2024,"name":"  "}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEngagement_clientNotFound_returns404() throws Exception {
        when(engagementService.createEngagement(eq(999L), eq(2024), eq("John Smith"), eq(ADMIN_ID)))
                .thenThrow(new ClientNotFoundException(999L));

        mockMvc.perform(post("/api/admin/clients/999/engagements")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"taxYear":2024,"name":"John Smith"}
                        """))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchStatus_returns200WithNewStatus() throws Exception {
        EngagementDto updated = new EngagementDto(1L, 10L, (short) 2024, "John Smith", null, EngagementStatus.IN_PROCESSING,
                ADMIN_ID, LocalDateTime.of(2026, 1, 2, 0, 0));
        when(engagementService.transitionStatus(eq(10L), eq(1L), eq(EngagementStatus.IN_PROCESSING), isNull(), eq(ADMIN_ID)))
                .thenReturn(updated);

        mockMvc.perform(patch("/api/admin/clients/10/engagements/1/status")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"status":"IN_PROCESSING"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROCESSING"));
    }

    @Test
    void patchStatus_withNote_returns200WithNoteInResponse() throws Exception {
        EngagementDto updated = new EngagementDto(1L, 10L, (short) 2024, "John Smith", "Started review", EngagementStatus.IN_PROCESSING,
                ADMIN_ID, LocalDateTime.of(2026, 1, 2, 0, 0));
        when(engagementService.transitionStatus(eq(10L), eq(1L), eq(EngagementStatus.IN_PROCESSING), eq("Started review"), eq(ADMIN_ID)))
                .thenReturn(updated);

        mockMvc.perform(patch("/api/admin/clients/10/engagements/1/status")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"status":"IN_PROCESSING","note":"Started review"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.note").value("Started review"));
    }

    @Test
    void patchStatus_invalidStatusString_returns400() throws Exception {
        mockMvc.perform(patch("/api/admin/clients/10/engagements/1/status")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"status":"BOGUS_STATUS"}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void patchStatus_engagementNotFound_returns404() throws Exception {
        when(engagementService.transitionStatus(eq(10L), eq(9999L), eq(EngagementStatus.IN_PROCESSING), isNull(), eq(ADMIN_ID)))
                .thenThrow(new EngagementNotFoundException(9999L));

        mockMvc.perform(patch("/api/admin/clients/10/engagements/9999/status")
                .with(authentication(adminAuth()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"status":"IN_PROCESSING"}
                        """))
                .andExpect(status().isNotFound());
    }

    @Test
    void getEngagementsForClient_returnsListOrderedByTaxYearDesc() throws Exception {
        List<EngagementDto> engagements = List.of(
                new EngagementDto(2L, 10L, (short) 2025, "John Smith", null, EngagementStatus.START, ADMIN_ID, LocalDateTime.now()),
                new EngagementDto(1L, 10L, (short) 2024, "Smith Holdings Inc.", null, EngagementStatus.COMPLETED, ADMIN_ID, LocalDateTime.now())
        );
        when(engagementService.listForClient(eq(10L), eq(ADMIN_ID))).thenReturn(engagements);

        mockMvc.perform(get("/api/admin/clients/10/engagements")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].taxYear").value(2025))
                .andExpect(jsonPath("$[1].taxYear").value(2024));
    }

    @Test
    void getEngagementHistory_byId_returnsOldestFirst() throws Exception {
        List<EngagementHistoryDto> history = List.of(
                new EngagementHistoryDto(1L, null, EngagementStatus.START, ADMIN_ID, LocalDateTime.of(2026, 1, 1, 0, 0), null),
                new EngagementHistoryDto(2L, EngagementStatus.START, EngagementStatus.IN_PROCESSING, ADMIN_ID, LocalDateTime.of(2026, 1, 2, 0, 0), "started")
        );
        when(engagementService.getHistory(eq(10L), eq(1L), eq(ADMIN_ID))).thenReturn(history);

        mockMvc.perform(get("/api/admin/clients/10/engagements/1/history")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].toStatus").value("START"))
                .andExpect(jsonPath("$[1].toStatus").value("IN_PROCESSING"));
    }

    @Test
    void getEngagementHistory_unknownId_returns404() throws Exception {
        when(engagementService.getHistory(eq(10L), eq(9999L), eq(ADMIN_ID)))
                .thenThrow(new EngagementNotFoundException(9999L));

        mockMvc.perform(get("/api/admin/clients/10/engagements/9999/history")
                .with(authentication(adminAuth())))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAllEngagements_includesClientNameAndBusinessType() throws Exception {
        List<EngagementDashboardDto> all = List.of(
                new EngagementDashboardDto(1L, 10L, "Acme Corp", BusinessType.PERSONAL,
                        (short) 2024, "John Smith", EngagementStatus.IN_PROCESSING, LocalDateTime.now(), "Admin User")
        );
        when(engagementService.listAll(eq(ADMIN_ID))).thenReturn(all);

        mockMvc.perform(get("/api/admin/engagements")
                .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].clientName").value("Acme Corp"))
                .andExpect(jsonPath("$[0].businessType").value("PERSONAL"))
                .andExpect(jsonPath("$[0].updatedByName").value("Admin User"));
    }
}
