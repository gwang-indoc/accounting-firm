package com.gwhaitech.accountingfirm.client.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MyDocumentsDto(
        boolean linked,
        String clientName,
        List<Item> documents
) {
    public record Item(
            Long id,
            int year,
            String filename,
            String mimeType,
            Long sizeBytes,
            LocalDateTime uploadedAt
    ) {}
}
