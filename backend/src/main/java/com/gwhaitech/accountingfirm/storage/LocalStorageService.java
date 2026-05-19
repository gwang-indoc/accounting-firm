package com.gwhaitech.accountingfirm.storage;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Objects;

@Service
public class LocalStorageService {

    private final Path baseDir;

    public LocalStorageService(Path baseDir) {
        this.baseDir = baseDir;
    }

    public static String relativePath(long clientId, int year, String filename) {
        return "clients/" + clientId + "/" + year + "/" + filename;
    }

    public void store(long clientId, int year, String filename, InputStream in) {
        Objects.requireNonNull(in, "InputStream must not be null");
        Path target = baseDir.resolve(relativePath(clientId, year, filename));
        try {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // filePath must come from the database (written by store()) — never pass raw user input directly
    public void delete(String filePath) {
        Path target = baseDir.resolve(filePath);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // filePath must come from the database (written by store()) — never pass raw user input directly
    public Path resolve(String filePath) {
        return baseDir.resolve(filePath).toAbsolutePath();
    }
}
