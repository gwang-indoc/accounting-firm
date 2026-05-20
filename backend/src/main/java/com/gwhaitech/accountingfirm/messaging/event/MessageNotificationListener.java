package com.gwhaitech.accountingfirm.messaging.event;

import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.config.AppProperties;
import com.gwhaitech.accountingfirm.contact.config.MailProperties;
import com.gwhaitech.accountingfirm.messaging.domain.Message;
import com.gwhaitech.accountingfirm.messaging.domain.MessageThread;
import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class MessageNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(MessageNotificationListener.class);

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;
    private final ClientRepository clientRepository;
    private final AppProperties appProperties;

    public MessageNotificationListener(JavaMailSender mailSender,
                                       MailProperties mailProperties,
                                       ClientRepository clientRepository,
                                       AppProperties appProperties) {
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
        this.clientRepository = clientRepository;
        this.appProperties = appProperties;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessagePosted(MessagePostedEvent event) {
        MessageThread thread = event.thread();
        Message message = event.message();
        boolean adminSent = message.getSenderType() == SenderType.ADMIN;

        String recipientEmail;
        String senderLabel;
        String linkPath;

        if (adminSent) {
            Client client = clientRepository.findById(thread.getClientId()).orElse(null);
            if (client == null || client.getEmail() == null) {
                log.warn("Skipping notification: no email for client {}", thread.getClientId());
                return;
            }
            recipientEmail = client.getEmail();
            senderLabel = "your accountant";
            linkPath = "/portal/messages/" + thread.getId();
        } else {
            recipientEmail = mailProperties.notificationEmail();
            senderLabel = lookupClientName(thread.getClientId());
            linkPath = "/admin/clients/" + thread.getClientId() + "/messages/" + thread.getId();
        }

        String subject = "New message in your accounting portal: " + thread.getSubject();
        String body = buildBody(senderLabel, thread.getSubject(), appProperties.publicBaseUrl() + linkPath);

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(recipientEmail);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
        } catch (MailException e) {
            log.error("Failed to send message notification", e);
        }
    }

    private String buildBody(String senderLabel, String threadSubject, String link) {
        return "You have a new message from " + senderLabel + " in thread \"" + threadSubject + "\".\n\n" +
               "View it here: " + link + "\n\n" +
               "— Your accounting team";
    }

    private String lookupClientName(Long clientId) {
        return clientRepository.findById(clientId)
            .map(Client::getName)
            .orElse("a client");
    }
}
