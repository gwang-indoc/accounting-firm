package com.gwhaitech.accountingfirm.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;
import java.util.List;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
        Path uploadDir,
        int maxFileSizeMb,
        int maxFilenameLength,
        List<String> allowedExtensions
) {}
