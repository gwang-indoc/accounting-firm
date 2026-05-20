package com.gwhaitech.accountingfirm.messaging.service;

import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.messaging.domain.*;
import com.gwhaitech.accountingfirm.messaging.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessagingService {

    private final MessageThreadRepository threadRepo;
    private final MessageRepository messageRepo;
    private final ClientRepository clientRepo;

    public MessagingService(MessageThreadRepository threadRepo,
                            MessageRepository messageRepo,
                            ClientRepository clientRepo) {
        this.threadRepo = threadRepo;
        this.messageRepo = messageRepo;
        this.clientRepo = clientRepo;
    }

    @Transactional
    public MessageThreadDto createThreadAsAdmin(Long clientId, String subject, String body, Long adminUserId) {
        clientRepo.findById(clientId)
                .orElseThrow(() -> new ClientNotFoundException(clientId));

        MessageThread t = new MessageThread();
        t.setClientId(clientId);
        t.setSubject(subject);
        t.setClientUnreadCount(1);
        t.setLastMessageAt(LocalDateTime.now());
        MessageThread saved = threadRepo.save(t);

        Message m = new Message();
        m.setThreadId(saved.getId());
        m.setSenderType(SenderType.ADMIN);
        m.setSenderUserId(adminUserId);
        m.setBody(body);
        messageRepo.save(m);

        return toThreadDto(saved, List.of(toMessageDto(m)));
    }

    private MessageDto toMessageDto(Message m) {
        return new MessageDto(m.getId(), m.getThreadId(), m.getSenderType(),
                m.getSenderUserId(), m.getBody(), m.getSentAt());
    }

    private MessageThreadDto toThreadDto(MessageThread t, List<MessageDto> messages) {
        return new MessageThreadDto(t.getId(), t.getClientId(), t.getSubject(),
                t.getCreatedAt(), t.getLastMessageAt(),
                t.getAdminUnreadCount(), t.getClientUnreadCount(), messages);
    }
}
