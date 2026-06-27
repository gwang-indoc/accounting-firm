package com.gwhaitech.accountingfirm.client.dto;

import com.gwhaitech.accountingfirm.client.domain.EngagementStatus;

import java.time.LocalDateTime;

public record EngagementHistoryDto(
        Long id,
        EngagementStatus fromStatus,
        EngagementStatus toStatus,
        Long changedBy,
        LocalDateTime changedAt,
        String note
) {}
