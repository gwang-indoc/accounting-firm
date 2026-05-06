package com.gwhaitech.accountingfirm.client.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateClientRequest(
        @NotBlank String name,
        String email,
        String phone
) {}
