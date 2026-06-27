package com.gwhaitech.accountingfirm.client.domain;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Optional;

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
class ClientRepositoryTest {

    @Autowired
    ClientRepository repo;

    @Autowired
    ClientDocumentRepository docRepo;

    @Autowired
    TestEntityManager em;

    @org.junit.jupiter.api.BeforeEach
    void cleanup() {
        docRepo.deleteAll();
        repo.deleteAll();
    }

    private User persistAdmin(String email) {
        User admin = new User();
        admin.setEmail(email);
        admin.setName("Admin");
        admin.setRole("ADMIN");
        em.persistAndFlush(admin);
        return admin;
    }

    // ── existing tests updated to supply required admin_id ──────────────────

    @Test
    void findByEmailIgnoreCaseOrderById_matchesRegardlessOfCase_inIdOrder() {
        User admin = persistAdmin("admin1@test.com");
        Client a = new Client(); a.setName("A"); a.setEmail("jane@example.com"); a.setAdminId(admin.getId()); a.setBusinessType(BusinessType.PERSONAL); a.setFiscalYearEndMonth((short) 12); a.setFiscalYearEndDay((short) 31);
        Client c = new Client(); c.setName("C"); c.setEmail("other@example.com"); c.setAdminId(admin.getId()); c.setBusinessType(BusinessType.PERSONAL); c.setFiscalYearEndMonth((short) 12); c.setFiscalYearEndDay((short) 31);
        repo.save(a); repo.save(c);

        List<Client> matches = repo.findByEmailIgnoreCaseOrderById("jane@example.com");

        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).getEmail()).isEqualToIgnoringCase("jane@example.com");
    }

    @Test
    void findByEmailIgnoreCaseOrderById_returnsEmptyWhenNoMatch() {
        User admin = persistAdmin("admin2@test.com");
        Client a = new Client(); a.setName("A"); a.setEmail("jane@example.com"); a.setAdminId(admin.getId()); a.setBusinessType(BusinessType.PERSONAL); a.setFiscalYearEndMonth((short) 12); a.setFiscalYearEndDay((short) 31);
        repo.save(a);

        assertThat(repo.findByEmailIgnoreCaseOrderById("nobody@example.com")).isEmpty();
    }

    @Test
    void findByUserId_returnsTheLinkedClient() {
        User admin = persistAdmin("admin3@test.com");
        User user = new User();
        user.setEmail("u@test.com");
        user.setName("Test User");
        em.persistAndFlush(user);
        Long userId = user.getId();

        Client a = new Client(); a.setName("A"); a.setEmail("a@x.com"); a.setUserId(userId); a.setAdminId(admin.getId()); a.setBusinessType(BusinessType.PERSONAL); a.setFiscalYearEndMonth((short) 12); a.setFiscalYearEndDay((short) 31);
        Client b = new Client(); b.setName("B"); b.setEmail("b@x.com"); b.setUserId(null); b.setAdminId(admin.getId()); b.setBusinessType(BusinessType.PERSONAL); b.setFiscalYearEndMonth((short) 12); b.setFiscalYearEndDay((short) 31);
        repo.save(a); repo.save(b);

        Optional<Client> found = repo.findByUserId(userId);

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("A");
    }

    @Test
    void findByUserId_returnsEmptyWhenUnlinked() {
        User admin = persistAdmin("admin4@test.com");
        Client a = new Client(); a.setName("A"); a.setEmail("a@x.com"); a.setUserId(null); a.setAdminId(admin.getId()); a.setBusinessType(BusinessType.PERSONAL); a.setFiscalYearEndMonth((short) 12); a.setFiscalYearEndDay((short) 31);
        repo.save(a);

        assertThat(repo.findByUserId(99L)).isEmpty();
    }

    // ── new constraint tests (RED: will fail until migration V12 is applied) ─

    @Test
    void rejectsClientWithNullAdminId() {
        Client c = new Client();
        c.setName("No Admin");
        c.setEmail("noadmin@example.com");
        c.setBusinessType(BusinessType.PERSONAL);
        c.setFiscalYearEndMonth((short) 12);
        c.setFiscalYearEndDay((short) 31);
        // admin_id intentionally not set

        assertThatThrownBy(() -> { repo.save(c); em.flush(); })
                .isInstanceOf(Exception.class);
    }

    @Test
    void rejectsClientWithNullEmail() {
        User admin = persistAdmin("admin5@test.com");
        Client c = new Client();
        c.setName("No Email");
        c.setAdminId(admin.getId());
        c.setBusinessType(BusinessType.PERSONAL);
        c.setFiscalYearEndMonth((short) 12);
        c.setFiscalYearEndDay((short) 31);
        // email intentionally not set

        assertThatThrownBy(() -> { repo.save(c); em.flush(); })
                .isInstanceOf(Exception.class);
    }

    @Test
    void rejectsDuplicateClientEmail() {
        User admin = persistAdmin("admin6@test.com");
        Client a = new Client(); a.setName("A"); a.setEmail("dup@example.com"); a.setAdminId(admin.getId()); a.setBusinessType(BusinessType.PERSONAL); a.setFiscalYearEndMonth((short) 12); a.setFiscalYearEndDay((short) 31);
        repo.save(a);
        em.flush();
        em.clear();

        Client b = new Client(); b.setName("B"); b.setEmail("dup@example.com"); b.setAdminId(admin.getId()); b.setBusinessType(BusinessType.PERSONAL); b.setFiscalYearEndMonth((short) 12); b.setFiscalYearEndDay((short) 31);

        assertThatThrownBy(() -> { repo.save(b); em.flush(); })
                .isInstanceOf(Exception.class);
    }
}
