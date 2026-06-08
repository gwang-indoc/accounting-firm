package com.gwhaitech.accountingfirm.auth.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class EmailLoginCodeRepositoryTest {

    @Autowired
    private EmailLoginCodeRepository repo;

    @BeforeEach
    void cleanup() {
        repo.deleteAll();
    }

    @Test
    void findLatestActive_returnsNewestUnconsumedUnexpiredRow() {
        LocalDateTime now = LocalDateTime.now();

        EmailLoginCode older = new EmailLoginCode();
        older.setEmail("a@test.com");
        older.setCodeHash("hash-old");
        older.setExpiresAt(now.plusMinutes(10));
        older.setCreatedAt(now.minusSeconds(30));
        repo.save(older);

        EmailLoginCode newer = new EmailLoginCode();
        newer.setEmail("a@test.com");
        newer.setCodeHash("hash-new");
        newer.setExpiresAt(now.plusMinutes(10));
        newer.setCreatedAt(now);
        repo.save(newer);

        Optional<EmailLoginCode> found = repo.findLatestActive("a@test.com", now);

        assertThat(found).isPresent();
        assertThat(found.get().getCodeHash()).isEqualTo("hash-new");
    }

    @Test
    void findLatestActive_excludesExpiredRows() {
        LocalDateTime now = LocalDateTime.now();

        EmailLoginCode expired = new EmailLoginCode();
        expired.setEmail("b@test.com");
        expired.setCodeHash("hash-expired");
        expired.setExpiresAt(now.minusMinutes(1));
        expired.setCreatedAt(now.minusMinutes(11));
        repo.save(expired);

        Optional<EmailLoginCode> found = repo.findLatestActive("b@test.com", now);

        assertThat(found).isEmpty();
    }

    @Test
    void findLatestActive_excludesConsumedRows() {
        LocalDateTime now = LocalDateTime.now();

        EmailLoginCode consumed = new EmailLoginCode();
        consumed.setEmail("c@test.com");
        consumed.setCodeHash("hash-consumed");
        consumed.setExpiresAt(now.plusMinutes(10));
        consumed.setConsumedAt(now.minusMinutes(1));
        consumed.setCreatedAt(now.minusMinutes(2));
        repo.save(consumed);

        Optional<EmailLoginCode> found = repo.findLatestActive("c@test.com", now);

        assertThat(found).isEmpty();
    }

    @Test
    void existsByEmailCreatedAfter_detectsCooldown() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusSeconds(60);

        EmailLoginCode recent = new EmailLoginCode();
        recent.setEmail("d@test.com");
        recent.setCodeHash("hash-recent");
        recent.setExpiresAt(now.plusMinutes(10));
        recent.setCreatedAt(now.minusSeconds(30));
        repo.save(recent);

        assertThat(repo.existsByEmailAndCreatedAtAfter("d@test.com", cutoff)).isTrue();
        assertThat(repo.existsByEmailAndCreatedAtAfter("d@test.com", now)).isFalse();
    }

    @Test
    void countByEmailCreatedAfter_detectsHourlyCap() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneHourAgo = now.minusHours(1);

        for (int i = 0; i < 4; i++) {
            EmailLoginCode code = new EmailLoginCode();
            code.setEmail("e@test.com");
            code.setCodeHash("hash-" + i);
            code.setExpiresAt(now.plusMinutes(10));
            code.setCreatedAt(now.minusMinutes(50 - i));
            repo.save(code);
        }

        assertThat(repo.countByEmailAndCreatedAtAfter("e@test.com", oneHourAgo)).isEqualTo(4);
    }
}
