package com.gwhaitech.accountingfirm.client.dto;

import com.gwhaitech.accountingfirm.client.domain.EngagementStatus;

import java.time.LocalDateTime;

public record EngagementDto(
        Long id,
        Long clientId,
        Short taxYear,
        EngagementStatus status,
        Long updatedBy,
        LocalDateTime updatedAt
) {}
