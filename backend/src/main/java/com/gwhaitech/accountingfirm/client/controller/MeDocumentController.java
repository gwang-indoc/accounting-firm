package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.service.MeDocumentService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/me/documents")
public class MeDocumentController {

    private final MeDocumentService meDocumentService;

    public MeDocumentController(MeDocumentService meDocumentService) {
        this.meDocumentService = meDocumentService;
    }

    @GetMapping
    public ResponseEntity<MyDocumentsDto> listMyDocuments(Authentication authentication) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(meDocumentService.listMyDocuments(user));
    }

    @GetMapping("/zip")
    public ResponseEntity<byte[]> zipForYear(@RequestParam("year") int year,
                                             Authentication authentication) {
        User user = resolveUser(authentication);
        String filename = "GWH-" + year + "-documents.zip";
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        meDocumentService.zipForYear(user, year, buf);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, attachmentDisposition(filename))
                .header(HttpHeaders.CONTENT_TYPE, "application/zip")
                .body(buf.toByteArray());
    }

    @GetMapping("/{docId}/download")
    public ResponseEntity<Resource> downloadMyDocument(@PathVariable Long docId,
                                                       Authentication authentication) {
        User user = resolveUser(authentication);
        MeDocumentService.DownloadInfo info = meDocumentService.getMyDocumentForDownload(user, docId);
        String contentType = info.mimeType() != null ? info.mimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, attachmentDisposition(info.filename()))
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(new FileSystemResource(info.path()));
    }

    /**
     * Builds a Content-Disposition header value with both quoted filename (for legacy clients)
     * and RFC 5987 filename* (for modern clients).
     * Format: attachment; filename="name"; filename*=UTF-8''name
     */
    private static String attachmentDisposition(String filename) {
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encoded;
    }

    private User resolveUser(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof User user && user.getId() != null) {
            return user;
        }
        throw new IllegalStateException("Authenticated user not resolvable — check security configuration");
    }
}
