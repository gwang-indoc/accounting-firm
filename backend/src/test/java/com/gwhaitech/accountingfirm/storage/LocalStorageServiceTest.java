package com.gwhaitech.accountingfirm.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LocalStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalStorageService service;

    @BeforeEach
    void setUp() {
        service = new LocalStorageService(tempDir);
    }

    @Test
    void store_createsFileAtExpectedPath() throws Exception {
        long clientId = 42L;
        int year = 2024;
        String filename = "invoice.pdf";
        InputStream content = new ByteArrayInputStream("test content".getBytes());

        service.store(clientId, year, filename, content);

        Path expected = tempDir.resolve("clients").resolve("42").resolve("2024").resolve("invoice.pdf");
        assertTrue(Files.exists(expected), "File should exist at " + expected);
    }

    @Test
    void delete_removesFileAtExpectedPath() throws Exception {
        String filePath = "clients/42/2024/invoice.pdf";
        Path target = tempDir.resolve(filePath);
        Files.createDirectories(target.getParent());
        Files.writeString(target, "dummy");

        service.delete(filePath);

        assertFalse(Files.exists(target), "File should have been deleted at " + target);
    }

    @Test
    void resolve_returnsAbsolutePathForFilePath() {
        String filePath = "clients/42/2024/invoice.pdf";

        Path result = service.resolve(filePath);

        Path expected = tempDir.resolve(filePath).toAbsolutePath();
        assertEquals(expected, result);
    }
}
