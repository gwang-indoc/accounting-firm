package com.gwhaitech.accountingfirm.client.domain;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class ClientEntityTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private UserRepository userRepository;

    @Test
    void persistAndRetrieveClient() {
        User admin = new User();
        admin.setEmail("admin@acmecorp.com");
        admin.setName("Admin");
        admin.setRole("ADMIN");
        User savedAdmin = userRepository.save(admin);

        Client client = new Client();
        client.setName("Acme Corp");
        client.setEmail("contact@acme.com");
        client.setPhone("555-1234");
        client.setAdminId(savedAdmin.getId());

        Client saved = em.persistFlushFind(client);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Acme Corp");
        assertThat(saved.getEmail()).isEqualTo("contact@acme.com");
        assertThat(saved.getPhone()).isEqualTo("555-1234");
        assertThat(saved.getCreatedAt()).isNotNull();
    }
}
