package com.gwhaitech.accountingfirm.client.domain;

import com.gwhaitech.accountingfirm.auth.domain.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
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
class ClientRepositoryTest {

    @Autowired
    ClientRepository repo;

    @Autowired
    TestEntityManager em;

    @Test
    void findByEmailIgnoreCaseOrderById_matchesRegardlessOfCase_inIdOrder() {
        Client a = new Client(); a.setName("A"); a.setEmail("jane@example.com");
        Client b = new Client(); b.setName("B"); b.setEmail("JANE@Example.com");
        Client c = new Client(); c.setName("C"); c.setEmail("other@example.com");
        repo.save(a); repo.save(b); repo.save(c);

        List<Client> matches = repo.findByEmailIgnoreCaseOrderById("JANE@example.com");

        assertThat(matches).hasSize(2);
        assertThat(matches.get(0).getId()).isLessThan(matches.get(1).getId());
    }

    @Test
    void findByEmailIgnoreCaseOrderById_returnsEmptyWhenNoMatch() {
        Client a = new Client(); a.setName("A"); a.setEmail("jane@example.com");
        repo.save(a);

        assertThat(repo.findByEmailIgnoreCaseOrderById("nobody@example.com")).isEmpty();
    }

    @Test
    void findByUserId_returnsTheLinkedClient() {
        User user = new User();
        user.setEmail("u@test.com");
        user.setName("Test User");
        em.persistAndFlush(user);
        Long userId = user.getId();

        Client a = new Client(); a.setName("A"); a.setEmail("a@x.com"); a.setUserId(userId);
        Client b = new Client(); b.setName("B"); b.setEmail("b@x.com"); b.setUserId(null);
        repo.save(a); repo.save(b);

        Optional<Client> found = repo.findByUserId(userId);

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("A");
    }

    @Test
    void findByUserId_returnsEmptyWhenUnlinked() {
        Client a = new Client(); a.setName("A"); a.setEmail("a@x.com"); a.setUserId(null);
        repo.save(a);

        assertThat(repo.findByUserId(99L)).isEmpty();
    }
}
