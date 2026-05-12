package com.gwhaitech.accountingfirm.contact.dto;

public record ContactSubmissionRequest(
    String name,
    String email,
    String subject,
    String message,
    String companyUrl
) {}
