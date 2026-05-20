package com.gwhaitech.accountingfirm.messaging.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MessageThreadDto(
        Long id,
        Long clientId,
        String subject,
        LocalDateTime createdAt,
        LocalDateTime lastMessageAt,
        int adminUnreadCount,
        int clientUnreadCount,
        List<MessageDto> messages
) {}
