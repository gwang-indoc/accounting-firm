package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import com.gwhaitech.accountingfirm.storage.FileUploadValidator;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class MeDocumentService {

    private final ClientRepository clientRepository;
    private final ClientDocumentRepository documentRepository;
    private final LocalStorageService storage;
    private final FileUploadValidator fileUploadValidator;

    public MeDocumentService(ClientRepository clientRepository,
                             ClientDocumentRepository documentRepository,
                             LocalStorageService storage,
                             FileUploadValidator fileUploadValidator) {
        this.clientRepository = clientRepository;
        this.documentRepository = documentRepository;
        this.storage = storage;
        this.fileUploadValidator = fileUploadValidator;
    }

    @Transactional(readOnly = true)
    public MyDocumentsDto listMyDocuments(User user) {
        Optional<Client> client = clientRepository.findByUserId(user.getId());
        if (client.isEmpty()) {
            return new MyDocumentsDto(false, null, List.of());
        }
        Client c = client.get();
        List<MyDocumentsDto.Item> items = documentRepository
                .findByClientIdOrderByYearDescUploadedAtDesc(c.getId())
                .stream()
                .map(d -> new MyDocumentsDto.Item(
                        d.getId(),
                        (int) d.getYear(),
                        d.getFilename(),
                        d.getMimeType(),
                        d.getSizeBytes(),
                        d.getUploadedAt(),
                        d.getUploadedBy() != null && user.getId().equals(d.getUploadedBy())))
                .toList();
        return new MyDocumentsDto(true, c.getName(), items);
    }

    @Transactional
    public MyDocumentsDto.Item uploadMyDocument(User user, int year, MultipartFile file) {
        Client client = clientRepository.findByUserId(user.getId())
                .orElseThrow(PortalNotLinkedException::new);

        String filename = file.getOriginalFilename();
        fileUploadValidator.validate(filename, file.getSize());

        documentRepository
                .findByClientIdAndYearAndFilename(client.getId(), year, filename)
                .ifPresent(existing -> { throw new DocumentNameConflictException(filename, year); });

        ClientDocument doc = new ClientDocument();
        doc.setClientId(client.getId());
        doc.setYear((short) year);
        doc.setFilename(filename);
        doc.setFilePath(LocalStorageService.relativePath(client.getId(), year, filename));
        doc.setMimeType(file.getContentType());
        doc.setSizeBytes(file.getSize());
        doc.setUploadedBy(user.getId());
        doc.setUploadedAt(LocalDateTime.now()); // set before save so the returned item matches DB
        ClientDocument saved = documentRepository.save(doc);

        try {
            storage.store(client.getId(), year, filename, file.getInputStream());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        return new MyDocumentsDto.Item(
                saved.getId(),
                (int) saved.getYear(),
                saved.getFilename(),
                saved.getMimeType(),
                saved.getSizeBytes(),
                saved.getUploadedAt(),
                true);
    }

    @Transactional(readOnly = true)
    public void zipForYear(User user, int year, OutputStream out) {
        Client client = clientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new DocumentNotFoundException("No documents for user"));
        List<ClientDocument> docs = documentRepository
                .findByClientIdAndYearOrderByUploadedAtDesc(client.getId(), year);
        if (docs.isEmpty()) {
            throw new DocumentNotFoundException("No documents for year " + year);
        }
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            for (ClientDocument d : docs) {
                ZipEntry entry = new ZipEntry(year + "/" + d.getFilename());
                zos.putNextEntry(entry);
                Path source = storage.resolve(d.getFilePath());
                Files.copy(source, zos);
                zos.closeEntry();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional(readOnly = true)
    public DownloadInfo getMyDocumentForDownload(User user, long docId) {
        Client client = clientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        ClientDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        if (!doc.getClientId().equals(client.getId())) {
            throw new DocumentNotFoundException("Document not found: " + docId);
        }
        return new DownloadInfo(doc.getFilename(), doc.getMimeType(), storage.resolve(doc.getFilePath()));
    }

    public record DownloadInfo(String filename, String mimeType, Path path) {}
}
