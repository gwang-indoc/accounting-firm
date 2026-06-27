package com.gwhaitech.accountingfirm.client.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "business_type", nullable = false, length = 20)
    private BusinessType businessType;

    @Column(name = "fiscal_year_end_month", nullable = false)
    private Short fiscalYearEndMonth;

    @Column(name = "fiscal_year_end_day", nullable = false)
    private Short fiscalYearEndDay;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public BusinessType getBusinessType() { return businessType; }
    public void setBusinessType(BusinessType businessType) { this.businessType = businessType; }
    public Short getFiscalYearEndMonth() { return fiscalYearEndMonth; }
    public void setFiscalYearEndMonth(Short fiscalYearEndMonth) { this.fiscalYearEndMonth = fiscalYearEndMonth; }
    public Short getFiscalYearEndDay() { return fiscalYearEndDay; }
    public void setFiscalYearEndDay(Short fiscalYearEndDay) { this.fiscalYearEndDay = fiscalYearEndDay; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
