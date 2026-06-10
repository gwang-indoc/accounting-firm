package com.gwhaitech.accountingfirm.messaging.dto;

import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
import java.time.LocalDateTime;

public record MessageDto(
        Long id,
        Long threadId,
        SenderType senderType,
        Long senderUserId,
        String body,
        LocalDateTime sentAt
) {}
