package com.gwhaitech.accountingfirm.client.dto;

import com.gwhaitech.accountingfirm.client.domain.BusinessType;

import java.time.LocalDateTime;

public record ClientDto(
        Long id,
        String name,
        String email,
        String phone,
        LocalDateTime createdAt,
        Long linkedUserId,
        Long adminId,
        BusinessType businessType,
        Integer fiscalYearEndMonth,
        Integer fiscalYearEndDay
) {}
