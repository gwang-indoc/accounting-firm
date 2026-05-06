package com.gwhaitech.accountingfirm.client.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientDocumentRepository extends JpaRepository<ClientDocument, Long> {

    List<ClientDocument> findByClientIdAndYear(Long clientId, short year);

    Optional<ClientDocument> findByClientIdAndYearAndFilename(Long clientId, short year, String filename);
}
