package com.gwhaitech.accountingfirm.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewMessageRequest(@NotBlank @Size(max = 5000) String body) {}
