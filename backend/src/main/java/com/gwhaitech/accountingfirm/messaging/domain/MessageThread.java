package com.gwhaitech.accountingfirm.messaging.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_threads")
public class MessageThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_message_at", nullable = false)
    private LocalDateTime lastMessageAt;

    @Column(name = "admin_unread_count", nullable = false)
    private int adminUnreadCount;

    @Column(name = "client_unread_count", nullable = false)
    private int clientUnreadCount;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (lastMessageAt == null) lastMessageAt = now;
    }

    public Long getId() { return id; }
    public Long getClientId() { return clientId; }
    public void setClientId(Long v) { this.clientId = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { this.subject = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime v) { this.lastMessageAt = v; }
    public int getAdminUnreadCount() { return adminUnreadCount; }
    public void setAdminUnreadCount(int v) { this.adminUnreadCount = v; }
    public int getClientUnreadCount() { return clientUnreadCount; }
    public void setClientUnreadCount(int v) { this.clientUnreadCount = v; }
}
