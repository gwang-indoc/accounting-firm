package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.dto.DocumentDto;
import com.gwhaitech.accountingfirm.client.dto.DocumentUploadResult;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.client.service.ClientService;
import com.gwhaitech.accountingfirm.client.service.DocumentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DocumentController.class)
@Import(DocumentControllerTest.TestSecurityConfig.class)
class DocumentControllerTest {

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
    private DocumentService documentService;

    @MockitoBean
    private ClientService clientService;

    private DocumentDto sampleDto() {
        return new DocumentDto(1L, "tax.pdf", "application/pdf", 1024L,
                LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    @Test
    void postDocuments_newFile_returns201() throws Exception {
        when(documentService.upload(eq(1L), eq(2025), eq("tax.pdf"), anyString(), anyLong(), any(), anyLong()))
                .thenReturn(new DocumentUploadResult(sampleDto(), true));

        MockMultipartFile file = new MockMultipartFile(
                "file", "tax.pdf", "application/pdf", "content".getBytes());

        mockMvc.perform(multipart("/api/clients/1/documents")
                .file(file)
                .param("year", "2025"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.filename").value("tax.pdf"));
    }

    @Test
    void postDocuments_overwrite_returns200() throws Exception {
        when(documentService.upload(eq(1L), eq(2025), eq("tax.pdf"), anyString(), anyLong(), any(), anyLong()))
                .thenReturn(new DocumentUploadResult(sampleDto(), false));

        MockMultipartFile file = new MockMultipartFile(
                "file", "tax.pdf", "application/pdf", "content".getBytes());

        mockMvc.perform(multipart("/api/clients/1/documents")
                .file(file)
                .param("year", "2025"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename").value("tax.pdf"));
    }

    @Test
    void postDocuments_blockedExtension_returns400() throws Exception {
        when(documentService.upload(anyLong(), anyInt(), anyString(), anyString(), anyLong(), any(), anyLong()))
                .thenThrow(new FileValidationException("Blocked file extension: .exe"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", "bad".getBytes());

        mockMvc.perform(multipart("/api/clients/1/documents")
                .file(file)
                .param("year", "2025"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postDocuments_clientNotFound_returns404() throws Exception {
        when(documentService.upload(anyLong(), anyInt(), anyString(), anyString(), anyLong(), any(), anyLong()))
                .thenThrow(new ClientNotFoundException(99L));

        MockMultipartFile file = new MockMultipartFile(
                "file", "tax.pdf", "application/pdf", "content".getBytes());

        mockMvc.perform(multipart("/api/clients/99/documents")
                .file(file)
                .param("year", "2025"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDocuments_returns200AndArray() throws Exception {
        when(documentService.listDocuments(1L, 2025))
                .thenReturn(List.of(sampleDto()));

        mockMvc.perform(get("/api/clients/1/documents").param("year", "2025"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].filename").value("tax.pdf"));
    }

    @Test
    void getDocuments_clientNotFound_returns404() throws Exception {
        when(documentService.listDocuments(999L, 2025))
                .thenThrow(new ClientNotFoundException(999L));

        mockMvc.perform(get("/api/clients/999/documents").param("year", "2025"))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadDocument_returns200WithAttachmentHeader() throws Exception {
        when(documentService.getDocument(1L)).thenReturn(sampleDto());
        when(documentService.getDocumentForDownload(1L))
                .thenReturn(new ByteArrayResource("file-bytes".getBytes()));

        mockMvc.perform(get("/api/clients/1/documents/1/download"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("tax.pdf")))
                .andExpect(content().bytes("file-bytes".getBytes()));
    }

    @Test
    void deleteDocument_returns204() throws Exception {
        mockMvc.perform(delete("/api/clients/1/documents/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteDocument_notFound_returns404() throws Exception {
        doThrow(new DocumentNotFoundException("Document not found: 999"))
                .when(documentService).deleteDocument(999L);

        mockMvc.perform(delete("/api/clients/1/documents/999"))
                .andExpect(status().isNotFound());
    }
}
