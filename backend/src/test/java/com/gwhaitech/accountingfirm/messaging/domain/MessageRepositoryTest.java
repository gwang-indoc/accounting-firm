package com.gwhaitech.accountingfirm.messaging.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class MessageRepositoryTest {

    @Autowired private TestEntityManager em;
    @Autowired private MessageRepository repo;

    @Test
    void findByThreadIdOrderBySentAtAsc_returnsOldestFirst() throws InterruptedException {
        Long threadId = seedThread();
        Long userId = seedUser();
        em.persist(msg(threadId, SenderType.CLIENT, "first", userId)); em.flush();
        Thread.sleep(10);
        em.persist(msg(threadId, SenderType.ADMIN, "second", userId)); em.flush();

        List<Message> ordered = repo.findByThreadIdOrderBySentAtAsc(threadId);

        assertThat(ordered).extracting(Message::getBody).containsExactly("first", "second");
    }

    private Long seedUser() {
        String unique = UUID.randomUUID().toString();
        Object id = em.getEntityManager()
                .createNativeQuery(
                        "INSERT INTO users (email, google_sub, role, created_at) " +
                        "VALUES (:email, :sub, 'ADMIN', now()) RETURNING id")
                .setParameter("email", "test-" + unique + "@x.com")
                .setParameter("sub", "sub-" + unique)
                .getSingleResult();
        return ((Number) id).longValue();
    }

    private Long seedThread() {
        Object cid = em.getEntityManager()
                .createNativeQuery("INSERT INTO clients (name, created_at) VALUES ('X', now()) RETURNING id")
                .getSingleResult();
        MessageThread t = new MessageThread();
        t.setClientId(((Number) cid).longValue());
        t.setSubject("seed");
        em.persist(t); em.flush();
        return t.getId();
    }

    private Message msg(Long threadId, SenderType s, String body, Long userId) {
        Message m = new Message();
        m.setThreadId(threadId);
        m.setSenderType(s);
        m.setSenderUserId(userId);
        m.setBody(body);
        return m;
    }
}
