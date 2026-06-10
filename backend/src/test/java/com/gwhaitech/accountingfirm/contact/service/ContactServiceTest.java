package com.gwhaitech.accountingfirm.contact.service;

import com.gwhaitech.accountingfirm.contact.config.MailProperties;
import com.gwhaitech.accountingfirm.contact.domain.ContactMessage;
import com.gwhaitech.accountingfirm.contact.dto.ContactSubmissionRequest;
import com.gwhaitech.accountingfirm.contact.repository.ContactMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ContactServiceTest {

    private ContactMessageRepository repository;
    private JavaMailSender mailSender;
    private ContactService service;

    @BeforeEach
    void setUp() {
        repository = mock(ContactMessageRepository.class);
        mailSender = mock(JavaMailSender.class);
        MailProperties props = new MailProperties("notify@firm.com", null);
        service = new ContactService(repository, mailSender, props);

        // repository.save returns the same entity with an id
        when(repository.save(any())).thenAnswer(inv -> {
            ContactMessage msg = inv.getArgument(0);
            // simulate id assignment
            try {
                var f = ContactMessage.class.getDeclaredField("id");
                f.setAccessible(true);
                f.set(msg, 42L);
            } catch (Exception e) { throw new RuntimeException(e); }
            return msg;
        });
    }

    @Test
    void happyPathPersistsAndSendsEmail() {
        ContactSubmissionRequest req = new ContactSubmissionRequest(
            "Alice", "alice@example.com", "Hello", "World", "");
        service.submit(req, "1.2.3.4");

        // verify persisted
        ArgumentCaptor<ContactMessage> msgCaptor = ArgumentCaptor.forClass(ContactMessage.class);
        verify(repository).save(msgCaptor.capture());
        ContactMessage saved = msgCaptor.getValue();
        assertEquals("Alice", saved.getName());
        assertEquals("alice@example.com", saved.getEmail());
        assertEquals("Hello", saved.getSubject());
        assertEquals("World", saved.getMessage());
        assertEquals("1.2.3.4", saved.getIpAddress());

        // verify email sent
        ArgumentCaptor<SimpleMailMessage> emailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(emailCaptor.capture());
        SimpleMailMessage email = emailCaptor.getValue();
        assertEquals("[Contact] Hello", email.getSubject());
        assertArrayEquals(new String[]{"notify@firm.com"}, email.getTo());
    }

    @Test
    void smtpFailureDoesNotPropagate() {
        doThrow(new org.springframework.mail.MailSendException("SMTP down"))
            .when(mailSender).send(any(SimpleMailMessage.class));

        ContactSubmissionRequest req = new ContactSubmissionRequest(
            "Bob", "bob@example.com", "SMTP Test", "Message", "");

        assertDoesNotThrow(() -> service.submit(req, "1.2.3.4"));
        verify(repository).save(any()); // row was still persisted
    }

    @Test
    void fromAddressDefaultsToMailUsername() {
        // service was constructed with props having fromEmail=null
        // We need access to the internal @Value field via reflection or by injecting it
        // The cleanest way: add a package-private setter for test use, OR use ReflectionTestUtils
        org.springframework.test.util.ReflectionTestUtils.setField(service, "mailUsername", "noreply@spring.com");

        ContactSubmissionRequest req = new ContactSubmissionRequest(
            "Charlie", "charlie@example.com", "From test", "Body", "");
        service.submit(req, "10.0.0.1");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertEquals("noreply@spring.com", captor.getValue().getFrom());
    }

    @Test
    void fromAddressUsesExplicitOverrideWhenSet() {
        MailProperties propsWithFrom = new MailProperties("notify@firm.com", "no-reply@firm.com");
        ContactService svcWithFrom = new ContactService(repository, mailSender, propsWithFrom);

        ContactSubmissionRequest req = new ContactSubmissionRequest(
            "Dave", "dave@example.com", "From override", "Body", "");
        svcWithFrom.submit(req, "10.0.0.2");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, atLeastOnce()).send(captor.capture());
        SimpleMailMessage lastEmail = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertEquals("no-reply@firm.com", lastEmail.getFrom());
    }
}
