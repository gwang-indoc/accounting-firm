package com.gwhaitech.accountingfirm.auth.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank String fullName,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8) String password,
    @NotBlank String confirmPassword
) {}
