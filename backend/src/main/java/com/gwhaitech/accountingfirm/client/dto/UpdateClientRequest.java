package com.gwhaitech.accountingfirm.client.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateClientRequest(
        @NotBlank String name,
        String email,
        String phone
) {}
