package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.service.MeDocumentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import com.gwhaitech.accountingfirm.common.exception.GlobalExceptionHandler;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MeDocumentController.class)
@Import({MeDocumentControllerTest.TestSecurityConfig.class, GlobalExceptionHandler.class})
class MeDocumentControllerTest {

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
    MockMvc mvc;

    @MockitoBean
    JwtService jwtService;

    @MockitoBean
    UserRepository userRepository;

    @MockitoBean
    MeDocumentService meDocumentService;

    private Authentication authForUser(long id) {
        User u = new User();
        u.setId(id);
        u.setEmail("test@example.com");
        u.setName("Test");
        u.setRole("USER");
        return new UsernamePasswordAuthenticationToken(u, null, List.of());
    }

    @Test
    void getMyDocuments_returnsLinkedPayload() throws Exception {
        MyDocumentsDto.Item item = new MyDocumentsDto.Item(
            42L, 2025, "T4.pdf", "application/pdf", 100L, LocalDateTime.parse("2026-02-14T10:23:00"), false);
        when(meDocumentService.listMyDocuments(any())).thenReturn(
            new MyDocumentsDto(true, "Jane Smith", List.of(item)));

        mvc.perform(get("/api/me/documents").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(true))
            .andExpect(jsonPath("$.clientName").value("Jane Smith"))
            .andExpect(jsonPath("$.documents[0].id").value(42))
            .andExpect(jsonPath("$.documents[0].year").value(2025))
            .andExpect(jsonPath("$.documents[0].filename").value("T4.pdf"));
    }

    @Test
    void getMyDocuments_returnsUnlinkedPayload() throws Exception {
        when(meDocumentService.listMyDocuments(any())).thenReturn(
            new MyDocumentsDto(false, null, List.of()));

        mvc.perform(get("/api/me/documents").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(false))
            .andExpect(jsonPath("$.documents").isEmpty());
    }

    @Test
    void downloadMyDocument_returnsFileWithCorrectHeaders() throws Exception {
        Path tmp = Files.createTempFile("test", ".pdf");
        Files.writeString(tmp, "PDF body");
        when(meDocumentService.getMyDocumentForDownload(any(), eq(42L))).thenReturn(
            new MeDocumentService.DownloadInfo("T4.pdf", "application/pdf", tmp));

        mvc.perform(get("/api/me/documents/42/download").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andExpect(header().string("Content-Disposition",
                "attachment; filename=\"T4.pdf\"; filename*=UTF-8''T4.pdf"))
            .andExpect(content().string("PDF body"));

        Files.deleteIfExists(tmp);
    }

    @Test
    void downloadMyDocument_returns404WhenServiceThrows() throws Exception {
        when(meDocumentService.getMyDocumentForDownload(any(), eq(42L)))
            .thenThrow(new DocumentNotFoundException("Document not found: 42"));

        mvc.perform(get("/api/me/documents/42/download").with(authentication(authForUser(7L))))
            .andExpect(status().isNotFound());
    }

    @Test
    void zipForYear_returns200AndZipMimeType() throws Exception {
        doAnswer(invocation -> {
            OutputStream out = invocation.getArgument(2);
            out.write(new byte[] { 'P', 'K', 0x03, 0x04 });
            return null;
        }).when(meDocumentService).zipForYear(any(), eq(2025), any(OutputStream.class));

        mvc.perform(get("/api/me/documents/zip?year=2025").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/zip"))
            .andExpect(header().string("Content-Disposition",
                "attachment; filename=\"GWH-2025-documents.zip\"; filename*=UTF-8''GWH-2025-documents.zip"));
    }

    @Test
    void zipForYear_returns404WhenServiceThrows() throws Exception {
        doThrow(new DocumentNotFoundException("No documents for year 2025"))
            .when(meDocumentService).zipForYear(any(), eq(2025), any(OutputStream.class));

        mvc.perform(get("/api/me/documents/zip?year=2025").with(authentication(authForUser(7L))))
            .andExpect(status().isNotFound());
    }

    @Test
    void upload_returns201WithNewItem() throws Exception {
        MyDocumentsDto.Item item = new MyDocumentsDto.Item(
                42L, 2024, "T4-2024.pdf", "application/pdf", 12345L,
                LocalDateTime.parse("2026-05-19T10:00:00"), true);
        when(meDocumentService.uploadMyDocument(any(), eq(2024), any())).thenReturn(item);

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "hello".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024")
                        .with(authentication(authForUser(7L))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.filename").value("T4-2024.pdf"))
                .andExpect(jsonPath("$.uploadedByMe").value(true));
    }

    @Test
    void upload_returns409OnDuplicateName() throws Exception {
        when(meDocumentService.uploadMyDocument(any(), eq(2024), any()))
                .thenThrow(new DocumentNameConflictException("T4-2024.pdf", 2024));

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "x".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024")
                        .with(authentication(authForUser(7L))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.filename").value("T4-2024.pdf"))
                .andExpect(jsonPath("$.year").value(2024));
    }

    @Test
    void upload_returns403WhenPortalNotLinked() throws Exception {
        when(meDocumentService.uploadMyDocument(any(), eq(2024), any()))
                .thenThrow(new PortalNotLinkedException());

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "x".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024")
                        .with(authentication(authForUser(7L))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("portal isn't set up")));
    }

    @Test
    void upload_returns413WhenFileTooLarge() throws Exception {
        when(meDocumentService.uploadMyDocument(any(), eq(2024), any()))
                .thenThrow(new MaxUploadSizeExceededException(10 * 1024 * 1024L));

        MockMultipartFile file = new MockMultipartFile(
                "file", "big.pdf", "application/pdf", "x".getBytes());

        mvc.perform(multipart("/api/me/documents")
                        .file(file)
                        .param("year", "2024")
                        .with(authentication(authForUser(7L))))
                .andExpect(status().isPayloadTooLarge());
    }
}
