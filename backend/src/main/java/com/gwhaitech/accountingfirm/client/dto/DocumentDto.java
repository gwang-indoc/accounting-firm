package com.gwhaitech.accountingfirm.client.dto;

import java.time.LocalDateTime;

public record DocumentDto(
        Long id,
        String filename,
        String mimeType,
        Long sizeBytes,
        LocalDateTime uploadedAt
) {}
