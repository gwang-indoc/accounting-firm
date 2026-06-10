package com.gwhaitech.accountingfirm.storage;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StoragePropertiesTest {

    @Test
    void allowedExtensions_returnsConfiguredList() {
        StorageProperties props = new StorageProperties(
                Path.of("/tmp/uploads"), 10, 100,
                List.of("pdf", "jpg", "png"));

        assertThat(props.allowedExtensions()).containsExactly("pdf", "jpg", "png");
    }

    @Test
    void allowedExtensions_defaultsMatchExpected() {
        List<String> expected = List.of(
                "pdf", "jpg", "jpeg", "png", "xlsx", "xls", "csv", "doc", "docx");
        StorageProperties props = new StorageProperties(
                Path.of("/tmp/uploads"), 10, 100, expected);

        assertThat(props.allowedExtensions()).containsExactlyInAnyOrderElementsOf(expected);
    }
}
