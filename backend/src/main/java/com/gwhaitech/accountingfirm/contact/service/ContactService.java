package com.gwhaitech.accountingfirm.contact.service;

import com.gwhaitech.accountingfirm.contact.config.MailProperties;
import com.gwhaitech.accountingfirm.contact.domain.ContactMessage;
import com.gwhaitech.accountingfirm.contact.dto.ContactSubmissionRequest;
import com.gwhaitech.accountingfirm.contact.repository.ContactMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);

    private final ContactMessageRepository repository;
    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    @Value("${SPRING_MAIL_USERNAME:}")
    private String mailUsername;

    public ContactService(ContactMessageRepository repository,
                          JavaMailSender mailSender,
                          MailProperties mailProperties) {
        this.repository = repository;
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
    }

    public void submit(ContactSubmissionRequest req, String ip) {
        ContactMessage msg = new ContactMessage();
        msg.setName(req.name());
        msg.setEmail(req.email());
        msg.setSubject(req.subject());
        msg.setMessage(req.message());
        msg.setIpAddress(ip);

        ContactMessage persisted = repository.save(msg);

        SimpleMailMessage email = new SimpleMailMessage();
        email.setTo(mailProperties.notificationEmail());
        email.setSubject("[Contact] " + req.subject());
        email.setText("From: " + req.name() + " <" + req.email() + ">\n\n" + req.message());

        String from = (mailProperties.fromEmail() != null && !mailProperties.fromEmail().isBlank())
            ? mailProperties.fromEmail()
            : mailUsername;
        if (from != null && !from.isBlank()) {
            email.setFrom(from);
        }

        try {
            mailSender.send(email);
        } catch (MailException ex) {
            log.warn("Failed to send notification email for contact_messages.id={}", persisted.getId(), ex);
        }
    }
}
