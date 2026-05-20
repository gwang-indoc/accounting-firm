package com.gwhaitech.accountingfirm.messaging.service;

import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.messaging.domain.*;
import com.gwhaitech.accountingfirm.messaging.dto.*;
import com.gwhaitech.accountingfirm.messaging.event.MessagePostedEvent;
import com.gwhaitech.accountingfirm.messaging.exception.NoLinkedClientException;
import com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException;
import com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessagingService {

    private final MessageThreadRepository threadRepo;
    private final MessageRepository messageRepo;
    private final ClientRepository clientRepo;
    private final ApplicationEventPublisher eventPublisher;

    public MessagingService(MessageThreadRepository threadRepo,
                            MessageRepository messageRepo,
                            ClientRepository clientRepo,
                            ApplicationEventPublisher eventPublisher) {
        this.threadRepo = threadRepo;
        this.messageRepo = messageRepo;
        this.clientRepo = clientRepo;
        this.eventPublisher = eventPublisher;
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
        eventPublisher.publishEvent(new MessagePostedEvent(saved, m));

        return toThreadDto(saved, List.of(toMessageDto(m)));
    }

    @Transactional
    public MessageThreadDto createThreadAsClient(Long callerUserId, String subject, String body) {
        var client = clientRepo.findByUserId(callerUserId)
                .orElseThrow(NoLinkedClientException::new);
        MessageThread t = new MessageThread();
        t.setClientId(client.getId());
        t.setSubject(subject);
        t.setAdminUnreadCount(1);
        t.setLastMessageAt(java.time.LocalDateTime.now());
        MessageThread saved = threadRepo.save(t);

        Message m = new Message();
        m.setThreadId(saved.getId());
        m.setSenderType(SenderType.CLIENT);
        m.setSenderUserId(callerUserId);
        m.setBody(body);
        messageRepo.save(m);
        eventPublisher.publishEvent(new MessagePostedEvent(saved, m));

        return toThreadDto(saved, java.util.List.of(toMessageDto(m)));
    }

    @Transactional
    public MessageDto postAdminReply(Long clientId, Long threadId, String body, Long adminUserId) {
        var t = threadRepo.findById(threadId)
                .orElseThrow(() -> new ThreadNotFoundException(threadId));
        if (!t.getClientId().equals(clientId)) {
            throw new ThreadNotFoundException(threadId);
        }
        t.setClientUnreadCount(t.getClientUnreadCount() + 1);
        t.setLastMessageAt(java.time.LocalDateTime.now());
        threadRepo.save(t);

        Message m = new Message();
        m.setThreadId(threadId);
        m.setSenderType(SenderType.ADMIN);
        m.setSenderUserId(adminUserId);
        m.setBody(body);
        messageRepo.save(m);
        eventPublisher.publishEvent(new MessagePostedEvent(t, m));
        return toMessageDto(m);
    }

    @Transactional
    public MessageDto postClientReply(Long threadId, String body, Long callerUserId) {
        var t = threadRepo.findById(threadId)
                .orElseThrow(() -> new ThreadNotFoundException(threadId));
        verifyClientOwnsThread(callerUserId, t);
        t.setAdminUnreadCount(t.getAdminUnreadCount() + 1);
        t.setLastMessageAt(java.time.LocalDateTime.now());
        threadRepo.save(t);

        Message m = new Message();
        m.setThreadId(threadId);
        m.setSenderType(SenderType.CLIENT);
        m.setSenderUserId(callerUserId);
        m.setBody(body);
        messageRepo.save(m);
        eventPublisher.publishEvent(new MessagePostedEvent(t, m));
        return toMessageDto(m);
    }

    @Transactional
    public MessageThreadDto getThreadAsAdmin(Long clientId, Long threadId) {
        var t = threadRepo.findById(threadId)
                .orElseThrow(() -> new ThreadNotFoundException(threadId));
        if (!t.getClientId().equals(clientId)) {
            throw new ThreadNotFoundException(threadId);
        }
        if (t.getAdminUnreadCount() != 0) {
            t.setAdminUnreadCount(0);
            threadRepo.save(t);
        }
        var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(threadId)
                .stream().map(this::toMessageDto).toList();
        return toThreadDto(t, msgs);
    }

    @Transactional
    public MessageThreadDto getThreadAsClient(Long threadId, Long callerUserId) {
        var t = threadRepo.findById(threadId)
                .orElseThrow(() -> new ThreadNotFoundException(threadId));
        verifyClientOwnsThread(callerUserId, t);
        if (t.getClientUnreadCount() != 0) {
            t.setClientUnreadCount(0);
            threadRepo.save(t);
        }
        var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(threadId)
                .stream().map(this::toMessageDto).toList();
        return toThreadDto(t, msgs);
    }

    @Transactional(readOnly = true)
    public java.util.List<MessageThreadSummaryDto> listAdminThreads(Long clientId) {
        return threadRepo.findByClientIdOrderByLastMessageAtDesc(clientId)
                .stream()
                .map(t -> toSummaryDto(t, t.getAdminUnreadCount()))
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<ClientUnreadCountDto> getAdminUnreadCounts() {
        return threadRepo.sumAdminUnreadByClient().stream()
                .map(r -> new ClientUnreadCountDto(r.getClientId(), r.getUnreadCount()))
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<MessageThreadSummaryDto> listPortalThreads(Long callerUserId) {
        var c = clientRepo.findByUserId(callerUserId);
        if (c.isEmpty()) return java.util.List.of();
        return threadRepo.findByClientIdOrderByLastMessageAtDesc(c.get().getId())
                .stream()
                .map(t -> toSummaryDto(t, t.getClientUnreadCount()))
                .toList();
    }

    @Transactional(readOnly = true)
    public int getPortalUnreadCount(Long callerUserId) {
        var c = clientRepo.findByUserId(callerUserId);
        if (c.isEmpty()) return 0;
        return threadRepo.sumClientUnreadForClient(c.get().getId());
    }

    private MessageThreadSummaryDto toSummaryDto(MessageThread t, int unread) {
        var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(t.getId());
        String preview = msgs.isEmpty() ? "" : msgs.get(msgs.size() - 1).getBody();
        if (preview != null && preview.length() > 80) preview = preview.substring(0, 77) + "...";
        return new MessageThreadSummaryDto(t.getId(), t.getClientId(), t.getSubject(),
                t.getLastMessageAt(), unread, preview);
    }

    private void verifyClientOwnsThread(Long callerUserId, MessageThread t) {
        var c = clientRepo.findByUserId(callerUserId)
                .orElseThrow(NoLinkedClientException::new);
        if (!c.getId().equals(t.getClientId())) {
            throw new ThreadForbiddenException();
        }
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
