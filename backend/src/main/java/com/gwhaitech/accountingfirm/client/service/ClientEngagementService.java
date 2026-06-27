package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.client.domain.*;
import com.gwhaitech.accountingfirm.client.dto.EngagementDashboardDto;
import com.gwhaitech.accountingfirm.client.dto.EngagementDto;
import com.gwhaitech.accountingfirm.client.dto.EngagementHistoryDto;
import com.gwhaitech.accountingfirm.client.exception.ClientAccessDeniedException;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.EngagementNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ClientEngagementService {

    private static final Logger log = LoggerFactory.getLogger(ClientEngagementService.class);

    private final ClientEngagementRepository engagementRepository;
    private final ClientEngagementHistoryRepository historyRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    public ClientEngagementService(ClientEngagementRepository engagementRepository,
                                   ClientEngagementHistoryRepository historyRepository,
                                   ClientRepository clientRepository,
                                   UserRepository userRepository,
                                   JavaMailSender mailSender) {
        this.engagementRepository = engagementRepository;
        this.historyRepository = historyRepository;
        this.clientRepository = clientRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    private Client findClientForAdmin(Long clientId, Long adminId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ClientNotFoundException(clientId));
        if (!client.getAdminId().equals(adminId)) {
            throw new ClientAccessDeniedException(clientId);
        }
        return client;
    }

    @Transactional
    public EngagementDto createEngagement(Long clientId, Integer taxYear, Long adminId) {
        findClientForAdmin(clientId, adminId);

        ClientEngagement engagement = new ClientEngagement();
        engagement.setClientId(clientId);
        engagement.setTaxYear(taxYear.shortValue());
        engagement.setStatus(EngagementStatus.START);
        engagement.setUpdatedBy(adminId);
        engagement.setUpdatedAt(LocalDateTime.now());
        ClientEngagement saved = engagementRepository.save(engagement);

        ClientEngagementHistory history = new ClientEngagementHistory();
        history.setEngagementId(saved.getId());
        history.setFromStatus(null);
        history.setToStatus(EngagementStatus.START);
        history.setChangedBy(adminId);
        history.setChangedAt(saved.getUpdatedAt());
        historyRepository.save(history);

        return toDto(saved);
    }

    @Transactional
    public EngagementDto transitionStatus(Long clientId, int taxYear, EngagementStatus newStatus,
                                          String note, Long adminId) {
        findClientForAdmin(clientId, adminId);
        ClientEngagement engagement = engagementRepository
                .findByClientIdAndTaxYear(clientId, (short) taxYear)
                .orElseThrow(() -> new EngagementNotFoundException(clientId, taxYear));

        EngagementStatus previous = engagement.getStatus();
        engagement.setStatus(newStatus);
        engagement.setUpdatedBy(adminId);
        engagement.setUpdatedAt(LocalDateTime.now());
        ClientEngagement saved = engagementRepository.save(engagement);

        ClientEngagementHistory history = new ClientEngagementHistory();
        history.setEngagementId(saved.getId());
        history.setFromStatus(previous);
        history.setToStatus(newStatus);
        history.setChangedBy(adminId);
        history.setChangedAt(saved.getUpdatedAt());
        history.setNote(note);
        historyRepository.save(history);

        sendNotificationIfApplicable(clientId, newStatus);

        return toDto(saved);
    }

    private void sendNotificationIfApplicable(Long clientId, EngagementStatus status) {
        if (status == EngagementStatus.START) return;
        Client client = clientRepository.findById(clientId).orElse(null);
        if (client == null || client.getUserId() == null) return;
        User user = userRepository.findById(client.getUserId()).orElse(null);
        if (user == null) return;

        String lang = "zh".equalsIgnoreCase(user.getLanguage()) ? "zh" : "en";
        String subject = emailSubject(status, lang);
        String body = emailBody(status, lang);

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(user.getEmail());
        msg.setSubject(subject);
        msg.setText(body);
        try {
            mailSender.send(msg);
        } catch (MailException ex) {
            log.warn("Failed to send engagement notification email to userId={} for status={}", user.getId(), status, ex);
        }
    }

    private static String emailSubject(EngagementStatus status, String lang) {
        return switch (status) {
            case IN_PROCESSING -> "en".equals(lang)
                    ? "Your tax file is now in processing"
                    : "您的税务文件正在处理中";
            case PENDING_CLIENT_REVIEW -> "en".equals(lang)
                    ? "Your tax return is ready for your review"
                    : "您的税务申报表已准备好，请审阅";
            case SUBMIT_TO_CRA -> "en".equals(lang)
                    ? "Your tax return has been filed with CRA"
                    : "您的税务申报表已提交给CRA";
            case COMPLETED -> "en".equals(lang)
                    ? "Your tax file is complete"
                    : "您的税务文件已完成";
            default -> "";
        };
    }

    private static String emailBody(EngagementStatus status, String lang) {
        return switch (status) {
            case IN_PROCESSING -> "en".equals(lang)
                    ? "We have started processing your tax return. We will notify you when it is ready for your review."
                    : "我们已开始处理您的税务申报。审阅完成后，我们将通知您。";
            case PENDING_CLIENT_REVIEW -> "en".equals(lang)
                    ? "Your tax return is ready. Please review and sign the documents at your earliest convenience."
                    : "您的税务申报表已准备好，请尽快审阅并签署相关文件。";
            case SUBMIT_TO_CRA -> "en".equals(lang)
                    ? "Your tax return has been submitted to the Canada Revenue Agency (CRA). Thank you for your patience."
                    : "您的税务申报表已成功提交至加拿大税务局（CRA）。感谢您的耐心等待。";
            case COMPLETED -> "en".equals(lang)
                    ? "Your tax file has been completed. Thank you for choosing our services."
                    : "您的税务文件已全部完成。感谢您选择我们的服务。";
            default -> "";
        };
    }

    public List<EngagementDto> listForClient(Long clientId, Long adminId) {
        findClientForAdmin(clientId, adminId);
        return engagementRepository.findByClientIdOrderByTaxYearDesc(clientId)
                .stream().map(this::toDto).toList();
    }

    public List<EngagementHistoryDto> getHistory(Long clientId, int taxYear, Long adminId) {
        findClientForAdmin(clientId, adminId);
        ClientEngagement engagement = engagementRepository
                .findByClientIdAndTaxYear(clientId, (short) taxYear)
                .orElseThrow(() -> new EngagementNotFoundException(clientId, taxYear));
        return historyRepository.findByEngagementIdOrderByChangedAtAsc(engagement.getId())
                .stream().map(this::toHistoryDto).toList();
    }

    public List<EngagementDashboardDto> listAll(Long adminId) {
        List<Long> clientIds = clientRepository.findByAdminId(adminId).stream()
                .map(Client::getId).toList();
        return engagementRepository.findAll().stream()
                .filter(e -> clientIds.contains(e.getClientId()))
                .map(e -> {
                    Client client = clientRepository.findById(e.getClientId()).orElse(null);
                    String clientName = client != null ? client.getName() : null;
                    com.gwhaitech.accountingfirm.client.domain.BusinessType businessType =
                            client != null ? client.getBusinessType() : null;
                    String updatedByName = e.getUpdatedBy() != null
                            ? userRepository.findById(e.getUpdatedBy()).map(u -> u.getName()).orElse(null)
                            : null;
                    return new EngagementDashboardDto(e.getId(), e.getClientId(), clientName, businessType,
                            e.getTaxYear(), e.getStatus(), e.getUpdatedAt(), updatedByName);
                }).toList();
    }

    private EngagementDto toDto(ClientEngagement e) {
        return new EngagementDto(e.getId(), e.getClientId(), e.getTaxYear(),
                e.getStatus(), e.getUpdatedBy(), e.getUpdatedAt());
    }

    private EngagementHistoryDto toHistoryDto(ClientEngagementHistory h) {
        return new EngagementHistoryDto(h.getId(), h.getFromStatus(), h.getToStatus(),
                h.getChangedBy(), h.getChangedAt(), h.getNote());
    }
}
