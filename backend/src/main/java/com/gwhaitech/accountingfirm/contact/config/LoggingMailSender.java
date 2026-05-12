package com.gwhaitech.accountingfirm.contact.config;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Component
@Profile("dev")
@Primary
public class LoggingMailSender implements JavaMailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingMailSender.class);

    @Override
    public void send(SimpleMailMessage simpleMessage) throws MailException {
        log.info("DEV MAIL — to={} subject={}", simpleMessage.getTo(), simpleMessage.getSubject());
    }

    @Override
    public void send(SimpleMailMessage... simpleMessages) throws MailException {
        for (SimpleMailMessage m : simpleMessages) send(m);
    }

    @Override
    public MimeMessage createMimeMessage() {
        return new JavaMailSenderImpl().createMimeMessage();
    }

    @Override
    public MimeMessage createMimeMessage(InputStream contentStream) throws MailException {
        return new JavaMailSenderImpl().createMimeMessage(contentStream);
    }

    @Override
    public void send(MimeMessage mimeMessage) throws MailException {
        log.info("DEV MAIL (mime) — discarded");
    }

    @Override
    public void send(MimeMessage... mimeMessages) throws MailException {
        for (MimeMessage m : mimeMessages) send(m);
    }
}
