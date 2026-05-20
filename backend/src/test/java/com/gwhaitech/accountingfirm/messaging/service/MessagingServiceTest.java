package com.gwhaitech.accountingfirm.messaging.service;

import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.messaging.domain.*;
import com.gwhaitech.accountingfirm.messaging.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MessagingServiceTest {

    private MessageThreadRepository threadRepo;
    private MessageRepository messageRepo;
    private ClientRepository clientRepo;
    private MessagingService service;

    @BeforeEach
    void setUp() {
        threadRepo = mock(MessageThreadRepository.class);
        messageRepo = mock(MessageRepository.class);
        clientRepo = mock(ClientRepository.class);
        service = new MessagingService(threadRepo, messageRepo, clientRepo);
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
}
