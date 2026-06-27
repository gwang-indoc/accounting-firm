package com.gwhaitech.accountingfirm.client.dto;

import com.gwhaitech.accountingfirm.client.domain.BusinessType;
import com.gwhaitech.accountingfirm.client.domain.EngagementStatus;

import java.time.LocalDateTime;

public record EngagementDashboardDto(
        Long id,
        Long clientId,
        String clientName,
        BusinessType businessType,
        Short taxYear,
        EngagementStatus status,
        LocalDateTime updatedAt,
        String updatedByName
) {}
