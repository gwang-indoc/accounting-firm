package com.gwhaitech.accountingfirm.messaging.service;

import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.messaging.domain.*;
import com.gwhaitech.accountingfirm.messaging.dto.*;
import com.gwhaitech.accountingfirm.messaging.event.MessagePostedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MessagingServiceTest {

    private MessageThreadRepository threadRepo;
    private MessageRepository messageRepo;
    private ClientRepository clientRepo;
    private ApplicationEventPublisher eventPublisher;
    private MessagingService service;

    @BeforeEach
    void setUp() {
        threadRepo = mock(MessageThreadRepository.class);
        messageRepo = mock(MessageRepository.class);
        clientRepo = mock(ClientRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        service = new MessagingService(threadRepo, messageRepo, clientRepo, eventPublisher);
    }

    @Test
    void createThreadAsAdmin_persistsThread_andFirstAdminMessage_andBumpsClientUnread() {
        Client client = new Client();
        client.setId(7L);
        client.setName("Jane");
        when(clientRepo.findById(7L)).thenReturn(Optional.of(client));
        when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> {
            MessageThread t = inv.getArgument(0);
            t = spy(t);
            when(t.getId()).thenReturn(100L);
            return t;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageThreadDto dto = service.createThreadAsAdmin(7L, "Tax filing", "Hi Jane", 42L);

        ArgumentCaptor<MessageThread> threadCap = ArgumentCaptor.forClass(MessageThread.class);
        verify(threadRepo).save(threadCap.capture());
        assertThat(threadCap.getValue().getClientUnreadCount()).isEqualTo(1);
        assertThat(threadCap.getValue().getAdminUnreadCount()).isEqualTo(0);
        assertThat(threadCap.getValue().getSubject()).isEqualTo("Tax filing");

        ArgumentCaptor<Message> msgCap = ArgumentCaptor.forClass(Message.class);
        verify(messageRepo).save(msgCap.capture());
        assertThat(msgCap.getValue().getThreadId()).isEqualTo(100L);
        assertThat(msgCap.getValue().getSenderType()).isEqualTo(SenderType.ADMIN);
        assertThat(msgCap.getValue().getSenderUserId()).isEqualTo(42L);
        assertThat(msgCap.getValue().getBody()).isEqualTo("Hi Jane");

        assertThat(dto.id()).isEqualTo(100L);
        assertThat(dto.subject()).isEqualTo("Tax filing");
        assertThat(dto.clientUnreadCount()).isEqualTo(1);
    }

    @Test
    void createThreadAsClient_persists_andBumpsAdminUnread() {
        Client client = new Client(); client.setId(7L); client.setUserId(99L); client.setName("Jane");
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
        when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> {
            MessageThread t = inv.getArgument(0);
            t = spy(t); when(t.getId()).thenReturn(200L); return t;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageThreadDto dto = service.createThreadAsClient(99L, "Question", "I have a question");

        ArgumentCaptor<MessageThread> cap = ArgumentCaptor.forClass(MessageThread.class);
        verify(threadRepo).save(cap.capture());
        assertThat(cap.getValue().getAdminUnreadCount()).isEqualTo(1);
        assertThat(cap.getValue().getClientUnreadCount()).isEqualTo(0);
        assertThat(dto.clientId()).isEqualTo(7L);

        ArgumentCaptor<Message> msgCap = ArgumentCaptor.forClass(Message.class);
        verify(messageRepo).save(msgCap.capture());
        assertThat(msgCap.getValue().getSenderType()).isEqualTo(SenderType.CLIENT);
        assertThat(msgCap.getValue().getSenderUserId()).isEqualTo(99L);
    }

    @Test
    void createThreadAsClient_whenUserHasNoLinkedClient_throwsNoLinkedClient() {
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.empty());
        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> service.createThreadAsClient(99L, "x", "y"))
            .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.NoLinkedClientException.class);
    }

    @Test
    void postAdminReply_appendsMessage_bumpsClientUnread_updatesLastMessageAt() {
        MessageThread existing = new MessageThread();
        existing.setClientId(7L); existing.setSubject("x");
        existing.setClientUnreadCount(2);
        existing.setLastMessageAt(java.time.LocalDateTime.now().minusDays(1));
        var spied = spy(existing); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageDto dto = service.postAdminReply(7L, 50L, "Got it", 42L);

        assertThat(spied.getClientUnreadCount()).isEqualTo(3);
        assertThat(spied.getLastMessageAt()).isAfter(java.time.LocalDateTime.now().minusSeconds(5));
        verify(threadRepo).save(spied);

        ArgumentCaptor<Message> msgCap = ArgumentCaptor.forClass(Message.class);
        verify(messageRepo).save(msgCap.capture());
        assertThat(msgCap.getValue().getSenderType()).isEqualTo(SenderType.ADMIN);
        assertThat(dto.body()).isEqualTo("Got it");
    }

    @Test
    void postAdminReply_whenThreadMissing_throwsThreadNotFound() {
        when(threadRepo.findById(50L)).thenReturn(Optional.empty());
        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> service.postAdminReply(7L, 50L, "x", 42L))
            .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException.class);
    }

    @Test
    void postClientReply_whenCallerOwnsThread_appendsAndBumpsAdminUnread() {
        Client client = new Client(); client.setId(7L); client.setUserId(99L);
        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("x"); t.setAdminUnreadCount(0);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageDto dto = service.postClientReply(50L, "reply", 99L);

        assertThat(spied.getAdminUnreadCount()).isEqualTo(1);
        assertThat(dto.senderType()).isEqualTo(SenderType.CLIENT);
    }

    @Test
    void postClientReply_whenCallerDoesNotOwnThread_throwsForbidden() {
        Client client = new Client(); client.setId(8L); client.setUserId(99L);
        MessageThread t = new MessageThread(); t.setClientId(7L); t.setSubject("x");
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> service.postClientReply(50L, "x", 99L))
            .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException.class);
    }

    @Test
    void getThreadAsAdmin_zerosAdminUnread_returnsAllMessagesOrdered() {
        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("x");
        t.setAdminUnreadCount(3); t.setClientUnreadCount(2);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        Message m1 = new Message(); m1.setBody("a");
        Message m2 = new Message(); m2.setBody("b");
        when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(m1, m2));
        when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageThreadDto dto = service.getThreadAsAdmin(7L, 50L);

        assertThat(spied.getAdminUnreadCount()).isEqualTo(0);
        assertThat(spied.getClientUnreadCount()).isEqualTo(2);
        verify(threadRepo).save(spied);
        assertThat(dto.messages()).hasSize(2);
        assertThat(dto.messages()).extracting(MessageDto::body).containsExactly("a", "b");
    }

    @Test
    void getThreadAsClient_whenOwner_zerosClientUnread_returnsMessages() {
        Client client = new Client(); client.setId(7L); client.setUserId(99L);
        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("x"); t.setClientUnreadCount(5); t.setAdminUnreadCount(1);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
        when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of());
        when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> inv.getArgument(0));

        service.getThreadAsClient(50L, 99L);

        assertThat(spied.getClientUnreadCount()).isEqualTo(0);
        assertThat(spied.getAdminUnreadCount()).isEqualTo(1);
    }

    @Test
    void getThreadAsClient_whenNotOwner_throwsForbidden() {
        Client client = new Client(); client.setId(8L); client.setUserId(99L);
        MessageThread t = new MessageThread(); t.setClientId(7L); t.setSubject("x");
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> service.getThreadAsClient(50L, 99L))
            .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException.class);
    }

    @Test
    void listAdminThreads_returnsSummariesWithUnreadAndPreview() {
        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("Tax filing");
        t.setLastMessageAt(java.time.LocalDateTime.now()); t.setAdminUnreadCount(2);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findByClientIdOrderByLastMessageAtDesc(7L)).thenReturn(java.util.List.of(spied));

        Message latest = new Message();
        latest.setBody("This is a long body that should be truncated at 80 chars when rendered as preview in the UI for admin list");
        when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(new Message(), latest));

        var list = service.listAdminThreads(7L);

        assertThat(list).hasSize(1);
        assertThat(list.get(0).subject()).isEqualTo("Tax filing");
        assertThat(list.get(0).unreadCount()).isEqualTo(2);
        assertThat(list.get(0).lastMessagePreview()).hasSizeLessThanOrEqualTo(80);
    }

    @Test
    void listAdminThreads_includesClientUnreadCountAndLastSenderType() {
        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("Tax");
        t.setLastMessageAt(java.time.LocalDateTime.now());
        t.setAdminUnreadCount(0); t.setClientUnreadCount(3);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findByClientIdOrderByLastMessageAtDesc(7L)).thenReturn(java.util.List.of(spied));

        Message m = new Message(); m.setBody("Hello"); m.setSenderType(SenderType.ADMIN);
        when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(m));

        var list = service.listAdminThreads(7L);

        assertThat(list.get(0).clientUnreadCount()).isEqualTo(3);
        assertThat(list.get(0).lastSenderType()).isEqualTo("ADMIN");
    }

    @Test
    void listPortalThreads_setsClientUnreadCountToZeroAndIncludesLastSenderType() {
        Client client = new Client(); client.setId(7L); client.setUserId(99L);
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));

        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("Tax");
        t.setLastMessageAt(java.time.LocalDateTime.now());
        t.setClientUnreadCount(2);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findByClientIdOrderByLastMessageAtDesc(7L)).thenReturn(java.util.List.of(spied));

        Message m = new Message(); m.setBody("Hi"); m.setSenderType(SenderType.CLIENT);
        when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(m));

        var list = service.listPortalThreads(99L);

        assertThat(list.get(0).clientUnreadCount()).isEqualTo(0);
        assertThat(list.get(0).lastSenderType()).isEqualTo("CLIENT");
    }

    @Test
    void getAdminUnreadCounts_returnsProjections() {
        com.gwhaitech.accountingfirm.messaging.domain.ClientUnreadRow row =
                mock(com.gwhaitech.accountingfirm.messaging.domain.ClientUnreadRow.class);
        when(row.getClientId()).thenReturn(7L);
        when(row.getUnreadCount()).thenReturn(3L);
        when(threadRepo.sumAdminUnreadByClient()).thenReturn(java.util.List.of(row));

        var counts = service.getAdminUnreadCounts();

        assertThat(counts).hasSize(1);
        assertThat(counts.get(0).clientId()).isEqualTo(7L);
        assertThat(counts.get(0).unreadCount()).isEqualTo(3L);
    }

    @Test
    void listPortalThreads_whenUserHasNoLinkedClient_returnsEmptyList() {
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.empty());
        var list = service.listPortalThreads(99L);
        assertThat(list).isEmpty();
    }

    @Test
    void getPortalUnreadCount_whenUserHasNoLinkedClient_returnsZero() {
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.empty());
        int count = service.getPortalUnreadCount(99L);
        assertThat(count).isEqualTo(0);
    }

    @Test
    void createThreadAsAdmin_publishesEvent() {
        Client client = new Client();
        client.setId(7L); client.setName("Jane");
        when(clientRepo.findById(7L)).thenReturn(Optional.of(client));
        when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> {
            MessageThread t = inv.getArgument(0);
            t = spy(t); when(t.getId()).thenReturn(100L); return t;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createThreadAsAdmin(7L, "Tax filing", "Hi Jane", 42L);

        ArgumentCaptor<MessagePostedEvent> captor = ArgumentCaptor.forClass(MessagePostedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        MessagePostedEvent event = captor.getValue();
        assertThat(event.thread().getSubject()).isEqualTo("Tax filing");
        assertThat(event.message().getBody()).isEqualTo("Hi Jane");
    }

    @Test
    void createThreadAsClient_publishesEvent() {
        Client client = new Client(); client.setId(7L); client.setUserId(99L); client.setName("Jane");
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
        when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> {
            MessageThread t = inv.getArgument(0);
            t = spy(t); when(t.getId()).thenReturn(200L); return t;
        });
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createThreadAsClient(99L, "Question", "I have a question");

        ArgumentCaptor<MessagePostedEvent> captor = ArgumentCaptor.forClass(MessagePostedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        MessagePostedEvent event = captor.getValue();
        assertThat(event.thread().getSubject()).isEqualTo("Question");
        assertThat(event.message().getBody()).isEqualTo("I have a question");
    }

    @Test
    void postAdminReply_publishesEvent() {
        MessageThread existing = new MessageThread();
        existing.setClientId(7L); existing.setSubject("Tax filing"); existing.setClientUnreadCount(0);
        existing.setLastMessageAt(LocalDateTime.now().minusDays(1));
        var spied = spy(existing); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        service.postAdminReply(7L, 50L, "Got it", 42L);

        ArgumentCaptor<MessagePostedEvent> captor = ArgumentCaptor.forClass(MessagePostedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        MessagePostedEvent event = captor.getValue();
        assertThat(event.thread().getSubject()).isEqualTo("Tax filing");
        assertThat(event.message().getBody()).isEqualTo("Got it");
    }

    @Test
    void getThreadAsAdmin_whenThreadBelongsToDifferentClient_throwsNotFound() {
        MessageThread thread = new MessageThread();
        thread.setClientId(2L);  // belongs to client 2
        thread.setSubject("Other");
        thread.setAdminUnreadCount(0);
        thread.setClientUnreadCount(0);
        var spied = spy(thread); when(spied.getId()).thenReturn(99L);
        when(threadRepo.findById(99L)).thenReturn(Optional.of(spied));
        when(messageRepo.findByThreadIdOrderBySentAtAsc(99L)).thenReturn(java.util.List.of());

        // Passing clientId=1 but thread belongs to clientId=2 → should throw
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.getThreadAsAdmin(1L, 99L))
            .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException.class);
    }

    @Test
    void postAdminReply_whenThreadBelongsToDifferentClient_throwsNotFound() {
        MessageThread thread = new MessageThread();
        thread.setClientId(2L);
        var spied = spy(thread); when(spied.getId()).thenReturn(99L);
        when(threadRepo.findById(99L)).thenReturn(Optional.of(spied));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.postAdminReply(1L, 99L, "body", 10L))
            .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException.class);
    }

    @Test
    void postClientReply_publishesEvent() {
        Client client = new Client(); client.setId(7L); client.setUserId(99L);
        MessageThread t = new MessageThread();
        t.setClientId(7L); t.setSubject("Tax filing"); t.setAdminUnreadCount(0);
        var spied = spy(t); when(spied.getId()).thenReturn(50L);
        when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
        when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
        when(messageRepo.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        service.postClientReply(50L, "My reply", 99L);

        ArgumentCaptor<MessagePostedEvent> captor = ArgumentCaptor.forClass(MessagePostedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        MessagePostedEvent event = captor.getValue();
        assertThat(event.thread().getSubject()).isEqualTo("Tax filing");
        assertThat(event.message().getBody()).isEqualTo("My reply");
    }
}
