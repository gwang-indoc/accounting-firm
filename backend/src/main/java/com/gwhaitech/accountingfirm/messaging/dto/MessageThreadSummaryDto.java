package com.gwhaitech.accountingfirm.messaging.dto;

import java.time.LocalDateTime;

public record MessageThreadSummaryDto(
        Long id,
        Long clientId,
        String subject,
        LocalDateTime lastMessageAt,
        int unreadCount,
        int clientUnreadCount,
        String lastSenderType,
        String lastMessagePreview
) {}
