package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import com.gwhaitech.accountingfirm.storage.FileUploadValidator;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import com.gwhaitech.accountingfirm.storage.StorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class MeDocumentServiceTest {

    @TempDir
    Path tempDir;

    private ClientRepository clientRepo;
    private ClientDocumentRepository docRepo;
    private LocalStorageService storage;
    private FileUploadValidator fileUploadValidator;
    private MeDocumentService service;

    @BeforeEach
    void setUp() {
        clientRepo = mock(ClientRepository.class);
        docRepo = mock(ClientDocumentRepository.class);
        storage = mock(LocalStorageService.class);
        StorageProperties props = new StorageProperties(
                tempDir, 10, 100, List.of("exe", "js"));
        fileUploadValidator = new FileUploadValidator(props);
        service = new MeDocumentService(clientRepo, docRepo, storage, fileUploadValidator);
    }

    private User user(long id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    private Client client(long id, String name) {
        Client c = new Client();
        c.setId(id);
        c.setName(name);
        return c;
    }

    private ClientDocument doc(long id, long clientId, int year, String filename, String filePath) {
        ClientDocument d = new ClientDocument();
        d.setId(id);
        d.setClientId(clientId);
        d.setYear((short) year);
        d.setFilename(filename);
        d.setFilePath(filePath);
        d.setMimeType("application/pdf");
        d.setSizeBytes(100L);
        d.setUploadedBy(1L);
        return d;
    }

    @Test
    void listMyDocuments_returnsLinkedPayloadWhenUserHasClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane Smith")));
        ClientDocument d1 = doc(1L, 99L, 2025, "T4-2025.pdf", "clients/99/2025/T4-2025.pdf");
        ClientDocument d2 = doc(2L, 99L, 2024, "T4-2024.pdf", "clients/99/2024/T4-2024.pdf");
        when(docRepo.findByClientIdOrderByYearDescUploadedAtDesc(99L)).thenReturn(List.of(d1, d2));

        MyDocumentsDto result = service.listMyDocuments(user(7L));

        assertThat(result.linked()).isTrue();
        assertThat(result.clientName()).isEqualTo("Jane Smith");
        assertThat(result.documents()).hasSize(2);
        assertThat(result.documents().get(0).year()).isEqualTo(2025);
        assertThat(result.documents().get(1).year()).isEqualTo(2024);
    }

    @Test
    void listMyDocuments_returnsUnlinkedPayloadWhenUserHasNoClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.empty());

        MyDocumentsDto result = service.listMyDocuments(user(7L));

        assertThat(result.linked()).isFalse();
        assertThat(result.clientName()).isNull();
        assertThat(result.documents()).isEmpty();
        verify(docRepo, never()).findByClientIdOrderByYearDescUploadedAtDesc(any());
    }

    @Test
    void zipForYear_streamsZipWithYearPrefixedEntries(@TempDir Path tmp) throws Exception {
        Path file1 = tmp.resolve("a.pdf");
        Path file2 = tmp.resolve("b.pdf");
        Files.writeString(file1, "PDF content A");
        Files.writeString(file2, "PDF content B");

        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        ClientDocument d1 = doc(1L, 99L, 2025, "a.pdf", "clients/99/2025/a.pdf");
        ClientDocument d2 = doc(2L, 99L, 2025, "b.pdf", "clients/99/2025/b.pdf");
        when(docRepo.findByClientIdAndYearOrderByUploadedAtDesc(99L, 2025)).thenReturn(List.of(d1, d2));
        when(storage.resolve("clients/99/2025/a.pdf")).thenReturn(file1);
        when(storage.resolve("clients/99/2025/b.pdf")).thenReturn(file2);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        service.zipForYear(user(7L), 2025, out);

        try (ZipInputStream zis = new ZipInputStream(new java.io.ByteArrayInputStream(out.toByteArray()))) {
            ZipEntry e1 = zis.getNextEntry();
            assertThat(e1.getName()).isEqualTo("2025/a.pdf");
            byte[] body = zis.readAllBytes();
            assertThat(new String(body)).isEqualTo("PDF content A");

            ZipEntry e2 = zis.getNextEntry();
            assertThat(e2.getName()).isEqualTo("2025/b.pdf");
            byte[] body2 = zis.readAllBytes();
            assertThat(new String(body2)).isEqualTo("PDF content B");

            assertThat(zis.getNextEntry()).isNull();
        }
    }

    @Test
    void zipForYear_throwsWhenUserHasNoClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.zipForYear(user(7L), 2025, new ByteArrayOutputStream()))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void zipForYear_throwsWhenYearHasNoDocs() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        when(docRepo.findByClientIdAndYearOrderByUploadedAtDesc(99L, 2025)).thenReturn(List.of());

        assertThatThrownBy(() -> service.zipForYear(user(7L), 2025, new ByteArrayOutputStream()))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void getMyDocumentForDownload_returnsPathWhenDocBelongsToCallerClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        ClientDocument d = doc(42L, 99L, 2025, "a.pdf", "clients/99/2025/a.pdf");
        when(docRepo.findById(42L)).thenReturn(Optional.of(d));
        when(storage.resolve("clients/99/2025/a.pdf")).thenReturn(Path.of("/tmp/a.pdf"));

        MeDocumentService.DownloadInfo info = service.getMyDocumentForDownload(user(7L), 42L);

        assertThat(info.filename()).isEqualTo("a.pdf");
        assertThat(info.mimeType()).isEqualTo("application/pdf");
        assertThat(info.path()).isEqualTo(Path.of("/tmp/a.pdf"));
    }

    @Test
    void getMyDocumentForDownload_throwsWhenDocBelongsToOtherClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        ClientDocument d = doc(42L, 100L, 2025, "a.pdf", "clients/100/2025/a.pdf"); // belongs to client 100
        when(docRepo.findById(42L)).thenReturn(Optional.of(d));

        assertThatThrownBy(() -> service.getMyDocumentForDownload(user(7L), 42L))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void getMyDocumentForDownload_throwsWhenUserHasNoClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMyDocumentForDownload(user(7L), 42L))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void listMyDocuments_setsUploadedByMeBasedOnUploadedByVsRequestingUserId() {
        Client c = client(99L, "Jane Smith");
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(c));

        ClientDocument fromFirm = doc(1L, 99L, 2024, "Tax-Return-2024.pdf", "clients/99/2024/Tax-Return-2024.pdf");
        fromFirm.setUploadedBy(99L); // staff user id, NOT me

        ClientDocument fromMe = doc(2L, 99L, 2024, "T4-2024.pdf", "clients/99/2024/T4-2024.pdf");
        fromMe.setUploadedBy(7L); // me

        when(docRepo.findByClientIdOrderByYearDescUploadedAtDesc(99L)).thenReturn(List.of(fromFirm, fromMe));

        MyDocumentsDto result = service.listMyDocuments(user(7L));

        assertThat(result.linked()).isTrue();
        assertThat(result.documents()).hasSize(2);
        Map<String, Boolean> byName = result.documents().stream()
                .collect(Collectors.toMap(
                        MyDocumentsDto.Item::filename,
                        MyDocumentsDto.Item::uploadedByMe));
        assertThat(byName).containsEntry("Tax-Return-2024.pdf", false);
        assertThat(byName).containsEntry("T4-2024.pdf", true);
    }

    // ---- uploadMyDocument tests ----

    @Test
    void uploadMyDocument_storesRowAndFile() throws Exception {
        Client c = client(99L, "Jane");
        c.setId(99L);
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(c));
        when(docRepo.findByClientIdAndYearAndFilename(99L, 2024, "T4-2024.pdf"))
                .thenReturn(Optional.empty());

        ClientDocument saved = doc(10L, 99L, 2024, "T4-2024.pdf", "clients/99/2024/T4-2024.pdf");
        saved.setUploadedBy(7L);
        when(docRepo.save(any(ClientDocument.class))).thenReturn(saved);

        // Separate instance with real storage to verify the file actually lands on disk.
        LocalStorageService realStorage = new LocalStorageService(tempDir);
        StorageProperties props = new StorageProperties(tempDir, 10, 100, List.of("exe", "js"));
        FileUploadValidator realValidator = new FileUploadValidator(props);
        MeDocumentService svc = new MeDocumentService(clientRepo, docRepo, realStorage, realValidator);

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "hello".getBytes());

        MyDocumentsDto.Item item = svc.uploadMyDocument(user(7L), 2024, file);

        assertThat(item.filename()).isEqualTo("T4-2024.pdf");
        assertThat(item.uploadedByMe()).isTrue();
        assertThat(item.year()).isEqualTo(2024);

        // file was written to disk
        Path written = tempDir.resolve("clients/99/2024/T4-2024.pdf");
        assertThat(Files.exists(written)).isTrue();
        assertThat(Files.readString(written)).isEqualTo("hello");
    }

    @Test
    void uploadMyDocument_rejectsDuplicate() {
        Client c = client(99L, "Jane");
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(c));

        ClientDocument existing = doc(5L, 99L, 2024, "T4-2024.pdf", "clients/99/2024/T4-2024.pdf");
        when(docRepo.findByClientIdAndYearAndFilename(99L, 2024, "T4-2024.pdf"))
                .thenReturn(Optional.of(existing));

        MockMultipartFile file = new MockMultipartFile(
                "file", "T4-2024.pdf", "application/pdf", "second".getBytes());

        assertThatThrownBy(() -> service.uploadMyDocument(user(7L), 2024, file))
                .isInstanceOf(DocumentNameConflictException.class);

        verify(docRepo, never()).save(any());
    }

    @Test
    void uploadMyDocument_unlinkedUserThrowsPortalNotLinked() {
        when(clientRepo.findByUserId(8L)).thenReturn(Optional.empty());

        MockMultipartFile file = new MockMultipartFile(
                "file", "a.pdf", "application/pdf", "x".getBytes());

        assertThatThrownBy(() -> service.uploadMyDocument(user(8L), 2024, file))
                .isInstanceOf(PortalNotLinkedException.class);
    }

    @Test
    void uploadMyDocument_rejectsBlockedExtension() {
        Client c = client(99L, "Jane");
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(c));

        MockMultipartFile file = new MockMultipartFile(
                "file", "evil.exe", "application/octet-stream", "x".getBytes());

        assertThatThrownBy(() -> service.uploadMyDocument(user(7L), 2024, file))
                .isInstanceOf(FileValidationException.class);

        verify(docRepo, never()).save(any());
    }

    @Test
    void uploadMyDocument_rejectsOversize() {
        Client c = client(99L, "Jane");
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(c));

        byte[] big = new byte[(int) (11L * 1024 * 1024)];
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.pdf", "application/pdf", big);

        assertThatThrownBy(() -> service.uploadMyDocument(user(7L), 2024, file))
                .isInstanceOf(FileValidationException.class);

        verify(docRepo, never()).save(any());
    }
}
