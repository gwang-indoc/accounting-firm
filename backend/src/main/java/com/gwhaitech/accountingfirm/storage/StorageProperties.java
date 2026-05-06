package com.gwhaitech.accountingfirm.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
        Path uploadDir,
        int maxFileSizeMb,
        int maxFilenameLength,
        String blockedExtensions
) {}
