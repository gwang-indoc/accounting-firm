package com.gwhaitech.accountingfirm.client.dto;

import jakarta.validation.constraints.NotNull;

public record CreateEngagementRequest(
        @NotNull Integer taxYear
) {}
