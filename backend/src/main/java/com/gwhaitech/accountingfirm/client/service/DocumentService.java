package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.DocumentDto;
import com.gwhaitech.accountingfirm.client.dto.DocumentUploadResult;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import com.gwhaitech.accountingfirm.storage.StorageProperties;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;
import java.util.Locale;

@Service
public class DocumentService {

    private final LocalStorageService localStorageService;
    private final ClientDocumentRepository clientDocumentRepository;
    private final ClientRepository clientRepository;
    private final StorageProperties storageProperties;

    public DocumentService(LocalStorageService localStorageService,
                           ClientDocumentRepository clientDocumentRepository,
                           ClientRepository clientRepository,
                           StorageProperties storageProperties) {
        this.localStorageService = localStorageService;
        this.clientDocumentRepository = clientDocumentRepository;
        this.clientRepository = clientRepository;
        this.storageProperties = storageProperties;
    }

    public DocumentUploadResult upload(long clientId,
                                       int year,
                                       String filename,
                                       String mimeType,
                                       long sizeBytes,
                                       InputStream in,
                                       long uploadedBy) {
        if (!clientRepository.existsById(clientId)) {
            throw new ClientNotFoundException(clientId);
        }
        validateFilename(filename);
        validateExtension(filename);
        validateSize(sizeBytes);

        localStorageService.store(clientId, year, filename, in);

        String filePath = "clients/" + clientId + "/" + year + "/" + filename;
        var existingOpt = clientDocumentRepository
                .findByClientIdAndYearAndFilename(clientId, year, filename);

        ClientDocument doc;
        boolean isNew;
        if (existingOpt.isPresent()) {
            doc = existingOpt.get();
            doc.setMimeType(mimeType);
            doc.setSizeBytes(sizeBytes);
            doc.setUploadedBy(uploadedBy);
            isNew = false;
        } else {
            doc = new ClientDocument();
            doc.setClientId(clientId);
            doc.setYear((short) year);
            doc.setFilename(filename);
            doc.setFilePath(filePath);
            doc.setMimeType(mimeType);
            doc.setSizeBytes(sizeBytes);
            doc.setUploadedBy(uploadedBy);
            isNew = true;
        }
        ClientDocument saved = clientDocumentRepository.save(doc);
        return new DocumentUploadResult(toDto(saved), isNew);
    }

    public List<DocumentDto> listDocuments(long clientId, int year) {
        if (!clientRepository.existsById(clientId)) {
            throw new ClientNotFoundException(clientId);
        }
        return clientDocumentRepository.findByClientIdAndYear(clientId, year).stream()
                .map(this::toDto)
                .toList();
    }

    public void deleteDocument(long docId) {
        ClientDocument doc = clientDocumentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        localStorageService.delete(doc.getFilePath());
        clientDocumentRepository.delete(doc);
    }

    public DocumentDto getDocument(long docId) {
        ClientDocument doc = clientDocumentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        return toDto(doc);
    }

    public Resource getDocumentForDownload(long docId) {
        ClientDocument doc = clientDocumentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        return new FileSystemResource(localStorageService.resolve(doc.getFilePath()));
    }

    private void validateFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new FileValidationException("Filename must not be empty");
        }
        if (filename.length() > storageProperties.maxFilenameLength()) {
            throw new FileValidationException(
                    "Filename exceeds max length of " + storageProperties.maxFilenameLength());
        }
    }

    private void validateExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return;
        }
        String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (storageProperties.blockedExtensions().contains(ext)) {
            throw new FileValidationException("Blocked file extension: ." + ext);
        }
    }

    private void validateSize(long sizeBytes) {
        long maxBytes = storageProperties.maxFileSizeMb() * 1024L * 1024L;
        if (sizeBytes > maxBytes) {
            throw new FileValidationException(
                    "File exceeds max size of " + storageProperties.maxFileSizeMb() + " MB");
        }
    }

    private DocumentDto toDto(ClientDocument doc) {
        return new DocumentDto(
                doc.getId(),
                doc.getFilename(),
                doc.getMimeType(),
                doc.getSizeBytes(),
                doc.getUploadedAt()
        );
    }
}
