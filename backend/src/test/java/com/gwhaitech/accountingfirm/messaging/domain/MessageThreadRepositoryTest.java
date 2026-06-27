package com.gwhaitech.accountingfirm.messaging.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

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
class MessageThreadRepositoryTest {

    @Autowired private TestEntityManager em;
    @Autowired private MessageThreadRepository repo;

    @Test
    void findByClientIdOrderByLastMessageAtDesc_returnsNewestFirst() {
        Long clientId = seedClient();
        MessageThread older = newThread(clientId, "Old", java.time.LocalDateTime.now().minusDays(2));
        MessageThread newer = newThread(clientId, "New", java.time.LocalDateTime.now());
        em.persist(older); em.persist(newer); em.flush();

        List<MessageThread> all = repo.findByClientIdOrderByLastMessageAtDesc(clientId);

        assertThat(all).extracting(MessageThread::getSubject).containsExactly("New", "Old");
    }

    @Test
    void sumAdminUnreadByClient_aggregatesPerClient() {
        Long c1 = seedClient();
        Long c2 = seedClient();
        em.persist(threadWithAdminUnread(c1, 2));
        em.persist(threadWithAdminUnread(c1, 3));
        em.persist(threadWithAdminUnread(c2, 1));
        em.persist(threadWithAdminUnread(c2, 0));
        em.flush();

        List<ClientUnreadRow> rows = repo.sumAdminUnreadByClient();

        assertThat(rows).extracting(r -> r.getClientId() + ":" + r.getUnreadCount())
                .containsExactlyInAnyOrder(c1 + ":5", c2 + ":1");
    }

    private Long seedClient() {
        Object uid = em.getEntityManager()
                .createNativeQuery("INSERT INTO users (email, name, role) VALUES ('seed-thread@test.com', 'Seed', 'ADMIN') ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id")
                .getSingleResult();
        Object id = em.getEntityManager()
                .createNativeQuery("INSERT INTO clients (name, email, admin_id, created_at, business_type, fiscal_year_end_month, fiscal_year_end_day) VALUES ('Test', gen_random_uuid()::text || '@test.com', " + ((Number) uid).longValue() + ", now(), 'PERSONAL', 12, 31) RETURNING id")
                .getSingleResult();
        return ((Number) id).longValue();
    }

    private MessageThread newThread(Long clientId, String subject, java.time.LocalDateTime lastAt) {
        MessageThread t = new MessageThread();
        t.setClientId(clientId);
        t.setSubject(subject);
        t.setLastMessageAt(lastAt);
        return t;
    }

    private MessageThread threadWithAdminUnread(Long clientId, int n) {
        MessageThread t = newThread(clientId, "x", java.time.LocalDateTime.now());
        t.setAdminUnreadCount(n);
        return t;
    }
}
