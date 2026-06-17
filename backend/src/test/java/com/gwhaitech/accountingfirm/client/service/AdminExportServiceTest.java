package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.ExportRequest;
import com.gwhaitech.accountingfirm.client.exception.ClientAccessDeniedException;
import com.gwhaitech.accountingfirm.client.exception.ExportValidationException;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminExportServiceTest {

    @Mock private ClientRepository clientRepository;
    @Mock private ClientDocumentRepository documentRepository;
    @Mock private LocalStorageService storage;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private AdminExportService adminExportService;

    @TempDir
    Path tempDir;

    private Client clientOwnedBy(Long clientId, Long adminId, String name) {
        Client c = new Client();
        c.setId(clientId);
        c.setAdminId(adminId);
        c.setName(name);
        c.setEmail(name.toLowerCase().replace(" ", "") + "@example.com");
        try {
            var f = Client.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(c, LocalDateTime.of(2025, 1, 1, 0, 0));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return c;
    }

    private ClientDocument doc(Long id, Long clientId, int year, String filename) {
        ClientDocument d = new ClientDocument();
        d.setId(id);
        d.setClientId(clientId);
        d.setYear((short) year);
        d.setFilename(filename);
        d.setFilePath("clients/" + clientId + "/" + year + "/" + filename);
        d.setUploadedBy(1L);
        d.setUploadedAt(LocalDateTime.now());
        return d;
    }

    // ── 1.1: ownership validation ──────────────────────────────────────────

    @Test
    void validateOwnership_throwsAccessDenied_whenClientBelongsToDifferentAdmin() {
        Client foreignClient = clientOwnedBy(42L, 999L, "Foreign Corp");
        when(clientRepository.findAllById(List.of(42L))).thenReturn(List.of(foreignClient));

        assertThatThrownBy(() -> adminExportService.validateOwnership(1L, List.of(42L)))
                .isInstanceOf(ClientAccessDeniedException.class);
    }

    @Test
    void validateOwnership_passesWhenAllClientsOwnedByAdmin() {
        Client own = clientOwnedBy(1L, 10L, "My Corp");
        when(clientRepository.findAllById(List.of(1L))).thenReturn(List.of(own));

        // should not throw
        adminExportService.validateOwnership(10L, List.of(1L));
    }

    // ── 1.3: cap validation ────────────────────────────────────────────────

    @Test
    void validateRequest_throws400_whenMoreThan200ClientIds() {
        List<Long> ids = java.util.stream.LongStream.rangeClosed(1, 201)
                .boxed().toList();
        ExportRequest request = new ExportRequest(ids, true, false, null);

        assertThatThrownBy(() -> adminExportService.validateRequest(request))
                .isInstanceOf(ExportValidationException.class)
                .hasMessageContaining("Export limited to 200 clients at a time");
    }

    @Test
    void validateRequest_throws400_whenNoContentTypeSelected() {
        ExportRequest request = new ExportRequest(List.of(1L), false, false, null);

        assertThatThrownBy(() -> adminExportService.validateRequest(request))
                .isInstanceOf(ExportValidationException.class);
    }

    @Test
    void validateRequest_passesForValidRequest() {
        ExportRequest request = new ExportRequest(List.of(1L, 2L), true, false, null);
        // should not throw
        adminExportService.validateRequest(request);
    }

    // ── 1.5: CSV metadata export ────────────────────────────────────────────

    @Test
    void buildCsv_returnsHeaderAndRowPerClient() {
        Client c1 = clientOwnedBy(1L, 10L, "Acme Corp");
        c1.setPhone("555-1234");
        Client c2 = clientOwnedBy(2L, 10L, "Beta LLC");
        c2.setPhone(null);
        c2.setUserId(5L);

        User linkedUser = new User();
        linkedUser.setId(5L);
        linkedUser.setEmail("user@beta.com");
        when(userRepository.findAllById(List.of(5L))).thenReturn(List.of(linkedUser));

        String csv = adminExportService.buildCsv(List.of(c1, c2));
        String[] lines = csv.split("\r\n");

        assertThat(lines[0]).isEqualTo("Name,Email,Phone,Created Date,Linked Portal User Email");
        assertThat(lines[1]).contains("Acme Corp");
        assertThat(lines[1]).contains("555-1234");
        assertThat(lines[2]).contains("Beta LLC");
        assertThat(lines[2]).contains("user@beta.com");
    }

    @Test
    void buildCsv_usesEmptyStringForUnlinkedUser() {
        Client c = clientOwnedBy(1L, 10L, "Solo Corp");
        // userId is null → no linked user
        when(userRepository.findAllById(List.of())).thenReturn(List.of());

        String csv = adminExportService.buildCsv(List.of(c));
        String[] lines = csv.split("\r\n");

        // last field in data row should be empty
        assertThat(lines[1]).endsWith(",");
    }

    @Test
    void buildCsv_quotesFieldsContainingCommas() {
        Client c = clientOwnedBy(1L, 10L, "Smith, Jones & Co");
        when(userRepository.findAllById(List.of())).thenReturn(List.of());

        String csv = adminExportService.buildCsv(List.of(c));
        assertThat(csv).contains("\"Smith, Jones & Co\"");
    }

    // ── 1.7: document ZIP export ────────────────────────────────────────────

    @Test
    void streamDocumentZip_producesCorrectZipEntries_forSpecificYear() throws IOException {
        Client c = clientOwnedBy(1L, 10L, "Acme Corp");
        ClientDocument d = doc(10L, 1L, 2024, "tax-return.pdf");

        when(documentRepository.findByClientIdAndYear(1L, 2024)).thenReturn(List.of(d));

        Path file = tempDir.resolve("tax-return.pdf");
        Files.writeString(file, "fake pdf content");
        when(storage.resolve("clients/1/2024/tax-return.pdf")).thenReturn(file);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        adminExportService.streamDocumentZip(List.of(c), 2024, out);

        try (ZipInputStream zin = new ZipInputStream(
                new java.io.ByteArrayInputStream(out.toByteArray()))) {
            var entry = zin.getNextEntry();
            assertThat(entry).isNotNull();
            assertThat(entry.getName()).isEqualTo("Acme Corp-1/2024/tax-return.pdf");
        }
    }

    @Test
    void streamDocumentZip_omitsClientWithNoDocsForYear() throws IOException {
        Client c1 = clientOwnedBy(1L, 10L, "Acme Corp");
        Client c2 = clientOwnedBy(2L, 10L, "Empty LLC");

        when(documentRepository.findByClientIdAndYear(1L, 2024))
                .thenReturn(List.of(doc(10L, 1L, 2024, "file.pdf")));
        when(documentRepository.findByClientIdAndYear(2L, 2024))
                .thenReturn(List.of());

        Path file = tempDir.resolve("file.pdf");
        Files.writeString(file, "content");
        when(storage.resolve("clients/1/2024/file.pdf")).thenReturn(file);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        adminExportService.streamDocumentZip(List.of(c1, c2), 2024, out);

        try (ZipInputStream zin = new ZipInputStream(
                new java.io.ByteArrayInputStream(out.toByteArray()))) {
            var entry = zin.getNextEntry();
            assertThat(entry.getName()).startsWith("Acme Corp-1/");
            assertThat(zin.getNextEntry()).isNull();
        }
    }

    // ── 1.9: empty document export ──────────────────────────────────────────

    @Test
    void streamDocumentZip_throws400_whenNoDocumentsFound() {
        Client c = clientOwnedBy(1L, 10L, "Acme Corp");
        when(documentRepository.findByClientIdAndYear(1L, 2024)).thenReturn(List.of());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        assertThatThrownBy(() -> adminExportService.streamDocumentZip(List.of(c), 2024, out))
                .isInstanceOf(ExportValidationException.class)
                .hasMessageContaining("No documents found for the selected clients and year");
    }

    @Test
    void streamDocumentZip_allYears_includesAllDocuments() throws IOException {
        Client c = clientOwnedBy(1L, 10L, "Acme Corp");
        ClientDocument d2024 = doc(10L, 1L, 2024, "tax2024.pdf");
        ClientDocument d2025 = doc(11L, 1L, 2025, "tax2025.pdf");

        when(documentRepository.findByClientIdOrderByYearDescUploadedAtDesc(1L))
                .thenReturn(List.of(d2025, d2024));

        Path f1 = tempDir.resolve("tax2025.pdf");
        Path f2 = tempDir.resolve("tax2024.pdf");
        Files.writeString(f1, "2025");
        Files.writeString(f2, "2024");
        when(storage.resolve("clients/1/2025/tax2025.pdf")).thenReturn(f1);
        when(storage.resolve("clients/1/2024/tax2024.pdf")).thenReturn(f2);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        adminExportService.streamDocumentZip(List.of(c), null, out);

        List<String> entries = new java.util.ArrayList<>();
        try (ZipInputStream zin = new ZipInputStream(
                new java.io.ByteArrayInputStream(out.toByteArray()))) {
            var entry = zin.getNextEntry();
            while (entry != null) {
                entries.add(entry.getName());
                entry = zin.getNextEntry();
            }
        }
        assertThat(entries).containsExactlyInAnyOrder(
                "Acme Corp-1/2025/tax2025.pdf",
                "Acme Corp-1/2024/tax2024.pdf");
    }

    // ── 1.11: combined export ───────────────────────────────────────────────

    @Test
    void streamCombinedZip_containsCsvAtRootAndDocumentEntries() throws IOException {
        Client c = clientOwnedBy(1L, 10L, "Acme Corp");
        ClientDocument d = doc(10L, 1L, 2024, "report.pdf");

        when(userRepository.findAllById(List.of())).thenReturn(List.of());
        when(documentRepository.findByClientIdAndYear(1L, 2024)).thenReturn(List.of(d));

        Path file = tempDir.resolve("report.pdf");
        Files.writeString(file, "report content");
        when(storage.resolve("clients/1/2024/report.pdf")).thenReturn(file);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        adminExportService.streamCombinedZip(List.of(c), 2024, out);

        List<String> entries = new java.util.ArrayList<>();
        try (ZipInputStream zin = new ZipInputStream(
                new java.io.ByteArrayInputStream(out.toByteArray()))) {
            var entry = zin.getNextEntry();
            while (entry != null) {
                entries.add(entry.getName());
                entry = zin.getNextEntry();
            }
        }
        assertThat(entries).contains("clients.csv");
        assertThat(entries).anyMatch(e -> e.equals("Acme Corp-1/2024/report.pdf"));
    }
}
