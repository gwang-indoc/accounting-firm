package com.gwhaitech.accountingfirm.client.dto;

import com.gwhaitech.accountingfirm.client.domain.EngagementStatus;
import jakarta.validation.constraints.NotNull;

public record TransitionStatusRequest(
        @NotNull EngagementStatus status,
        String note
) {}
