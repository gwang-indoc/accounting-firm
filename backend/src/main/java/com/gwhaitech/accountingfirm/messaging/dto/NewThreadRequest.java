package com.gwhaitech.accountingfirm.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewThreadRequest(
        @NotBlank @Size(max = 200) String subject,
        @NotBlank @Size(max = 5000) String body
) {}
