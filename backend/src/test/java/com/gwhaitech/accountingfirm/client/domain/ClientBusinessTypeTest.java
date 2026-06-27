package com.gwhaitech.accountingfirm.client.domain;

import com.gwhaitech.accountingfirm.auth.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;

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
class ClientBusinessTypeTest {

    @Autowired
    ClientRepository repo;

    @Autowired
    ClientDocumentRepository docRepo;

    @Autowired
    TestEntityManager em;

    private User admin;

    @BeforeEach
    void setup() {
        docRepo.deleteAll();
        repo.deleteAll();
        admin = new User();
        admin.setEmail("btype-admin@test.com");
        admin.setName("Admin");
        admin.setRole("ADMIN");
        em.persistAndFlush(admin);
    }

    @Test
    void persistsCorporateClientWithFiscalYearEnd() {
        Client c = new Client();
        c.setName("Acme Corp");
        c.setEmail("acme@corp.com");
        c.setAdminId(admin.getId());
        c.setBusinessType(BusinessType.CORPORATE);
        c.setFiscalYearEndMonth((short) 3);
        c.setFiscalYearEndDay((short) 31);

        Client saved = repo.save(c);
        em.flush();
        em.clear();

        Client found = repo.findById(saved.getId()).orElseThrow();
        assertThat(found.getBusinessType()).isEqualTo(BusinessType.CORPORATE);
        assertThat(found.getFiscalYearEndMonth()).isEqualTo((short) 3);
        assertThat(found.getFiscalYearEndDay()).isEqualTo((short) 31);
    }

    @Test
    void persistsPersonalClientWithDefaultFiscalYearEnd() {
        Client c = new Client();
        c.setName("Jane Doe");
        c.setEmail("jane@example.com");
        c.setAdminId(admin.getId());
        c.setBusinessType(BusinessType.PERSONAL);
        c.setFiscalYearEndMonth((short) 12);
        c.setFiscalYearEndDay((short) 31);

        Client saved = repo.save(c);
        em.flush();
        em.clear();

        Client found = repo.findById(saved.getId()).orElseThrow();
        assertThat(found.getBusinessType()).isEqualTo(BusinessType.PERSONAL);
        assertThat(found.getFiscalYearEndMonth()).isEqualTo((short) 12);
        assertThat(found.getFiscalYearEndDay()).isEqualTo((short) 31);
    }

    @Test
    void rejectsClientWithNullBusinessType() {
        Client c = new Client();
        c.setName("Bad Client");
        c.setEmail("bad@example.com");
        c.setAdminId(admin.getId());
        // businessType intentionally not set (null)
        c.setFiscalYearEndMonth((short) 12);
        c.setFiscalYearEndDay((short) 31);

        assertThatThrownBy(() -> { repo.save(c); em.flush(); })
                .isInstanceOf(Exception.class);
    }
}
