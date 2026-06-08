package com.gwhaitech.accountingfirm.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailLoginCodeRepository extends JpaRepository<EmailLoginCode, Long> {

    @Query("""
            SELECT e FROM EmailLoginCode e
            WHERE e.email = :email
              AND e.consumedAt IS NULL
              AND e.expiresAt > :now
            ORDER BY e.createdAt DESC
            LIMIT 1
            """)
    Optional<EmailLoginCode> findLatestActive(@Param("email") String email, @Param("now") LocalDateTime now);

    boolean existsByEmailAndCreatedAtAfter(String email, LocalDateTime since);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);
}
