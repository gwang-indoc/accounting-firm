package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.DocumentDto;
import com.gwhaitech.accountingfirm.client.dto.DocumentUploadResult;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.storage.FileUploadValidator;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private LocalStorageService localStorageService;

    @Mock
    private ClientDocumentRepository clientDocumentRepository;

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private FileUploadValidator fileUploadValidator;

    @InjectMocks
    private DocumentService documentService;

    private ClientDocument sampleDoc(Long id, String filename) {
        ClientDocument doc = new ClientDocument();
        doc.setId(id);
        doc.setClientId(1L);
        doc.setYear((short) 2025);
        doc.setFilename(filename);
        doc.setFilePath("clients/1/2025/" + filename);
        doc.setMimeType("application/pdf");
        doc.setSizeBytes(1024L);
        doc.setUploadedBy(1L);
        doc.setUploadedAt(LocalDateTime.of(2026, 1, 1, 0, 0));
        return doc;
    }

    private MockMultipartFile pdf(String filename) {
        return new MockMultipartFile("file", filename, "application/pdf", "content".getBytes());
    }

    @Test
    void upload_newFile_storesFileAndCreatesRecord() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        when(clientDocumentRepository.findByClientIdAndYearAndFilename(1L, 2025, "tax.pdf"))
                .thenReturn(Optional.empty());
        when(clientDocumentRepository.save(any(ClientDocument.class)))
                .thenAnswer(inv -> {
                    ClientDocument c = inv.getArgument(0);
                    c.setId(42L);
                    return c;
                });

        DocumentUploadResult result = documentService.upload(1L, 2025, pdf("tax.pdf"), 7L);

        verify(localStorageService).store(eq(1L), eq(2025), eq("tax.pdf"), any());
        verify(clientDocumentRepository).save(any(ClientDocument.class));
        assertThat(result.isNew()).isTrue();
        assertThat(result.document().filename()).isEqualTo("tax.pdf");
    }

    @Test
    void upload_existingFile_overwritesAndUpdatesRecord() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        ClientDocument existing = sampleDoc(99L, "tax.pdf");
        when(clientDocumentRepository.findByClientIdAndYearAndFilename(1L, 2025, "tax.pdf"))
                .thenReturn(Optional.of(existing));
        when(clientDocumentRepository.save(any(ClientDocument.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile newFile = new MockMultipartFile(
                "file", "tax.pdf", "application/pdf", "new-content".getBytes());
        DocumentUploadResult result = documentService.upload(1L, 2025, newFile, 7L);

        verify(localStorageService).store(eq(1L), eq(2025), eq("tax.pdf"), any());
        verify(clientDocumentRepository).save(any(ClientDocument.class));
        assertThat(result.isNew()).isFalse();
        assertThat(existing.getSizeBytes()).isEqualTo(newFile.getSize());
    }

    @Test
    void upload_disallowedExtension_throwsFileValidationException() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        doThrow(new FileValidationException("File type not allowed"))
                .when(fileUploadValidator).validate(any(MultipartFile.class));

        assertThatThrownBy(() -> documentService.upload(
                1L, 2025,
                new MockMultipartFile("file", "malware.exe", "application/octet-stream", "bad".getBytes()),
                7L))
                .isInstanceOf(FileValidationException.class);

        verify(localStorageService, never()).store(anyLong(), anyInt(), anyString(), any());
    }

    @Test
    void upload_filenameTooLong_throwsFileValidationException() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        doThrow(new FileValidationException("Filename exceeds max length"))
                .when(fileUploadValidator).validate(any(MultipartFile.class));

        assertThatThrownBy(() -> documentService.upload(
                1L, 2025,
                new MockMultipartFile("file", "way-too-long.pdf", "application/pdf", "data".getBytes()),
                7L))
                .isInstanceOf(FileValidationException.class);

        verify(localStorageService, never()).store(anyLong(), anyInt(), anyString(), any());
    }

    @Test
    void upload_fileTooLarge_throwsFileValidationException() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        doThrow(new FileValidationException("File exceeds max size of 1 MB"))
                .when(fileUploadValidator).validate(any(MultipartFile.class));

        assertThatThrownBy(() -> documentService.upload(
                1L, 2025,
                new MockMultipartFile("file", "big.pdf", "application/pdf", new byte[2 * 1024 * 1024]),
                7L))
                .isInstanceOf(FileValidationException.class);

        verify(localStorageService, never()).store(anyLong(), anyInt(), anyString(), any());
    }

    @Test
    void upload_filenameWithPathTraversal_throwsFileValidationException() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        doThrow(new FileValidationException("Filename contains illegal path characters"))
                .when(fileUploadValidator).validate(any(MultipartFile.class));

        assertThatThrownBy(() -> documentService.upload(
                1L, 2025,
                new MockMultipartFile("file", "../etc/passwd", "text/plain", "data".getBytes()),
                7L))
                .isInstanceOf(FileValidationException.class);

        verify(localStorageService, never()).store(anyLong(), anyInt(), anyString(), any());
    }

    @Test
    void upload_clientNotFound_throwsClientNotFoundException() {
        when(clientRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> documentService.upload(99L, 2025, pdf("tax.pdf"), 7L))
                .isInstanceOf(ClientNotFoundException.class);

        verify(localStorageService, never()).store(anyLong(), anyInt(), anyString(), any());
    }

    @Test
    void listDocuments_returnsDocumentDtos() {
        when(clientRepository.existsById(1L)).thenReturn(true);
        when(clientDocumentRepository.findByClientIdAndYear(1L, 2025))
                .thenReturn(List.of(sampleDoc(1L, "a.pdf"), sampleDoc(2L, "b.pdf")));

        List<DocumentDto> result = documentService.listDocuments(1L, 2025);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).filename()).isEqualTo("a.pdf");
        assertThat(result.get(1).filename()).isEqualTo("b.pdf");
    }

    @Test
    void listDocuments_clientNotFound_throwsClientNotFoundException() {
        when(clientRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> documentService.listDocuments(99L, 2025))
                .isInstanceOf(ClientNotFoundException.class);
    }

    @Test
    void deleteDocument_removesFileAndRecord() {
        ClientDocument doc = sampleDoc(1L, "tax.pdf");
        when(clientDocumentRepository.findById(1L)).thenReturn(Optional.of(doc));

        documentService.deleteDocument(1L);

        verify(localStorageService).delete("clients/1/2025/tax.pdf");
        verify(clientDocumentRepository).delete(doc);
    }

    @Test
    void deleteDocument_notFound_throwsDocumentNotFoundException() {
        when(clientDocumentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.deleteDocument(1L))
                .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void getDocument_returnsDocumentDto() {
        ClientDocument doc = sampleDoc(1L, "tax.pdf");
        when(clientDocumentRepository.findById(1L)).thenReturn(Optional.of(doc));

        DocumentDto dto = documentService.getDocument(1L);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.filename()).isEqualTo("tax.pdf");
    }

    @Test
    void getDocument_notFound_throwsDocumentNotFoundException() {
        when(clientDocumentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.getDocument(1L))
                .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void getDocumentForDownload_returnsResourceForExistingDoc() {
        ClientDocument doc = sampleDoc(1L, "tax.pdf");
        when(clientDocumentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(localStorageService.resolve("clients/1/2025/tax.pdf"))
                .thenReturn(Path.of("/tmp/clients/1/2025/tax.pdf"));

        Resource resource = documentService.getDocumentForDownload(1L);

        verify(localStorageService).resolve("clients/1/2025/tax.pdf");
        assertThat(resource).isNotNull();
        assertThat(resource.getFilename()).isEqualTo("tax.pdf");
    }

    @Test
    void getDocumentForDownload_notFound_throwsDocumentNotFoundException() {
        when(clientDocumentRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentService.getDocumentForDownload(1L))
                .isInstanceOf(DocumentNotFoundException.class);
    }
}
