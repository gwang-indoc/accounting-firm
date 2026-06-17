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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class AdminExportService {

    private static final Logger log = LoggerFactory.getLogger(AdminExportService.class);
    private static final int MAX_CLIENT_IDS = 200;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final ClientRepository clientRepository;
    private final ClientDocumentRepository documentRepository;
    private final LocalStorageService storage;
    private final UserRepository userRepository;

    public AdminExportService(ClientRepository clientRepository,
                              ClientDocumentRepository documentRepository,
                              LocalStorageService storage,
                              UserRepository userRepository) {
        this.clientRepository = clientRepository;
        this.documentRepository = documentRepository;
        this.storage = storage;
        this.userRepository = userRepository;
    }

    public void validateRequest(ExportRequest request) {
        if (request.clientIds() == null || request.clientIds().isEmpty()) {
            throw new ExportValidationException("clientIds must not be empty");
        }
        if (request.clientIds().size() > MAX_CLIENT_IDS) {
            throw new ExportValidationException("Export limited to 200 clients at a time");
        }
        if (!request.includeMetadata() && !request.includeDocuments()) {
            throw new ExportValidationException("At least one of includeMetadata or includeDocuments must be true");
        }
    }

    public void validateOwnership(Long adminId, List<Long> clientIds) {
        List<Client> clients = clientRepository.findAllById(clientIds);
        for (Client c : clients) {
            if (!adminId.equals(c.getAdminId())) {
                throw new ClientAccessDeniedException(c.getId());
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Client> loadOwnedClients(Long adminId, List<Long> clientIds) {
        validateOwnership(adminId, clientIds);
        return clientRepository.findAllById(clientIds);
    }

    public String buildCsv(List<Client> clients) {
        List<Long> linkedUserIds = clients.stream()
                .map(Client::getUserId)
                .filter(id -> id != null)
                .toList();
        Map<Long, String> userEmailById = userRepository.findAllById(linkedUserIds)
                .stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));

        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        pw.print("Name,Email,Phone,Created Date,Linked Portal User Email\r\n");
        for (Client c : clients) {
            String linkedEmail = c.getUserId() != null
                    ? userEmailById.getOrDefault(c.getUserId(), "")
                    : "";
            pw.print(csvField(c.getName()) + ","
                    + csvField(c.getEmail()) + ","
                    + csvField(c.getPhone() != null ? c.getPhone() : "") + ","
                    + csvField(c.getCreatedAt() != null ? c.getCreatedAt().format(DATE_FMT) : "") + ","
                    + csvField(linkedEmail) + "\r\n");
        }
        return sw.toString();
    }

    @Transactional(readOnly = true)
    public void streamDocumentZip(List<Client> clients, Integer year, OutputStream out) {
        int entryCount = 0;
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            for (Client c : clients) {
                List<ClientDocument> docs = year != null
                        ? documentRepository.findByClientIdAndYear(c.getId(), year)
                        : documentRepository.findByClientIdOrderByYearDescUploadedAtDesc(c.getId());
                if (docs.isEmpty()) continue;

                String folderName = sanitizeName(c.getName()) + "-" + c.getId();
                for (ClientDocument d : docs) {
                    String entryName = folderName + "/" + d.getYear() + "/" + d.getFilename();
                    try {
                        zos.putNextEntry(new ZipEntry(entryName));
                        Path source = storage.resolve(d.getFilePath());
                        Files.copy(source, zos);
                        zos.closeEntry();
                        entryCount++;
                    } catch (IOException e) {
                        log.warn("Skipping missing file: {} — {}", d.getFilePath(), e.getMessage());
                    }
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        if (entryCount == 0) {
            throw new ExportValidationException("No documents found for the selected clients and year.");
        }
    }

    @Transactional(readOnly = true)
    public void streamCombinedZip(List<Client> clients, Integer year, OutputStream out) {
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            // Write clients.csv first
            String csv = buildCsv(clients);
            zos.putNextEntry(new ZipEntry("clients.csv"));
            zos.write(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            zos.closeEntry();

            // Write documents
            for (Client c : clients) {
                List<ClientDocument> docs = year != null
                        ? documentRepository.findByClientIdAndYear(c.getId(), year)
                        : documentRepository.findByClientIdOrderByYearDescUploadedAtDesc(c.getId());
                if (docs.isEmpty()) continue;

                String folderName = sanitizeName(c.getName()) + "-" + c.getId();
                for (ClientDocument d : docs) {
                    String entryName = folderName + "/" + d.getYear() + "/" + d.getFilename();
                    try {
                        zos.putNextEntry(new ZipEntry(entryName));
                        Path source = storage.resolve(d.getFilePath());
                        Files.copy(source, zos);
                        zos.closeEntry();
                    } catch (IOException e) {
                        log.warn("Skipping missing file: {} — {}", d.getFilePath(), e.getMessage());
                    }
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional(readOnly = true)
    public List<Long> getClientIds(Long adminId, String name, String email) {
        return clientRepository.findByAdminId(adminId).stream()
                .filter(c -> name == null || c.getName().toLowerCase().contains(name.toLowerCase()))
                .filter(c -> email == null || c.getEmail().toLowerCase().contains(email.toLowerCase()))
                .map(Client::getId)
                .toList();
    }

    private static String sanitizeName(String name) {
        return name.replaceAll("[/\\\\:*?\"<>|]", "_");
    }

    private static String csvField(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
