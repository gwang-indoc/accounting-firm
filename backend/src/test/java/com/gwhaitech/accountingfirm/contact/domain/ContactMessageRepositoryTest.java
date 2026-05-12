package com.gwhaitech.accountingfirm.contact.domain;

import com.gwhaitech.accountingfirm.contact.repository.ContactMessageRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
    "spring.datasource.username=postgres",
    "spring.datasource.password=postgres",
    "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class ContactMessageRepositoryTest {

    @Autowired
    private ContactMessageRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void saveAndRetrieve() {
        ContactMessage msg = new ContactMessage();
        msg.setName("Alice");
        msg.setEmail("alice@example.com");
        msg.setSubject("Hello");
        msg.setMessage("World");

        ContactMessage saved = repository.save(msg);
        ContactMessage found = repository.findById(saved.getId()).orElseThrow();

        assertEquals("Alice", found.getName());
        assertEquals("alice@example.com", found.getEmail());
        assertEquals("Hello", found.getSubject());
        assertEquals("World", found.getMessage());
        assertNotNull(found.getSubmittedAt());
    }
}
