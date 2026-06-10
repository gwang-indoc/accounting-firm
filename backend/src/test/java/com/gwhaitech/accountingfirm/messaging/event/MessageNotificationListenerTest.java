package com.gwhaitech.accountingfirm.messaging.event;

import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.config.AppProperties;
import com.gwhaitech.accountingfirm.contact.config.MailProperties;
import com.gwhaitech.accountingfirm.messaging.domain.Message;
import com.gwhaitech.accountingfirm.messaging.domain.MessageThread;
import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MessageNotificationListenerTest {

    private JavaMailSender mailSender;
    private MailProperties mailProperties;
    private ClientRepository clientRepository;
    private AppProperties appProperties;
    private MessageNotificationListener listener;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        mailProperties = new MailProperties("firm@example.com", null);
        clientRepository = mock(ClientRepository.class);
        appProperties = new AppProperties();
        appProperties.setPublicBaseUrl("http://localhost:4200");
        listener = new MessageNotificationListener(mailSender, mailProperties, clientRepository, appProperties);
    }

    @Test
    void adminSendsMessage_emailsSentToClientEmail() {
        Client client = new Client();
        client.setEmail("client@example.com");
        client.setName("Alice");
        when(clientRepository.findById(1L)).thenReturn(Optional.of(client));

        listener.onMessagePosted(adminEvent());

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertArrayEquals(new String[]{"client@example.com"}, sent.getTo());
        assertTrue(sent.getSubject().contains("Tax question"));
    }

    @Test
    void clientSendsMessage_emailsSentToFirmMailbox() {
        Client client = new Client();
        client.setName("Bob");
        when(clientRepository.findById(1L)).thenReturn(Optional.of(client));

        listener.onMessagePosted(clientEvent());

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertArrayEquals(new String[]{"firm@example.com"}, sent.getTo());
        assertTrue(sent.getSubject().contains("Tax question"));
    }

    @Test
    void adminSendsMessage_clientHasNoEmail_skipsSilently() {
        Client client = new Client();
        client.setName("Charlie");
        client.setEmail(null);
        when(clientRepository.findById(1L)).thenReturn(Optional.of(client));

        assertDoesNotThrow(() -> listener.onMessagePosted(adminEvent()));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void mailSenderThrows_errorLoggedNotPropagated() {
        Client client = new Client();
        client.setEmail("client@example.com");
        when(clientRepository.findById(1L)).thenReturn(Optional.of(client));
        doThrow(new MailSendException("SMTP down")).when(mailSender).send(any(SimpleMailMessage.class));

        assertDoesNotThrow(() -> listener.onMessagePosted(adminEvent()));
    }

    private MessagePostedEvent adminEvent() {
        MessageThread t = new MessageThread();
        t.setClientId(1L);
        t.setSubject("Tax question");
        Message m = new Message();
        m.setSenderType(SenderType.ADMIN);
        return new MessagePostedEvent(t, m);
    }

    private MessagePostedEvent clientEvent() {
        MessageThread t = new MessageThread();
        t.setClientId(1L);
        t.setSubject("Tax question");
        Message m = new Message();
        m.setSenderType(SenderType.CLIENT);
        return new MessagePostedEvent(t, m);
    }
}
