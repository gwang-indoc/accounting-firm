package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.client.domain.*;
import com.gwhaitech.accountingfirm.client.dto.EngagementDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClientEngagementEmailTest {

    @Mock private ClientEngagementRepository engagementRepository;
    @Mock private ClientEngagementHistoryRepository historyRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private UserRepository userRepository;
    @Mock private JavaMailSender mailSender;

    private ClientEngagementService service;

    private static final Long CLIENT_ID = 10L;
    private static final Long USER_ID = 5L;
    private static final Long ADMIN_ID = 99L;
    private static final int TAX_YEAR = 2024;

    @BeforeEach
    void setUp() {
        service = new ClientEngagementService(
                engagementRepository, historyRepository,
                clientRepository, userRepository, mailSender);
    }

    private ClientEngagement stubEngagement(EngagementStatus current) {
        ClientEngagement e = new ClientEngagement();
        e.setId(1L);
        e.setClientId(CLIENT_ID);
        e.setTaxYear((short) TAX_YEAR);
        e.setStatus(current);
        e.setUpdatedAt(LocalDateTime.now());
        when(engagementRepository.findByClientIdAndTaxYear(eq(CLIENT_ID), eq((short) TAX_YEAR)))
                .thenReturn(Optional.of(e));
        when(engagementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return e;
    }

    private Client clientWithLinkedUser() {
        Client c = new Client();
        c.setId(CLIENT_ID);
        c.setAdminId(ADMIN_ID);
        c.setUserId(USER_ID);
        c.setEmail("client@example.com");
        c.setName("Test Client");
        c.setBusinessType(BusinessType.PERSONAL);
        c.setFiscalYearEndMonth((short) 12);
        c.setFiscalYearEndDay((short) 31);
        return c;
    }

    private User user(String language) {
        User u = new User();
        u.setId(USER_ID);
        u.setEmail("linked@example.com");
        u.setName("Linked User");
        u.setLanguage(language);
        return u;
    }

    @Test
    void transitionToInProcessing_withLinkedEnUser_sendsEnglishEmail() {
        stubEngagement(EngagementStatus.START);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("en")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.IN_PROCESSING, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertEquals("linked@example.com", sent.getTo()[0]);
        assertNotNull(sent.getSubject());
        assertNotNull(sent.getText());
        // English: subject should not contain Chinese characters
        assertFalse(sent.getSubject().codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF));
    }

    @Test
    void transitionToInProcessing_withLinkedZhUser_sendsChineseEmail() {
        stubEngagement(EngagementStatus.START);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("zh")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.IN_PROCESSING, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        // Chinese: subject or body must contain Chinese characters
        String fullText = sent.getSubject() + sent.getText();
        assertTrue(fullText.codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF),
                "Expected Chinese characters in subject or body");
    }

    @Test
    void transitionToStart_doesNotSendEmail() {
        stubEngagement(EngagementStatus.IN_PROCESSING);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.START, null, ADMIN_ID);

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void transitionWithNoLinkedUser_doesNotSendEmailAndDoesNotThrow() {
        stubEngagement(EngagementStatus.START);
        Client client = clientWithLinkedUser();
        client.setUserId(null);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));

        assertDoesNotThrow(() ->
                service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.IN_PROCESSING, null, ADMIN_ID));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void transitionToPendingClientReview_withEnUser_sendsEnglishEmailWithReviewContent() {
        stubEngagement(EngagementStatus.IN_PROCESSING);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("en")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.PENDING_CLIENT_REVIEW, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertTrue(sent.getSubject().toLowerCase().contains("review"),
                "EN subject should mention 'review', got: " + sent.getSubject());
    }

    @Test
    void transitionToPendingClientReview_withZhUser_sendsChineseEmail() {
        stubEngagement(EngagementStatus.IN_PROCESSING);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("zh")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.PENDING_CLIENT_REVIEW, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        String fullText = captor.getValue().getSubject() + captor.getValue().getText();
        assertTrue(fullText.codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF));
    }

    @Test
    void transitionToSubmitToCra_withEnUser_sendsEnglishEmailMentioningCra() {
        stubEngagement(EngagementStatus.PENDING_CLIENT_REVIEW);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("en")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.SUBMIT_TO_CRA, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertTrue(captor.getValue().getSubject().contains("CRA"),
                "EN subject should mention CRA, got: " + captor.getValue().getSubject());
    }

    @Test
    void transitionToSubmitToCra_withZhUser_sendsChineseEmail() {
        stubEngagement(EngagementStatus.PENDING_CLIENT_REVIEW);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("zh")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.SUBMIT_TO_CRA, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        String fullText = captor.getValue().getSubject() + captor.getValue().getText();
        assertTrue(fullText.codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF));
    }

    @Test
    void transitionToCompleted_withEnUser_sendsEnglishEmailMentioningComplete() {
        stubEngagement(EngagementStatus.SUBMIT_TO_CRA);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("en")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.COMPLETED, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertTrue(captor.getValue().getSubject().toLowerCase().contains("complete"),
                "EN subject should mention 'complete', got: " + captor.getValue().getSubject());
    }

    @Test
    void transitionToCompleted_withZhUser_sendsChineseEmail() {
        stubEngagement(EngagementStatus.SUBMIT_TO_CRA);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("zh")));

        service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.COMPLETED, null, ADMIN_ID);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        String fullText = captor.getValue().getSubject() + captor.getValue().getText();
        assertTrue(fullText.codePoints().anyMatch(cp -> cp >= 0x4E00 && cp <= 0x9FFF));
    }

    @Test
    void mailException_doesNotPropagateAndStatusIsPersisted() {
        stubEngagement(EngagementStatus.START);
        Client client = clientWithLinkedUser();
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user("en")));
        doThrow(new org.springframework.mail.MailSendException("SMTP error")).when(mailSender).send(any(SimpleMailMessage.class));

        EngagementDto result = assertDoesNotThrow(() ->
                service.transitionStatus(CLIENT_ID, TAX_YEAR, EngagementStatus.IN_PROCESSING, null, ADMIN_ID));

        assertNotNull(result);
        verify(engagementRepository).save(any());
    }
}
