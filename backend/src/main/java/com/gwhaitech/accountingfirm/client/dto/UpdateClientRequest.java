package com.gwhaitech.accountingfirm.client.dto;

import com.gwhaitech.accountingfirm.client.domain.BusinessType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateClientRequest(
        @NotBlank String name,
        String email,
        String phone,
        @NotNull BusinessType businessType,
        Integer fiscalYearEndMonth,
        Integer fiscalYearEndDay
) {}
