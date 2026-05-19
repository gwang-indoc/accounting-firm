package com.gwhaitech.accountingfirm.storage;

import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class FileUploadValidator {

    private final StorageProperties storageProperties;

    public FileUploadValidator(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    public void validate(String filename, long sizeBytes) {
        validateFilename(filename);
        validateExtension(filename);
        validateSize(sizeBytes);
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
}
