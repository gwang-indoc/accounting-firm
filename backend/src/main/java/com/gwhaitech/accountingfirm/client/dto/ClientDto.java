package com.gwhaitech.accountingfirm.client.dto;

import java.time.LocalDateTime;

public record ClientDto(
        Long id,
        String name,
        String email,
        String phone,
        LocalDateTime createdAt
) {}
