package com.gwhaitech.accountingfirm.storage;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class LocalStorageService {

    private final Path baseDir;

    public LocalStorageService(Path baseDir) {
        this.baseDir = baseDir;
    }

    public void store(long clientId, int year, String filename, InputStream in) {
        Path target = baseDir
                .resolve("clients")
                .resolve(String.valueOf(clientId))
                .resolve(String.valueOf(year))
                .resolve(filename);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(in, target);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public void delete(String filePath) {
        Path target = baseDir.resolve(filePath);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public Path resolve(String filePath) {
        return baseDir.resolve(filePath).toAbsolutePath();
    }
}
