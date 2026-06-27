package com.gwhaitech.accountingfirm.client.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClientEngagementHistoryRepository extends JpaRepository<ClientEngagementHistory, Long> {

    List<ClientEngagementHistory> findByEngagementIdOrderByChangedAtAsc(Long engagementId);
}
