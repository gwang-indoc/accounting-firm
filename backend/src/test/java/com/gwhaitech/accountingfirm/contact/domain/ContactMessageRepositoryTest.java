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
    void findAllSortedBySubmittedAtDesc() throws InterruptedException {
        ContactMessage first = new ContactMessage();
        first.setName("First");
        first.setEmail("first@example.com");
        first.setSubject("First Subject");
        first.setMessage("First Message");
        repository.save(first);
        entityManager.flush();
        entityManager.clear();

        Thread.sleep(10);

        ContactMessage second = new ContactMessage();
        second.setName("Second");
        second.setEmail("second@example.com");
        second.setSubject("Second Subject");
        second.setMessage("Second Message");
        repository.save(second);
        entityManager.flush();
        entityManager.clear();

        List<ContactMessage> results = repository.findAll(Sort.by("submittedAt").descending());

        assertTrue(results.size() >= 2);
        assertEquals("Second", results.get(0).getName());
    }

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
