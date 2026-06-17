package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.dto.ExportRequest;
import com.gwhaitech.accountingfirm.client.service.AdminExportService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class AdminExportController {

    private final AdminExportService adminExportService;

    public AdminExportController(AdminExportService adminExportService) {
        this.adminExportService = adminExportService;
    }

    @PostMapping("/export")
    public void export(@RequestBody ExportRequest request,
                       Authentication authentication,
                       HttpServletResponse response) throws IOException {
        Long adminId = adminId(authentication);
        adminExportService.validateRequest(request);
        List<Client> clients = adminExportService.loadOwnedClients(adminId, request.clientIds());
        String today = LocalDate.now().toString();

        if (request.includeMetadata() && !request.includeDocuments()) {
            // CSV only
            String filename = "clients-export-" + today + ".csv";
            response.setContentType("text/csv");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            String csv = adminExportService.buildCsv(clients);
            try (PrintWriter pw = response.getWriter()) {
                pw.write(csv);
            }
        } else if (!request.includeMetadata() && request.includeDocuments()) {
            // ZIP of documents only
            String filename = "documents-export-" + today + ".zip";
            response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            response.setHeader("Content-Type", "application/zip");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            adminExportService.streamDocumentZip(clients, request.year(), response.getOutputStream());
        } else {
            // Combined ZIP
            String filename = "export-" + today + ".zip";
            response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            response.setHeader("Content-Type", "application/zip");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            adminExportService.streamCombinedZip(clients, request.year(), response.getOutputStream());
        }
    }

    @GetMapping("/ids")
    public List<Long> getClientIds(@RequestParam(required = false) String name,
                                   @RequestParam(required = false) String email,
                                   Authentication authentication) {
        return adminExportService.getClientIds(adminId(authentication), name, email);
    }

    private Long adminId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
