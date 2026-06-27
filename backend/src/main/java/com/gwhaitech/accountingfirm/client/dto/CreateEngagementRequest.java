package com.gwhaitech.accountingfirm.client.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateEngagementRequest(
        @NotNull Integer taxYear,
        @NotBlank String name
) {}
