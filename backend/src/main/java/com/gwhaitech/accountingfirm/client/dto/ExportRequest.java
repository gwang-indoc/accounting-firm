package com.gwhaitech.accountingfirm.client.dto;

import java.util.List;

public record ExportRequest(
        List<Long> clientIds,
        boolean includeMetadata,
        boolean includeDocuments,
        Integer year
) {}
