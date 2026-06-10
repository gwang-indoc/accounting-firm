package com.gwhaitech.accountingfirm.storage;

import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.apache.tika.Tika;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class FileUploadValidator {

    // Layer 2: declared Content-Type header. application/zip accepted for OOXML (browsers send this).
    private static final Map<String, List<String>> ALLOWED_MIME_TYPES = Map.ofEntries(
            Map.entry("pdf",  List.of("application/pdf")),
            Map.entry("jpg",  List.of("image/jpeg")),
            Map.entry("jpeg", List.of("image/jpeg")),
            Map.entry("png",  List.of("image/png")),
            Map.entry("xlsx", List.of(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/zip")),
            Map.entry("xls",  List.of("application/vnd.ms-excel")),
            Map.entry("csv",  List.of("text/csv", "text/plain")),
            Map.entry("doc",  List.of("application/msword")),
            Map.entry("docx", List.of(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/zip"))
    );

    // Layer 3: Tika-detected actual content type. Stricter — application/zip not accepted for OOXML.
    private static final Map<String, List<String>> ALLOWED_ACTUAL_MIME_TYPES = Map.ofEntries(
            Map.entry("pdf",  List.of("application/pdf")),
            Map.entry("jpg",  List.of("image/jpeg")),
            Map.entry("jpeg", List.of("image/jpeg")),
            Map.entry("png",  List.of("image/png")),
            Map.entry("xlsx", List.of(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
            Map.entry("xls",  List.of("application/vnd.ms-excel")),
            Map.entry("csv",  List.of("text/csv", "text/plain")),
            Map.entry("doc",  List.of("application/msword")),
            Map.entry("docx", List.of(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
    );

    private static final Tika TIKA = new Tika();

    private final StorageProperties storageProperties;

    public FileUploadValidator(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    public void validate(MultipartFile file) {
        String filename = file.getOriginalFilename();
        validateFilename(filename);
        validateExtension(filename);
        validateSize(file.getSize());
        validateDeclaredMimeType(filename, file.getContentType());
        validateActualMimeType(filename, file);
    }

    private void validateFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new FileValidationException("Filename must not be empty");
        }
        if (filename.length() > storageProperties.maxFilenameLength()) {
            throw new FileValidationException(
                    "Filename exceeds max length of " + storageProperties.maxFilenameLength());
        }
        if (filename.contains("/") || filename.contains("\\") || filename.contains("..")) {
            throw new FileValidationException("Filename contains illegal path characters");
        }
    }

    private void validateExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new FileValidationException("File type not allowed. Allowed types: "
                    + String.join(", ", storageProperties.allowedExtensions()));
        }
        String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!storageProperties.allowedExtensions().contains(ext)) {
            throw new FileValidationException("File type not allowed. Allowed types: "
                    + String.join(", ", storageProperties.allowedExtensions()));
        }
    }

    private void validateDeclaredMimeType(String filename, String contentType) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return;
        String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        List<String> allowed = ALLOWED_MIME_TYPES.get(ext);
        if (allowed == null) return;
        String declared = contentType != null ? contentType.split(";")[0].trim().toLowerCase(Locale.ROOT) : "";
        if (!allowed.contains(declared)) {
            throw new FileValidationException(
                    "Declared content type '" + declared + "' is not valid for ." + ext + " files");
        }
    }

    private void validateActualMimeType(String filename, MultipartFile file) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) return;
        String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        List<String> allowed = ALLOWED_ACTUAL_MIME_TYPES.get(ext);
        if (allowed == null) return;
        try (InputStream in = file.getInputStream()) {
            // Detect without filename so the result reflects actual bytes, not the extension hint
            String detected = TIKA.detect(in);
            if (!allowed.contains(detected)) {
                throw new FileValidationException("File content does not match its extension");
            }
        } catch (FileValidationException e) {
            throw e;
        } catch (IOException e) {
            throw new FileValidationException("Could not read file content for validation");
        }
    }

    private void validateSize(long sizeBytes) {
        long maxBytes = storageProperties.maxFileSizeMb() * 1024L * 1024L;
        if (sizeBytes > maxBytes) {
            throw new FileValidationException(
                    "File exceeds max size of " + storageProperties.maxFileSizeMb() + " MB");
        }
    }
}
