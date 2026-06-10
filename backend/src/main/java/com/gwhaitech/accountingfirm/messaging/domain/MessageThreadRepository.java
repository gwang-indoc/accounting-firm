package com.gwhaitech.accountingfirm.messaging.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MessageThreadRepository extends JpaRepository<MessageThread, Long> {

    List<MessageThread> findByClientIdOrderByLastMessageAtDesc(Long clientId);

    @Query("""
           SELECT t.clientId AS clientId, SUM(t.adminUnreadCount) AS unreadCount
           FROM MessageThread t
           WHERE t.adminUnreadCount > 0
           GROUP BY t.clientId
           """)
    List<ClientUnreadRow> sumAdminUnreadByClient();

    @Query("""
           SELECT COALESCE(SUM(t.clientUnreadCount), 0)
           FROM MessageThread t
           WHERE t.clientId = ?1
           """)
    int sumClientUnreadForClient(Long clientId);
}
