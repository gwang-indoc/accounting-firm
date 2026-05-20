package com.gwhaitech.accountingfirm.messaging.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "thread_id", nullable = false)
    private Long threadId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, length = 10)
    private SenderType senderType;

    @Column(name = "sender_user_id", nullable = false)
    private Long senderUserId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) sentAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getThreadId() { return threadId; }
    public void setThreadId(Long v) { this.threadId = v; }
    public SenderType getSenderType() { return senderType; }
    public void setSenderType(SenderType v) { this.senderType = v; }
    public Long getSenderUserId() { return senderUserId; }
    public void setSenderUserId(Long v) { this.senderUserId = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public LocalDateTime getSentAt() { return sentAt; }
}
