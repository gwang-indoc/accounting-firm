package com.gwhaitech.accountingfirm.client.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "client_engagements",
       uniqueConstraints = @UniqueConstraint(columnNames = {"client_id", "tax_year", "name"}))
public class ClientEngagement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "tax_year", nullable = false)
    private Short taxYear;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EngagementStatus status;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }
    public Short getTaxYear() { return taxYear; }
    public void setTaxYear(Short taxYear) { this.taxYear = taxYear; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public EngagementStatus getStatus() { return status; }
    public void setStatus(EngagementStatus status) { this.status = status; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
