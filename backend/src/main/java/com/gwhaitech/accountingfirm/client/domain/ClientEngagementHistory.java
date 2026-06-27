package com.gwhaitech.accountingfirm.client.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "client_engagement_history")
public class ClientEngagementHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "engagement_id", nullable = false)
    private Long engagementId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private EngagementStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 30)
    private EngagementStatus toStatus;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getEngagementId() { return engagementId; }
    public void setEngagementId(Long engagementId) { this.engagementId = engagementId; }
    public EngagementStatus getFromStatus() { return fromStatus; }
    public void setFromStatus(EngagementStatus fromStatus) { this.fromStatus = fromStatus; }
    public EngagementStatus getToStatus() { return toStatus; }
    public void setToStatus(EngagementStatus toStatus) { this.toStatus = toStatus; }
    public Long getChangedBy() { return changedBy; }
    public void setChangedBy(Long changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
