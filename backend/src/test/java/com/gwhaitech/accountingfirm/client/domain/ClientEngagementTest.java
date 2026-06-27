package com.gwhaitech.accountingfirm.client.domain;

import com.gwhaitech.accountingfirm.auth.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class ClientEngagementTest {

    @Autowired
    ClientEngagementRepository engagementRepo;

    @Autowired
    ClientEngagementHistoryRepository historyRepo;

    @Autowired
    ClientRepository clientRepo;

    @Autowired
    ClientDocumentRepository docRepo;

    @Autowired
    TestEntityManager em;

    private User admin;
    private Client client;

    @BeforeEach
    void setup() {
        historyRepo.deleteAll();
        engagementRepo.deleteAll();
        docRepo.deleteAll();
        clientRepo.deleteAll();

        admin = new User();
        admin.setEmail("eng-admin@test.com");
        admin.setName("Admin");
        admin.setRole("ADMIN");
        em.persistAndFlush(admin);

        client = new Client();
        client.setName("Acme Corp");
        client.setEmail("acme-eng@test.com");
        client.setAdminId(admin.getId());
        client.setBusinessType(BusinessType.PERSONAL);
        client.setFiscalYearEndMonth((short) 12);
        client.setFiscalYearEndDay((short) 31);
        client = clientRepo.save(client);
        em.flush();
    }

    @Test
    void createsEngagementAtStartWithInitialHistoryRow() {
        ClientEngagement engagement = new ClientEngagement();
        engagement.setClientId(client.getId());
        engagement.setTaxYear((short) 2024);
        engagement.setStatus(EngagementStatus.START);
        engagement.setUpdatedBy(admin.getId());
        engagement.setUpdatedAt(LocalDateTime.now());
        ClientEngagement saved = engagementRepo.save(engagement);
        em.flush();

        ClientEngagementHistory history = new ClientEngagementHistory();
        history.setEngagementId(saved.getId());
        history.setFromStatus(null);
        history.setToStatus(EngagementStatus.START);
        history.setChangedBy(admin.getId());
        history.setChangedAt(LocalDateTime.now());
        historyRepo.save(history);
        em.flush();
        em.clear();

        ClientEngagement found = engagementRepo.findById(saved.getId()).orElseThrow();
        assertThat(found.getStatus()).isEqualTo(EngagementStatus.START);
        assertThat(found.getTaxYear()).isEqualTo((short) 2024);

        List<ClientEngagementHistory> rows = historyRepo.findByEngagementIdOrderByChangedAtAsc(saved.getId());
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getFromStatus()).isNull();
        assertThat(rows.get(0).getToStatus()).isEqualTo(EngagementStatus.START);
    }

    @Test
    void rejectsDuplicateClientAndTaxYear() {
        ClientEngagement first = new ClientEngagement();
        first.setClientId(client.getId());
        first.setTaxYear((short) 2025);
        first.setStatus(EngagementStatus.START);
        first.setUpdatedBy(admin.getId());
        first.setUpdatedAt(LocalDateTime.now());
        engagementRepo.save(first);
        em.flush();
        em.clear();

        ClientEngagement second = new ClientEngagement();
        second.setClientId(client.getId());
        second.setTaxYear((short) 2025);
        second.setStatus(EngagementStatus.START);
        second.setUpdatedBy(admin.getId());
        second.setUpdatedAt(LocalDateTime.now());

        assertThatThrownBy(() -> { engagementRepo.save(second); em.flush(); })
                .isInstanceOf(Exception.class);
    }
}
