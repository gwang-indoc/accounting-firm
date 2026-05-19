package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.DocumentDto;
import com.gwhaitech.accountingfirm.client.dto.DocumentUploadResult;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.storage.FileUploadValidator;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;

@Service
public class DocumentService {

    private final LocalStorageService localStorageService;
    private final ClientDocumentRepository clientDocumentRepository;
    private final ClientRepository clientRepository;
    private final FileUploadValidator fileUploadValidator;

    public DocumentService(LocalStorageService localStorageService,
                           ClientDocumentRepository clientDocumentRepository,
                           ClientRepository clientRepository,
                           FileUploadValidator fileUploadValidator) {
        this.localStorageService = localStorageService;
        this.clientDocumentRepository = clientDocumentRepository;
        this.clientRepository = clientRepository;
        this.fileUploadValidator = fileUploadValidator;
    }

    @Transactional
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
        fileUploadValidator.validate(filename, sizeBytes);

        String filePath = LocalStorageService.relativePath(clientId, year, filename);
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
        // Save to DB first — if the file write subsequently fails, @Transactional rolls back the DB row
        ClientDocument saved = clientDocumentRepository.save(doc);
        localStorageService.store(clientId, year, filename, in);
        return new DocumentUploadResult(toDto(saved), isNew);
    }

    @Transactional(readOnly = true)
    public List<DocumentDto> listDocuments(long clientId, int year) {
        if (!clientRepository.existsById(clientId)) {
            throw new ClientNotFoundException(clientId);
        }
        return clientDocumentRepository.findByClientIdAndYear(clientId, year).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void deleteDocument(long docId) {
        ClientDocument doc = clientDocumentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        String filePath = doc.getFilePath();
        // Delete DB record first — if file delete fails, @Transactional rolls back the DB delete
        clientDocumentRepository.delete(doc);
        localStorageService.delete(filePath);
    }

    @Transactional(readOnly = true)
    public DocumentDto getDocument(long docId) {
        ClientDocument doc = clientDocumentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        return toDto(doc);
    }

    @Transactional(readOnly = true)
    public Resource getDocumentForDownload(long docId) {
        ClientDocument doc = clientDocumentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        return new FileSystemResource(localStorageService.resolve(doc.getFilePath()));
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
