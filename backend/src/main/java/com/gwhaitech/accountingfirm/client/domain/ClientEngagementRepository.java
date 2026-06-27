package com.gwhaitech.accountingfirm.client.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientEngagementRepository extends JpaRepository<ClientEngagement, Long> {

    List<ClientEngagement> findByClientIdOrderByTaxYearDesc(Long clientId);

    Optional<ClientEngagement> findByClientIdAndTaxYear(Long clientId, Short taxYear);

    Optional<ClientEngagement> findFirstByClientIdAndStatusNotOrderByTaxYearDesc(Long clientId, EngagementStatus status);

    Optional<ClientEngagement> findFirstByClientIdOrderByTaxYearDesc(Long clientId);
}
