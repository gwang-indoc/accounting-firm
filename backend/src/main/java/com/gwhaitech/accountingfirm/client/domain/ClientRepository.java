package com.gwhaitech.accountingfirm.client.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientRepository extends JpaRepository<Client, Long> {

    List<Client> findByEmailIgnoreCaseOrderById(String email);

    Optional<Client> findByUserId(Long userId);
}
