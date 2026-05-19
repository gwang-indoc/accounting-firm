package com.gwhaitech.accountingfirm.storage;

import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileUploadValidatorTest {

    private final StorageProperties props = new StorageProperties(
            Path.of("/tmp/uploads"), 10, 100, List.of("exe", "js"));
    private final FileUploadValidator validator = new FileUploadValidator(props);

    @Test
    void validate_acceptsHappyPath() {
        validator.validate("T4-2024.pdf", 500_000L);
        // no exception
    }

    @Test
    void validate_rejectsEmptyFilename() {
        assertThatThrownBy(() -> validator.validate("", 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("must not be empty");
    }

    @Test
    void validate_rejectsNullFilename() {
        assertThatThrownBy(() -> validator.validate(null, 1L))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_rejectsOversizeFilename() {
        String tooLong = "a".repeat(101) + ".pdf";
        assertThatThrownBy(() -> validator.validate(tooLong, 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("exceeds max length");
    }

    @Test
    void validate_rejectsPathTraversal() {
        assertThatThrownBy(() -> validator.validate("../secrets.pdf", 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("illegal path characters");
        assertThatThrownBy(() -> validator.validate("a/b.pdf", 1L))
                .isInstanceOf(FileValidationException.class);
        assertThatThrownBy(() -> validator.validate("a\\b.pdf", 1L))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_rejectsBlockedExtension() {
        assertThatThrownBy(() -> validator.validate("evil.exe", 1L))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("Blocked file extension: .exe");
        assertThatThrownBy(() -> validator.validate("Evil.EXE", 1L))
                .isInstanceOf(FileValidationException.class);
    }

    @Test
    void validate_allowsExtensionlessFile() {
        validator.validate("README", 1L);
    }

    @Test
    void validate_rejectsOversizeBytes() {
        long oversize = 11L * 1024 * 1024;
        assertThatThrownBy(() -> validator.validate("ok.pdf", oversize))
                .isInstanceOf(FileValidationException.class)
                .hasMessageContaining("exceeds max size of 10 MB");
    }

    @Test
    void validate_treatsTrailingDotAsExtensionless() {
        // "foo." — extension is empty → allowed (no blocked-extension check applies)
        validator.validate("foo.", 1L);
    }
}
