package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.exception.ClientAccessDeniedException;
import com.gwhaitech.accountingfirm.client.exception.ExportValidationException;
import com.gwhaitech.accountingfirm.client.service.AdminExportService;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminExportController.class)
@Import(AdminExportControllerTest.TestSecurityConfig.class)
class AdminExportControllerTest {

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
    private AdminExportService adminExportService;

    private static final Long ADMIN_ID = 99L;

    private static Authentication adminAuth() {
        User admin = new User();
        admin.setId(ADMIN_ID);
        admin.setEmail("admin@test.com");
        admin.setName("Admin");
        return new UsernamePasswordAuthenticationToken(admin, null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private Client sampleClient() {
        Client c = new Client();
        c.setId(1L);
        c.setAdminId(ADMIN_ID);
        c.setName("Acme Corp");
        c.setEmail("acme@example.com");
        try {
            var f = Client.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(c, LocalDateTime.of(2025, 1, 1, 0, 0));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return c;
    }

    // ── metadata-only ──────────────────────────────────────────────────────

    @Test
    void postExport_metadataOnly_returns200WithCsvContentType() throws Exception {
        when(adminExportService.loadOwnedClients(eq(ADMIN_ID), any())).thenReturn(List.of(sampleClient()));
        when(adminExportService.buildCsv(any())).thenReturn("Name,Email,Phone,Created Date,Linked Portal User Email\r\nAcme Corp,acme@example.com,,,\r\n");

        mockMvc.perform(post("/api/clients/export")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientIds":[1],"includeMetadata":true,"includeDocuments":false,"year":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("clients-export-")));
    }

    // ── documents-only ─────────────────────────────────────────────────────

    @Test
    void postExport_documentsOnly_returns200WithZipContentType() throws Exception {
        when(adminExportService.loadOwnedClients(eq(ADMIN_ID), any())).thenReturn(List.of(sampleClient()));
        doAnswer(inv -> null).when(adminExportService).streamDocumentZip(any(), any(), any());

        mockMvc.perform(post("/api/clients/export")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientIds":[1],"includeMetadata":false,"includeDocuments":true,"year":2024}
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/zip")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("documents-export-")));
    }

    // ── combined ───────────────────────────────────────────────────────────

    @Test
    void postExport_both_returns200WithZipAndExportFilename() throws Exception {
        when(adminExportService.loadOwnedClients(eq(ADMIN_ID), any())).thenReturn(List.of(sampleClient()));
        doAnswer(inv -> null).when(adminExportService).streamCombinedZip(any(), any(), any());

        mockMvc.perform(post("/api/clients/export")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientIds":[1],"includeMetadata":true,"includeDocuments":true,"year":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/zip")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("export-")));
    }

    // ── validation ─────────────────────────────────────────────────────────

    @Test
    void postExport_returns400_whenValidationFails() throws Exception {
        doThrow(new ExportValidationException("Export limited to 200 clients at a time"))
                .when(adminExportService).validateRequest(any());

        mockMvc.perform(post("/api/clients/export")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientIds":[1],"includeMetadata":true,"includeDocuments":false,"year":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Export limited to 200 clients at a time"));
    }

    @Test
    void postExport_returns403_whenClientNotOwned() throws Exception {
        doThrow(new ClientAccessDeniedException(1L))
                .when(adminExportService).loadOwnedClients(eq(ADMIN_ID), any());

        mockMvc.perform(post("/api/clients/export")
                        .with(authentication(adminAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientIds":[1],"includeMetadata":true,"includeDocuments":false,"year":null}
                                """))
                .andExpect(status().isForbidden());
    }

    // ── GET /api/clients/ids ───────────────────────────────────────────────

    @Test
    void getClientIds_returnsIdsFilteredByNameAndEmail() throws Exception {
        when(adminExportService.getClientIds(eq(ADMIN_ID), eq("acme"), eq(null)))
                .thenReturn(List.of(1L, 3L));

        mockMvc.perform(get("/api/clients/ids")
                        .with(authentication(adminAuth()))
                        .param("name", "acme"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0]").value(1))
                .andExpect(jsonPath("$[1]").value(3));
    }

    @Test
    void getClientIds_returnsAllWhenNoFilters() throws Exception {
        when(adminExportService.getClientIds(eq(ADMIN_ID), eq(null), eq(null)))
                .thenReturn(List.of(1L, 2L, 3L));

        mockMvc.perform(get("/api/clients/ids")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }
}
