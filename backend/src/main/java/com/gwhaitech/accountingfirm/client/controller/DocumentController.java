package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.DocumentDto;
import com.gwhaitech.accountingfirm.client.dto.DocumentUploadResult;
import com.gwhaitech.accountingfirm.client.service.DocumentService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

@RestController
@RequestMapping("/api/clients/{clientId}/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<DocumentDto> upload(@PathVariable Long clientId,
                                              @RequestParam("year") int year,
                                              @RequestParam("file") MultipartFile file,
                                              Authentication authentication) {
        long uploadedBy = resolveUserId(authentication);
        DocumentUploadResult result;
        try {
            result = documentService.upload(
                    clientId,
                    year,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    file.getInputStream(),
                    uploadedBy);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        int status = result.isNew() ? 201 : 200;
        return ResponseEntity.status(status).body(result.document());
    }

    @GetMapping
    public ResponseEntity<List<DocumentDto>> list(@PathVariable Long clientId,
                                                  @RequestParam("year") int year) {
        return ResponseEntity.ok(documentService.listDocuments(clientId, year));
    }

    @GetMapping("/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long clientId,
                                             @PathVariable Long docId) {
        DocumentDto dto = documentService.getDocument(docId);
        Resource resource = documentService.getDocumentForDownload(docId);
        String contentType = dto.mimeType() != null
                ? dto.mimeType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + dto.filename() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(resource);
    }

    @DeleteMapping("/{docId}")
    public ResponseEntity<Void> delete(@PathVariable Long clientId,
                                       @PathVariable Long docId) {
        documentService.deleteDocument(docId);
        return ResponseEntity.noContent().build();
    }

    private long resolveUserId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        return 0L;
    }
}
