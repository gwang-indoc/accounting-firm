package com.gwhaitech.accountingfirm.contact.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "contact")
@Validated
public record MailProperties(
    @NotBlank String notificationEmail,
    String fromEmail
) {}
