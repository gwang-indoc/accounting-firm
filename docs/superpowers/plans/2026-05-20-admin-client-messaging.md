# Admin ↔ Client Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two-way subject-tagged threaded messaging between admin staff and clients, with a portal inbox, a per-client unread badge on the admin clients list, and notification emails on every new message. Spec: `docs/superpowers/specs/2026-05-20-admin-client-messaging-design.md`.

**Architecture:** Backend gets two new tables (`message_threads`, `messages`), a `MessagingService`, two controllers (admin scope under `/api/clients/.../threads`, portal scope under `/api/portal/...`), and a `@TransactionalEventListener(AFTER_COMMIT)` that emits notification emails via the existing `JavaMailSender`. The frontend adds admin pages (thread list, thread view, new-thread dialog), portal pages (inbox, thread view, new-thread dialog), and an unread badge on the admin clients list row + portal navbar.

**Tech Stack:** Java 21 / Spring Boot 3.5 (Flyway, JPA, `@WebMvcTest` + mirrored `TestSecurityConfig` for slice tests, MockMvc, Mockito), Angular 21 standalone components (zoneless, Vitest + TestBed, Angular Material dialogs), Playwright E2E.

---

## File Map

### Phase 1 — Backend

**New files:**
- `backend/src/main/resources/db/migration/V8__create_message_threads_and_messages.sql`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/SenderType.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThread.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/Message.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThreadRepository.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageRepository.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageDto.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadDto.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/NewThreadRequest.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/NewMessageRequest.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/ClientUnreadCountDto.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/ThreadNotFoundException.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/ThreadForbiddenException.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/NoLinkedClientException.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageController.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThreadRepositoryTest.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/domain/MessageRepositoryTest.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerSecurityTest.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerTest.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerSecurityTest.java`

**Modified files:**
- `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java` — add matchers for `/api/clients/*/threads/**`, `/api/clients/unread-counts`, `/api/portal/**`

### Phase 2 — Admin frontend

**New files:**
- `frontend/src/app/core/models/message.model.ts`
- `frontend/src/app/core/services/admin-client-messages.service.ts`
- `frontend/src/app/core/services/admin-client-messages.service.spec.ts`
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.ts`
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.html`
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.css`
- `frontend/src/app/features/admin/client-messages/admin-client-threads.component.spec.ts`
- `frontend/src/app/features/admin/client-messages/admin-client-thread-view.component.ts`
- `frontend/src/app/features/admin/client-messages/admin-client-thread-view.component.html`
- `frontend/src/app/features/admin/client-messages/admin-client-thread-view.component.css`
- `frontend/src/app/features/admin/client-messages/admin-client-thread-view.component.spec.ts`
- `frontend/src/app/features/admin/client-messages/new-thread-dialog.component.ts`

**Modified files:**
- `frontend/src/app/core/services/admin-clients.service.ts` — add `getUnreadCounts()`
- `frontend/src/app/core/services/admin-clients.service.spec.ts`
- `frontend/src/app/features/admin/clients/admin-clients.component.ts` — load + merge unread counts
- `frontend/src/app/features/admin/clients/admin-clients.component.html` — Messages button with badge
- `frontend/src/app/features/admin/clients/admin-clients.component.css` — badge styling
- `frontend/src/app/features/admin/clients/admin-clients.component.spec.ts`
- `frontend/src/app/app.routes.ts` — admin messages routes

### Phase 3 — Portal frontend

**New files:**
- `frontend/src/app/core/services/portal-messages.service.ts`
- `frontend/src/app/core/services/portal-messages.service.spec.ts`
- `frontend/src/app/features/client-portal/messages/portal-inbox.component.ts`
- `frontend/src/app/features/client-portal/messages/portal-inbox.component.html`
- `frontend/src/app/features/client-portal/messages/portal-inbox.component.css`
- `frontend/src/app/features/client-portal/messages/portal-inbox.component.spec.ts`
- `frontend/src/app/features/client-portal/messages/portal-thread-view.component.ts`
- `frontend/src/app/features/client-portal/messages/portal-thread-view.component.html`
- `frontend/src/app/features/client-portal/messages/portal-thread-view.component.css`
- `frontend/src/app/features/client-portal/messages/portal-thread-view.component.spec.ts`
- `frontend/src/app/features/client-portal/messages/new-portal-thread-dialog.component.ts`

**Modified files:**
- `frontend/src/app/app.routes.ts` — portal messages routes
- Portal navbar (located in Phase 3) — Messages link with unread badge

### Phase 4 — Email + E2E

**New files:**
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/event/MessagePostedEvent.java`
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/event/MessageNotificationListener.java`
- `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/event/MessageNotificationListenerTest.java`
- `e2e/admin-client-messaging.spec.ts`

**Modified files:**
- `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java` — publish events
- `backend/src/main/resources/application.yml` — add `app.publicBaseUrl`

---

## Conventions

- **TDD strict:** Every new behavior gets a failing test first. Confirm the failure (with the actual failure message) before implementing. See `superpowers:test-driven-development`.
- **Each phase ends with three closing tasks:** (1) `superpowers:requesting-code-review` on the phase diff; address CRITICAL/HIGH before moving on, (2) dev-log entry in `docs/log/YYYY-MM-DD.md` with commit hashes, feature bullets, review findings, and TDD evidence (paste RED failure lines), (3) full baseline run (backend + frontend tests; e2e in Phase 4).
- **Commits:** Small commits, conventional-commits style. Co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **Baselines before each phase:** `cd backend && ./mvnw test` and `cd frontend && npx ng test --no-watch` must be green before starting a new phase. If not, fix or document the pre-existing failure first.

---

# Phase 1 — Backend (Schema, Service, Endpoints)

**Pre-flight:** Confirm a green baseline:
```bash
cd backend && ./mvnw test 2>&1 | tail -10
cd frontend && npx ng test --no-watch 2>&1 | tail -10
```
If pre-existing failures exist (per CLAUDE.md, some env-var-dependent tests are known-failing without `GOOGLE_CLIENT_ID`/`JWT_SECRET`), note them in the dev log and proceed — but **no new test added in this plan may fail**.

## Task 1: Flyway migration — create tables

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__create_message_threads_and_messages.sql`

- [ ] **Step 1: Create the migration file**

  ```sql
  CREATE TABLE message_threads (
      id                    BIGSERIAL    PRIMARY KEY,
      client_id             BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      subject               VARCHAR(200) NOT NULL,
      created_at            TIMESTAMP    NOT NULL DEFAULT now(),
      last_message_at       TIMESTAMP    NOT NULL DEFAULT now(),
      admin_unread_count    INT          NOT NULL DEFAULT 0,
      client_unread_count   INT          NOT NULL DEFAULT 0
  );

  CREATE INDEX idx_message_threads_client_last_msg
      ON message_threads (client_id, last_message_at DESC);

  CREATE TABLE messages (
      id              BIGSERIAL   PRIMARY KEY,
      thread_id       BIGINT      NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
      sender_type     VARCHAR(10) NOT NULL CHECK (sender_type IN ('ADMIN','CLIENT')),
      sender_user_id  BIGINT      NOT NULL REFERENCES users(id),
      body            TEXT        NOT NULL,
      sent_at         TIMESTAMP   NOT NULL DEFAULT now()
  );

  CREATE INDEX idx_messages_thread_sent
      ON messages (thread_id, sent_at);
  ```

- [ ] **Step 2: Run Flyway via test boot to confirm the migration applies cleanly**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientRepositoryTest -q 2>&1 | tail -20
  ```
  Expected: PASS (Flyway runs against the local DB on Spring context start; if the migration is malformed, the context fails to load and the test errors out).

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/main/resources/db/migration/V8__create_message_threads_and_messages.sql
  git commit -m "feat(db): V8 — message_threads + messages schema"
  ```

## Task 2: SenderType enum + MessageThread entity

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/SenderType.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThread.java`

- [ ] **Step 1: Create `SenderType` enum**

  ```java
  package com.gwhaitech.accountingfirm.messaging.domain;

  public enum SenderType {
      ADMIN, CLIENT
  }
  ```

- [ ] **Step 2: Create `MessageThread` entity**

  ```java
  package com.gwhaitech.accountingfirm.messaging.domain;

  import jakarta.persistence.*;
  import java.time.LocalDateTime;

  @Entity
  @Table(name = "message_threads")
  public class MessageThread {

      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @Column(name = "client_id", nullable = false)
      private Long clientId;

      @Column(nullable = false, length = 200)
      private String subject;

      @Column(name = "created_at", nullable = false, updatable = false)
      private LocalDateTime createdAt;

      @Column(name = "last_message_at", nullable = false)
      private LocalDateTime lastMessageAt;

      @Column(name = "admin_unread_count", nullable = false)
      private int adminUnreadCount;

      @Column(name = "client_unread_count", nullable = false)
      private int clientUnreadCount;

      @PrePersist
      protected void onCreate() {
          LocalDateTime now = LocalDateTime.now();
          if (createdAt == null) createdAt = now;
          if (lastMessageAt == null) lastMessageAt = now;
      }

      public Long getId() { return id; }
      public Long getClientId() { return clientId; }
      public void setClientId(Long v) { this.clientId = v; }
      public String getSubject() { return subject; }
      public void setSubject(String v) { this.subject = v; }
      public LocalDateTime getCreatedAt() { return createdAt; }
      public LocalDateTime getLastMessageAt() { return lastMessageAt; }
      public void setLastMessageAt(LocalDateTime v) { this.lastMessageAt = v; }
      public int getAdminUnreadCount() { return adminUnreadCount; }
      public void setAdminUnreadCount(int v) { this.adminUnreadCount = v; }
      public int getClientUnreadCount() { return clientUnreadCount; }
      public void setClientUnreadCount(int v) { this.clientUnreadCount = v; }
  }
  ```

- [ ] **Step 3: Compile check**

  ```bash
  cd backend && ./mvnw compile -q 2>&1 | tail -5
  ```
  Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/SenderType.java \
          backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThread.java
  git commit -m "feat(messaging): MessageThread entity + SenderType enum"
  ```

## Task 3: Message entity

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/Message.java`

- [ ] **Step 1: Create `Message` entity**

  ```java
  package com.gwhaitech.accountingfirm.messaging.domain;

  import jakarta.persistence.*;
  import java.time.LocalDateTime;

  @Entity
  @Table(name = "messages")
  public class Message {

      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;

      @Column(name = "thread_id", nullable = false)
      private Long threadId;

      @Enumerated(EnumType.STRING)
      @Column(name = "sender_type", nullable = false, length = 10)
      private SenderType senderType;

      @Column(name = "sender_user_id", nullable = false)
      private Long senderUserId;

      @Column(nullable = false, columnDefinition = "TEXT")
      private String body;

      @Column(name = "sent_at", nullable = false, updatable = false)
      private LocalDateTime sentAt;

      @PrePersist
      protected void onCreate() {
          if (sentAt == null) sentAt = LocalDateTime.now();
      }

      public Long getId() { return id; }
      public Long getThreadId() { return threadId; }
      public void setThreadId(Long v) { this.threadId = v; }
      public SenderType getSenderType() { return senderType; }
      public void setSenderType(SenderType v) { this.senderType = v; }
      public Long getSenderUserId() { return senderUserId; }
      public void setSenderUserId(Long v) { this.senderUserId = v; }
      public String getBody() { return body; }
      public void setBody(String v) { this.body = v; }
      public LocalDateTime getSentAt() { return sentAt; }
  }
  ```

- [ ] **Step 2: Compile check**

  ```bash
  cd backend && ./mvnw compile -q 2>&1 | tail -5
  ```
  Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/Message.java
  git commit -m "feat(messaging): Message entity"
  ```

## Task 4: Repositories with custom queries (RED → GREEN)

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThreadRepository.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/MessageRepository.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/domain/MessageThreadRepositoryTest.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/domain/MessageRepositoryTest.java`

- [ ] **Step 1: RED — write `MessageThreadRepositoryTest`**

  ```java
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
          Object id = em.getEntityManager()
                  .createNativeQuery("INSERT INTO clients (name, created_at) VALUES ('Test', now()) RETURNING id")
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
  ```

- [ ] **Step 2: Run the test — expect COMPILE FAIL (repo + projection don't exist)**

  ```bash
  cd backend && ./mvnw test -Dtest=MessageThreadRepositoryTest -q 2>&1 | tail -25
  ```
  Expected: compile failure — `MessageThreadRepository`, `ClientUnreadRow` cannot be resolved. **Paste these failure lines into the dev log as TDD evidence.**

- [ ] **Step 3: GREEN — create `MessageThreadRepository` with `ClientUnreadRow` projection**

  ```java
  package com.gwhaitech.accountingfirm.messaging.domain;

  import org.springframework.data.jpa.repository.JpaRepository;
  import org.springframework.data.jpa.repository.Query;

  import java.util.List;

  public interface MessageThreadRepository extends JpaRepository<MessageThread, Long> {

      List<MessageThread> findByClientIdOrderByLastMessageAtDesc(Long clientId);

      @Query("""
             SELECT t.clientId AS clientId, SUM(t.adminUnreadCount) AS unreadCount
             FROM MessageThread t
             WHERE t.adminUnreadCount > 0
             GROUP BY t.clientId
             """)
      List<ClientUnreadRow> sumAdminUnreadByClient();

      @Query("""
             SELECT COALESCE(SUM(t.clientUnreadCount), 0)
             FROM MessageThread t
             WHERE t.clientId = ?1
             """)
      int sumClientUnreadForClient(Long clientId);
  }
  ```

  And the projection interface — same file or a sibling, your call. Sibling for clarity:

  Add `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/ClientUnreadRow.java`:
  ```java
  package com.gwhaitech.accountingfirm.messaging.domain;

  public interface ClientUnreadRow {
      Long getClientId();
      Long getUnreadCount();
  }
  ```

- [ ] **Step 4: Run the test — expect PASS**

  ```bash
  cd backend && ./mvnw test -Dtest=MessageThreadRepositoryTest -q 2>&1 | tail -10
  ```
  Expected: PASS, 2 tests.

- [ ] **Step 5: RED — write `MessageRepositoryTest`**

  ```java
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
  class MessageRepositoryTest {

      @Autowired private TestEntityManager em;
      @Autowired private MessageRepository repo;

      @Test
      void findByThreadIdOrderBySentAtAsc_returnsOldestFirst() {
          Long threadId = seedThread();
          em.persist(msg(threadId, SenderType.ADMIN, "second", java.time.LocalDateTime.now()));
          em.persist(msg(threadId, SenderType.CLIENT, "first", java.time.LocalDateTime.now().minusMinutes(5)));
          em.flush();

          List<Message> ordered = repo.findByThreadIdOrderBySentAtAsc(threadId);

          assertThat(ordered).extracting(Message::getBody).containsExactly("first", "second");
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

      private Message msg(Long threadId, SenderType s, String body, java.time.LocalDateTime at) {
          Message m = new Message();
          m.setThreadId(threadId);
          m.setSenderType(s);
          m.setSenderUserId(1L);
          m.setBody(body);
          // can't set sentAt directly (@PrePersist); use em.persist + native update for ordering control
          return m;
      }
  }
  ```

  Note: `sentAt` is `@PrePersist`-set, so ordering by insertion is sufficient. The `.minusMinutes(5)` in the older message is descriptive only — JPA will overwrite `sentAt`. To guarantee ordering, persist the older message first:

  Replace the test body's persist order:
  ```java
  em.persist(msg(threadId, SenderType.CLIENT, "first", null)); em.flush();
  Thread.sleep(10); // crude but reliable for sub-second resolution
  em.persist(msg(threadId, SenderType.ADMIN, "second", null)); em.flush();
  ```

  (Wrap the test in `throws InterruptedException`.)

- [ ] **Step 6: Run — expect compile fail (`MessageRepository` missing)**

  ```bash
  cd backend && ./mvnw test -Dtest=MessageRepositoryTest -q 2>&1 | tail -15
  ```
  Paste the failure into the dev log.

- [ ] **Step 7: GREEN — create `MessageRepository`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.domain;

  import org.springframework.data.jpa.repository.JpaRepository;

  import java.util.List;

  public interface MessageRepository extends JpaRepository<Message, Long> {
      List<Message> findByThreadIdOrderBySentAtAsc(Long threadId);
  }
  ```

- [ ] **Step 8: Run — expect PASS**

  ```bash
  cd backend && ./mvnw test -Dtest=MessageRepositoryTest -q 2>&1 | tail -10
  ```

- [ ] **Step 9: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/domain/ \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/domain/
  git commit -m "feat(messaging): repositories with thread + message + unread-count queries"
  ```

## Task 5: DTOs and request payloads

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageDto.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadDto.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/MessageThreadSummaryDto.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/NewThreadRequest.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/NewMessageRequest.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/ClientUnreadCountDto.java`

- [ ] **Step 1: Create `MessageDto`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.dto;

  import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
  import java.time.LocalDateTime;

  public record MessageDto(
          Long id,
          Long threadId,
          SenderType senderType,
          Long senderUserId,
          String body,
          LocalDateTime sentAt
  ) {}
  ```

- [ ] **Step 2: Create `MessageThreadDto`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.dto;

  import java.time.LocalDateTime;
  import java.util.List;

  public record MessageThreadDto(
          Long id,
          Long clientId,
          String subject,
          LocalDateTime createdAt,
          LocalDateTime lastMessageAt,
          int adminUnreadCount,
          int clientUnreadCount,
          List<MessageDto> messages
  ) {}
  ```

- [ ] **Step 3: Create `MessageThreadSummaryDto`** (used by list endpoints — no full messages, just preview)

  ```java
  package com.gwhaitech.accountingfirm.messaging.dto;

  import java.time.LocalDateTime;

  public record MessageThreadSummaryDto(
          Long id,
          Long clientId,
          String subject,
          LocalDateTime lastMessageAt,
          int unreadCount,
          String lastMessagePreview
  ) {}
  ```

  The `unreadCount` is whichever side the calling endpoint applies to (admin endpoints return `adminUnreadCount`, portal endpoints return `clientUnreadCount`). The `lastMessagePreview` is the last message's body truncated to 80 chars.

- [ ] **Step 4: Create `NewThreadRequest`** with Bean Validation

  ```java
  package com.gwhaitech.accountingfirm.messaging.dto;

  import jakarta.validation.constraints.NotBlank;
  import jakarta.validation.constraints.Size;

  public record NewThreadRequest(
          @NotBlank @Size(max = 200) String subject,
          @NotBlank @Size(max = 5000) String body
  ) {}
  ```

- [ ] **Step 5: Create `NewMessageRequest`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.dto;

  import jakarta.validation.constraints.NotBlank;
  import jakarta.validation.constraints.Size;

  public record NewMessageRequest(@NotBlank @Size(max = 5000) String body) {}
  ```

- [ ] **Step 6: Create `ClientUnreadCountDto`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.dto;

  public record ClientUnreadCountDto(Long clientId, long unreadCount) {}
  ```

- [ ] **Step 7: Compile + commit**

  ```bash
  cd backend && ./mvnw compile -q 2>&1 | tail -5
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/dto/
  git commit -m "feat(messaging): DTOs and request payloads"
  ```

## Task 6: Domain exceptions

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/ThreadNotFoundException.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/ThreadForbiddenException.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/NoLinkedClientException.java`

- [ ] **Step 1: Create all three exception classes**

  ```java
  // ThreadNotFoundException.java
  package com.gwhaitech.accountingfirm.messaging.exception;

  import org.springframework.http.HttpStatus;
  import org.springframework.web.bind.annotation.ResponseStatus;

  @ResponseStatus(HttpStatus.NOT_FOUND)
  public class ThreadNotFoundException extends RuntimeException {
      public ThreadNotFoundException(Long id) { super("Thread not found: " + id); }
  }
  ```

  ```java
  // ThreadForbiddenException.java
  package com.gwhaitech.accountingfirm.messaging.exception;

  import org.springframework.http.HttpStatus;
  import org.springframework.web.bind.annotation.ResponseStatus;

  @ResponseStatus(HttpStatus.FORBIDDEN)
  public class ThreadForbiddenException extends RuntimeException {
      public ThreadForbiddenException() { super("Not authorized to access this thread"); }
  }
  ```

  ```java
  // NoLinkedClientException.java
  package com.gwhaitech.accountingfirm.messaging.exception;

  import org.springframework.http.HttpStatus;
  import org.springframework.web.bind.annotation.ResponseStatus;

  @ResponseStatus(HttpStatus.CONFLICT)
  public class NoLinkedClientException extends RuntimeException {
      public NoLinkedClientException() { super("No client record linked to your account."); }
  }
  ```

- [ ] **Step 2: Compile + commit**

  ```bash
  cd backend && ./mvnw compile -q 2>&1 | tail -5
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/exception/
  git commit -m "feat(messaging): domain exceptions"
  ```

## Task 7: `MessagingService` — admin-side thread creation (RED → GREEN)

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java`

The service is large enough that we build it method-by-method, each with its own RED→GREEN cycle. Task 7 covers the first method (`createThreadAsAdmin`). Tasks 8–11 cover the rest.

- [ ] **Step 1: RED — write `createThreadAsAdmin` test in `MessagingServiceTest`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.service;

  import com.gwhaitech.accountingfirm.client.domain.Client;
  import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
  import com.gwhaitech.accountingfirm.messaging.domain.*;
  import com.gwhaitech.accountingfirm.messaging.dto.*;
  import org.junit.jupiter.api.BeforeEach;
  import org.junit.jupiter.api.Test;
  import org.mockito.ArgumentCaptor;

  import java.util.Optional;

  import static org.assertj.core.api.Assertions.assertThat;
  import static org.mockito.ArgumentMatchers.any;
  import static org.mockito.Mockito.*;

  class MessagingServiceTest {

      private MessageThreadRepository threadRepo;
      private MessageRepository messageRepo;
      private ClientRepository clientRepo;
      private MessagingService service;

      @BeforeEach
      void setUp() {
          threadRepo = mock(MessageThreadRepository.class);
          messageRepo = mock(MessageRepository.class);
          clientRepo = mock(ClientRepository.class);
          service = new MessagingService(threadRepo, messageRepo, clientRepo);
      }

      @Test
      void createThreadAsAdmin_persistsThread_andFirstAdminMessage_andBumpsClientUnread() {
          Client client = new Client();
          client.setId(7L);
          client.setName("Jane");
          when(clientRepo.findById(7L)).thenReturn(Optional.of(client));
          when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> {
              MessageThread t = inv.getArgument(0);
              t = spy(t);
              when(t.getId()).thenReturn(100L);
              return t;
          });

          MessageThreadDto dto = service.createThreadAsAdmin(7L, "Tax filing", "Hi Jane", 42L);

          ArgumentCaptor<MessageThread> threadCap = ArgumentCaptor.forClass(MessageThread.class);
          verify(threadRepo).save(threadCap.capture());
          assertThat(threadCap.getValue().getClientUnreadCount()).isEqualTo(1);
          assertThat(threadCap.getValue().getAdminUnreadCount()).isEqualTo(0);
          assertThat(threadCap.getValue().getSubject()).isEqualTo("Tax filing");

          ArgumentCaptor<Message> msgCap = ArgumentCaptor.forClass(Message.class);
          verify(messageRepo).save(msgCap.capture());
          assertThat(msgCap.getValue().getThreadId()).isEqualTo(100L);
          assertThat(msgCap.getValue().getSenderType()).isEqualTo(SenderType.ADMIN);
          assertThat(msgCap.getValue().getSenderUserId()).isEqualTo(42L);
          assertThat(msgCap.getValue().getBody()).isEqualTo("Hi Jane");

          assertThat(dto.id()).isEqualTo(100L);
          assertThat(dto.subject()).isEqualTo("Tax filing");
          assertThat(dto.clientUnreadCount()).isEqualTo(1);
      }
  }
  ```

- [ ] **Step 2: Run — expect compile fail (no MessagingService class)**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -15
  ```
  Paste failure into the dev log.

- [ ] **Step 3: GREEN — minimal `MessagingService` with `createThreadAsAdmin`**

  ```java
  package com.gwhaitech.accountingfirm.messaging.service;

  import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
  import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
  import com.gwhaitech.accountingfirm.messaging.domain.*;
  import com.gwhaitech.accountingfirm.messaging.dto.*;
  import org.springframework.stereotype.Service;
  import org.springframework.transaction.annotation.Transactional;

  import java.time.LocalDateTime;
  import java.util.List;

  @Service
  public class MessagingService {

      private final MessageThreadRepository threadRepo;
      private final MessageRepository messageRepo;
      private final ClientRepository clientRepo;

      public MessagingService(MessageThreadRepository threadRepo,
                              MessageRepository messageRepo,
                              ClientRepository clientRepo) {
          this.threadRepo = threadRepo;
          this.messageRepo = messageRepo;
          this.clientRepo = clientRepo;
      }

      @Transactional
      public MessageThreadDto createThreadAsAdmin(Long clientId, String subject, String body, Long adminUserId) {
          clientRepo.findById(clientId).orElseThrow(() -> new ClientNotFoundException(clientId));
          MessageThread t = new MessageThread();
          t.setClientId(clientId);
          t.setSubject(subject);
          t.setClientUnreadCount(1);
          t.setLastMessageAt(LocalDateTime.now());
          MessageThread saved = threadRepo.save(t);

          Message m = new Message();
          m.setThreadId(saved.getId());
          m.setSenderType(SenderType.ADMIN);
          m.setSenderUserId(adminUserId);
          m.setBody(body);
          messageRepo.save(m);

          return toThreadDto(saved, List.of(toMessageDto(m)));
      }

      private MessageDto toMessageDto(Message m) {
          return new MessageDto(m.getId(), m.getThreadId(), m.getSenderType(),
                  m.getSenderUserId(), m.getBody(), m.getSentAt());
      }

      private MessageThreadDto toThreadDto(MessageThread t, List<MessageDto> messages) {
          return new MessageThreadDto(t.getId(), t.getClientId(), t.getSubject(),
                  t.getCreatedAt(), t.getLastMessageAt(),
                  t.getAdminUnreadCount(), t.getClientUnreadCount(), messages);
      }
  }
  ```

- [ ] **Step 4: Run — expect PASS**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -10
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java
  git commit -m "feat(messaging): MessagingService.createThreadAsAdmin"
  ```

## Task 8: `createThreadAsClient` + `postAdminReply` + `postClientReply` (RED → GREEN per method)

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java`

- [ ] **Step 1: RED — append `createThreadAsClient` test**

  Append to `MessagingServiceTest`:
  ```java
  @Test
  void createThreadAsClient_persists_andBumpsAdminUnread() {
      Client client = new Client(); client.setId(7L); client.setUserId(99L); client.setName("Jane");
      when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
      when(threadRepo.save(any(MessageThread.class))).thenAnswer(inv -> {
          MessageThread t = inv.getArgument(0);
          t = spy(t); when(t.getId()).thenReturn(200L); return t;
      });

      MessageThreadDto dto = service.createThreadAsClient(99L, "Question", "I have a question");

      ArgumentCaptor<MessageThread> cap = ArgumentCaptor.forClass(MessageThread.class);
      verify(threadRepo).save(cap.capture());
      assertThat(cap.getValue().getAdminUnreadCount()).isEqualTo(1);
      assertThat(cap.getValue().getClientUnreadCount()).isEqualTo(0);
      assertThat(dto.clientId()).isEqualTo(7L);

      ArgumentCaptor<Message> msgCap = ArgumentCaptor.forClass(Message.class);
      verify(messageRepo).save(msgCap.capture());
      assertThat(msgCap.getValue().getSenderType()).isEqualTo(SenderType.CLIENT);
      assertThat(msgCap.getValue().getSenderUserId()).isEqualTo(99L);
  }

  @Test
  void createThreadAsClient_whenUserHasNoLinkedClient_throwsNoLinkedClient() {
      when(clientRepo.findByUserId(99L)).thenReturn(Optional.empty());
      org.assertj.core.api.Assertions.assertThatThrownBy(
              () -> service.createThreadAsClient(99L, "x", "y"))
          .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.NoLinkedClientException.class);
  }
  ```

  Note: assumes `ClientRepository.findByUserId(Long)` exists. Verify with `grep`:
  ```bash
  grep -n "findByUserId" backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientRepository.java
  ```
  If missing, add `Optional<Client> findByUserId(Long userId);` in this task before continuing.

- [ ] **Step 2: Run — expect compile fail**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -15
  ```

- [ ] **Step 3: GREEN — implement `createThreadAsClient`**

  Append to `MessagingService`:
  ```java
  @Transactional
  public MessageThreadDto createThreadAsClient(Long callerUserId, String subject, String body) {
      var client = clientRepo.findByUserId(callerUserId)
              .orElseThrow(com.gwhaitech.accountingfirm.messaging.exception.NoLinkedClientException::new);
      MessageThread t = new MessageThread();
      t.setClientId(client.getId());
      t.setSubject(subject);
      t.setAdminUnreadCount(1);
      t.setLastMessageAt(java.time.LocalDateTime.now());
      MessageThread saved = threadRepo.save(t);

      Message m = new Message();
      m.setThreadId(saved.getId());
      m.setSenderType(SenderType.CLIENT);
      m.setSenderUserId(callerUserId);
      m.setBody(body);
      messageRepo.save(m);

      return toThreadDto(saved, java.util.List.of(toMessageDto(m)));
  }
  ```

- [ ] **Step 4: Run — expect PASS**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -10
  ```

- [ ] **Step 5: RED — `postAdminReply` test**

  Append:
  ```java
  @Test
  void postAdminReply_appendsMessage_bumpsClientUnread_updatesLastMessageAt() {
      MessageThread existing = new MessageThread();
      existing.setClientId(7L); existing.setSubject("x");
      existing.setClientUnreadCount(2);
      existing.setLastMessageAt(LocalDateTime.now().minusDays(1));
      var spied = spy(existing); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));

      MessageDto dto = service.postAdminReply(50L, "Got it", 42L);

      assertThat(spied.getClientUnreadCount()).isEqualTo(3);
      assertThat(spied.getLastMessageAt()).isAfter(LocalDateTime.now().minusSeconds(5));
      verify(threadRepo).save(spied);

      ArgumentCaptor<Message> msgCap = ArgumentCaptor.forClass(Message.class);
      verify(messageRepo).save(msgCap.capture());
      assertThat(msgCap.getValue().getSenderType()).isEqualTo(SenderType.ADMIN);
      assertThat(dto.body()).isEqualTo("Got it");
  }

  @Test
  void postAdminReply_whenThreadMissing_throwsThreadNotFound() {
      when(threadRepo.findById(50L)).thenReturn(Optional.empty());
      org.assertj.core.api.Assertions.assertThatThrownBy(
              () -> service.postAdminReply(50L, "x", 42L))
          .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException.class);
  }
  ```

  Add `import java.time.LocalDateTime;` to the test file.

- [ ] **Step 6: Run — expect compile fail**

- [ ] **Step 7: GREEN — implement `postAdminReply`**

  Append to `MessagingService`:
  ```java
  @Transactional
  public MessageDto postAdminReply(Long threadId, String body, Long adminUserId) {
      var t = threadRepo.findById(threadId)
              .orElseThrow(() -> new com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException(threadId));
      t.setClientUnreadCount(t.getClientUnreadCount() + 1);
      t.setLastMessageAt(java.time.LocalDateTime.now());
      threadRepo.save(t);

      Message m = new Message();
      m.setThreadId(threadId);
      m.setSenderType(SenderType.ADMIN);
      m.setSenderUserId(adminUserId);
      m.setBody(body);
      messageRepo.save(m);
      return toMessageDto(m);
  }
  ```

- [ ] **Step 8: Run — expect PASS**

- [ ] **Step 9: RED — `postClientReply` test (with ownership check)**

  Append:
  ```java
  @Test
  void postClientReply_whenCallerOwnsThread_appendsAndBumpsAdminUnread() {
      Client client = new Client(); client.setId(7L); client.setUserId(99L);
      MessageThread t = new MessageThread();
      t.setClientId(7L); t.setSubject("x"); t.setAdminUnreadCount(0);
      var spied = spy(t); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
      when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));

      MessageDto dto = service.postClientReply(50L, "reply", 99L);

      assertThat(spied.getAdminUnreadCount()).isEqualTo(1);
      assertThat(dto.senderType()).isEqualTo(SenderType.CLIENT);
  }

  @Test
  void postClientReply_whenCallerDoesNotOwnThread_throwsForbidden() {
      Client client = new Client(); client.setId(8L); client.setUserId(99L);  // owns client 8
      MessageThread t = new MessageThread(); t.setClientId(7L); t.setSubject("x"); // thread on client 7
      var spied = spy(t); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
      when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));

      org.assertj.core.api.Assertions.assertThatThrownBy(
              () -> service.postClientReply(50L, "x", 99L))
          .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException.class);
  }
  ```

- [ ] **Step 10: Run — expect compile fail**

- [ ] **Step 11: GREEN — implement `postClientReply` + private helper**

  Append to `MessagingService`:
  ```java
  @Transactional
  public MessageDto postClientReply(Long threadId, String body, Long callerUserId) {
      var t = threadRepo.findById(threadId)
              .orElseThrow(() -> new com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException(threadId));
      verifyClientOwnsThread(callerUserId, t);
      t.setAdminUnreadCount(t.getAdminUnreadCount() + 1);
      t.setLastMessageAt(java.time.LocalDateTime.now());
      threadRepo.save(t);

      Message m = new Message();
      m.setThreadId(threadId);
      m.setSenderType(SenderType.CLIENT);
      m.setSenderUserId(callerUserId);
      m.setBody(body);
      messageRepo.save(m);
      return toMessageDto(m);
  }

  private void verifyClientOwnsThread(Long callerUserId, MessageThread t) {
      var c = clientRepo.findByUserId(callerUserId)
              .orElseThrow(com.gwhaitech.accountingfirm.messaging.exception.NoLinkedClientException::new);
      if (!c.getId().equals(t.getClientId())) {
          throw new com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException();
      }
  }
  ```

- [ ] **Step 12: Run — expect PASS, commit**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -10
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java
  git commit -m "feat(messaging): createThreadAsClient, postAdminReply, postClientReply"
  ```

## Task 9: `getThreadAsAdmin` + `getThreadAsClient` with mark-as-read side effect

**Files:**
- Modify: `MessagingService.java`
- Modify: `MessagingServiceTest.java`

- [ ] **Step 1: RED — `getThreadAsAdmin` zeros adminUnread, returns full thread + messages**

  ```java
  @Test
  void getThreadAsAdmin_zerosAdminUnread_returnsAllMessagesOrdered() {
      MessageThread t = new MessageThread();
      t.setClientId(7L); t.setSubject("x");
      t.setAdminUnreadCount(3); t.setClientUnreadCount(2);
      var spied = spy(t); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
      Message m1 = new Message(); m1.setBody("a");
      Message m2 = new Message(); m2.setBody("b");
      when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(m1, m2));

      MessageThreadDto dto = service.getThreadAsAdmin(50L);

      assertThat(spied.getAdminUnreadCount()).isEqualTo(0);
      assertThat(spied.getClientUnreadCount()).isEqualTo(2);   // untouched
      verify(threadRepo).save(spied);
      assertThat(dto.messages()).hasSize(2);
      assertThat(dto.messages()).extracting(MessageDto::body).containsExactly("a", "b");
  }
  ```

- [ ] **Step 2: Run — expect compile fail, then GREEN**

  Append to `MessagingService`:
  ```java
  @Transactional
  public MessageThreadDto getThreadAsAdmin(Long threadId) {
      var t = threadRepo.findById(threadId)
              .orElseThrow(() -> new com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException(threadId));
      if (t.getAdminUnreadCount() != 0) {
          t.setAdminUnreadCount(0);
          threadRepo.save(t);
      }
      var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(threadId)
              .stream().map(this::toMessageDto).toList();
      return toThreadDto(t, msgs);
  }
  ```

- [ ] **Step 3: Run — expect PASS**

- [ ] **Step 4: RED — `getThreadAsClient` with ownership + zero client unread**

  ```java
  @Test
  void getThreadAsClient_whenOwner_zerosClientUnread_returnsMessages() {
      Client client = new Client(); client.setId(7L); client.setUserId(99L);
      MessageThread t = new MessageThread();
      t.setClientId(7L); t.setSubject("x"); t.setClientUnreadCount(5); t.setAdminUnreadCount(1);
      var spied = spy(t); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
      when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
      when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of());

      service.getThreadAsClient(50L, 99L);

      assertThat(spied.getClientUnreadCount()).isEqualTo(0);
      assertThat(spied.getAdminUnreadCount()).isEqualTo(1);
  }

  @Test
  void getThreadAsClient_whenNotOwner_throwsForbidden() {
      Client client = new Client(); client.setId(8L); client.setUserId(99L);
      MessageThread t = new MessageThread(); t.setClientId(7L); t.setSubject("x");
      var spied = spy(t); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findById(50L)).thenReturn(Optional.of(spied));
      when(clientRepo.findByUserId(99L)).thenReturn(Optional.of(client));
      org.assertj.core.api.Assertions.assertThatThrownBy(
              () -> service.getThreadAsClient(50L, 99L))
          .isInstanceOf(com.gwhaitech.accountingfirm.messaging.exception.ThreadForbiddenException.class);
  }
  ```

- [ ] **Step 5: GREEN — implement `getThreadAsClient`**

  ```java
  @Transactional
  public MessageThreadDto getThreadAsClient(Long threadId, Long callerUserId) {
      var t = threadRepo.findById(threadId)
              .orElseThrow(() -> new com.gwhaitech.accountingfirm.messaging.exception.ThreadNotFoundException(threadId));
      verifyClientOwnsThread(callerUserId, t);
      if (t.getClientUnreadCount() != 0) {
          t.setClientUnreadCount(0);
          threadRepo.save(t);
      }
      var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(threadId)
              .stream().map(this::toMessageDto).toList();
      return toThreadDto(t, msgs);
  }
  ```

- [ ] **Step 6: Run — expect PASS, commit**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -10
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java
  git commit -m "feat(messaging): getThreadAsAdmin + getThreadAsClient with mark-as-read"
  ```

## Task 10: List + unread-count queries

**Files:**
- Modify: `MessagingService.java`
- Modify: `MessagingServiceTest.java`

- [ ] **Step 1: RED — list-threads (admin) + unread-counts test**

  ```java
  @Test
  void listAdminThreads_returnsSummariesWithUnreadAndPreview() {
      MessageThread t = new MessageThread();
      t.setClientId(7L); t.setSubject("Tax filing");
      t.setLastMessageAt(LocalDateTime.now()); t.setAdminUnreadCount(2);
      var spied = spy(t); when(spied.getId()).thenReturn(50L);
      when(threadRepo.findByClientIdOrderByLastMessageAtDesc(7L)).thenReturn(java.util.List.of(spied));

      Message latest = new Message();
      latest.setBody("This is the latest message body that should be truncated for preview purposes if it is too long".repeat(2));
      when(messageRepo.findByThreadIdOrderBySentAtAsc(50L)).thenReturn(java.util.List.of(new Message(), latest));

      var list = service.listAdminThreads(7L);

      assertThat(list).hasSize(1);
      assertThat(list.get(0).subject()).isEqualTo("Tax filing");
      assertThat(list.get(0).unreadCount()).isEqualTo(2);
      assertThat(list.get(0).lastMessagePreview()).hasSizeLessThanOrEqualTo(80);
  }

  @Test
  void getAdminUnreadCounts_returnsProjections() {
      ClientUnreadRow row = mock(ClientUnreadRow.class);
      when(row.getClientId()).thenReturn(7L);
      when(row.getUnreadCount()).thenReturn(3L);
      when(threadRepo.sumAdminUnreadByClient()).thenReturn(java.util.List.of(row));

      var counts = service.getAdminUnreadCounts();

      assertThat(counts).hasSize(1);
      assertThat(counts.get(0).clientId()).isEqualTo(7L);
      assertThat(counts.get(0).unreadCount()).isEqualTo(3L);
  }
  ```

- [ ] **Step 2: GREEN — implement `listAdminThreads`, `getAdminUnreadCounts`, `listPortalThreads`, `getPortalUnreadCount`**

  Append to `MessagingService`:
  ```java
  public java.util.List<MessageThreadSummaryDto> listAdminThreads(Long clientId) {
      return threadRepo.findByClientIdOrderByLastMessageAtDesc(clientId)
              .stream()
              .map(t -> toSummaryDto(t, t.getAdminUnreadCount()))
              .toList();
  }

  public java.util.List<ClientUnreadCountDto> getAdminUnreadCounts() {
      return threadRepo.sumAdminUnreadByClient().stream()
              .map(r -> new ClientUnreadCountDto(r.getClientId(), r.getUnreadCount()))
              .toList();
  }

  public java.util.List<MessageThreadSummaryDto> listPortalThreads(Long callerUserId) {
      var c = clientRepo.findByUserId(callerUserId);
      if (c.isEmpty()) return java.util.List.of();
      return threadRepo.findByClientIdOrderByLastMessageAtDesc(c.get().getId())
              .stream()
              .map(t -> toSummaryDto(t, t.getClientUnreadCount()))
              .toList();
  }

  public int getPortalUnreadCount(Long callerUserId) {
      var c = clientRepo.findByUserId(callerUserId);
      if (c.isEmpty()) return 0;
      return threadRepo.sumClientUnreadForClient(c.get().getId());
  }

  private MessageThreadSummaryDto toSummaryDto(MessageThread t, int unread) {
      var msgs = messageRepo.findByThreadIdOrderBySentAtAsc(t.getId());
      String preview = msgs.isEmpty() ? "" : msgs.get(msgs.size() - 1).getBody();
      if (preview.length() > 80) preview = preview.substring(0, 77) + "...";
      return new MessageThreadSummaryDto(t.getId(), t.getClientId(), t.getSubject(),
              t.getLastMessageAt(), unread, preview);
  }
  ```

- [ ] **Step 3: Run — expect PASS, commit**

  ```bash
  cd backend && ./mvnw test -Dtest=MessagingServiceTest -q 2>&1 | tail -10
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java
  git commit -m "feat(messaging): list threads + unread-count queries"
  ```

## Task 11: SecurityConfig matchers

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java`

- [ ] **Step 1: Read the current matcher block**

  ```bash
  grep -n "requestMatchers" backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java
  ```
  Note the line numbers and the exact existing pattern strings.

- [ ] **Step 2: Add the new matchers**

  In `SecurityConfig.java`, locate the existing block:
  ```java
  .requestMatchers("/api/clients", "/api/clients/*", "/api/clients/*/documents", "/api/clients/*/documents/**").hasRole("ADMIN")
  .requestMatchers("/api/**").authenticated()
  ```

  Insert immediately **before** `/api/**`:
  ```java
  .requestMatchers("/api/clients/*/threads", "/api/clients/*/threads/**", "/api/clients/unread-counts").hasRole("ADMIN")
  .requestMatchers("/api/portal/**").authenticated()
  ```

  Final order in the authorize block:
  ```java
  .requestMatchers("/api/clients", "/api/clients/*", "/api/clients/*/documents", "/api/clients/*/documents/**").hasRole("ADMIN")
  .requestMatchers("/api/clients/*/threads", "/api/clients/*/threads/**", "/api/clients/unread-counts").hasRole("ADMIN")
  .requestMatchers("/api/portal/**").authenticated()
  .requestMatchers("/api/**").authenticated()
  ```

- [ ] **Step 3: Compile + commit (controller security tests in Task 12 will verify behavior)**

  ```bash
  cd backend && ./mvnw compile -q 2>&1 | tail -5
  git add backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java
  git commit -m "feat(security): admin matchers for /threads, portal matcher for /api/portal/**"
  ```

## Task 12: `AdminMessageController` (RED → GREEN per endpoint, @WebMvcTest)

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java`

For brevity, this task bundles the five admin endpoints. Each endpoint gets its own RED test before its impl, in this order: GET /threads, POST /threads, GET /threads/{id}, POST /threads/{id}/messages, GET /unread-counts.

- [ ] **Step 1: Create the test class skeleton with the first RED test (GET /threads)**

  ```java
  package com.gwhaitech.accountingfirm.messaging.controller;

  import com.fasterxml.jackson.databind.ObjectMapper;
  import com.gwhaitech.accountingfirm.auth.domain.User;
  import com.gwhaitech.accountingfirm.auth.filter.JwtAuthFilter;
  import com.gwhaitech.accountingfirm.auth.handler.OAuth2SuccessHandler;
  import com.gwhaitech.accountingfirm.messaging.dto.*;
  import com.gwhaitech.accountingfirm.messaging.service.MessagingService;
  import org.junit.jupiter.api.Test;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
  import org.springframework.boot.test.context.TestConfiguration;
  import org.springframework.context.annotation.Bean;
  import org.springframework.context.annotation.Import;
  import org.springframework.http.MediaType;
  import org.springframework.security.config.annotation.web.builders.HttpSecurity;
  import org.springframework.security.core.Authentication;
  import org.springframework.security.test.context.support.WithMockUser;
  import org.springframework.security.web.SecurityFilterChain;
  import org.springframework.test.context.bean.override.mockito.MockitoBean;
  import org.springframework.test.web.servlet.MockMvc;
  import org.springframework.test.web.servlet.request.RequestPostProcessor;

  import java.time.LocalDateTime;
  import java.util.List;

  import static org.mockito.ArgumentMatchers.*;
  import static org.mockito.Mockito.when;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

  @WebMvcTest(AdminMessageController.class)
  @Import(AdminMessageControllerTest.TestSecurityConfig.class)
  class AdminMessageControllerTest {

      @TestConfiguration
      static class TestSecurityConfig {
          @Bean
          SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
              http.csrf(csrf -> csrf.disable())
                  .authorizeHttpRequests(a -> a.anyRequest().permitAll());
              return http.build();
          }
      }

      @MockitoBean private JwtAuthFilter jwtAuthFilter;
      @MockitoBean private OAuth2SuccessHandler oAuth2SuccessHandler;
      @MockitoBean private MessagingService service;

      @Autowired private MockMvc mvc;
      @Autowired private ObjectMapper json;

      private RequestPostProcessor adminUser() {
          return request -> {
              User u = new User(); u.setId(42L); u.setEmail("admin@firm.com"); u.setRole("ADMIN");
              return new AuthBackedRequestPostProcessor(u).postProcessRequest(request);
          };
      }

      @Test
      @WithMockUser(roles = "ADMIN")
      void listThreads_returnsSummariesFromService() throws Exception {
          var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 2, "preview");
          when(service.listAdminThreads(7L)).thenReturn(List.of(dto));

          mvc.perform(get("/api/clients/7/threads"))
             .andExpect(status().isOk())
             .andExpect(jsonPath("$[0].id").value(50))
             .andExpect(jsonPath("$[0].subject").value("Tax"))
             .andExpect(jsonPath("$[0].unreadCount").value(2));
      }
  }
  ```

  This file references `AuthBackedRequestPostProcessor` (a small helper to attach the `User` principal). Either inline the helper (if you don't already have one) or skip it for now — tests using `@WithMockUser(roles = "ADMIN")` alone can pass with `service.method()` mocks. **Use the simpler `@WithMockUser` form** and drop `adminUser()` until needed for endpoints that read the authenticated user's id.

  Simplified skeleton:
  ```java
  @WebMvcTest(AdminMessageController.class)
  @Import(AdminMessageControllerTest.TestSecurityConfig.class)
  class AdminMessageControllerTest {
      @TestConfiguration
      static class TestSecurityConfig {
          @Bean SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
              http.csrf(csrf -> csrf.disable())
                  .authorizeHttpRequests(a -> a.anyRequest().permitAll());
              return http.build();
          }
      }

      @MockitoBean JwtAuthFilter jwtAuthFilter;
      @MockitoBean OAuth2SuccessHandler oAuth2SuccessHandler;
      @MockitoBean MessagingService service;
      @Autowired MockMvc mvc;
      @Autowired ObjectMapper json;

      @Test @WithMockUser(roles = "ADMIN")
      void listThreads_returnsSummaries() throws Exception {
          var dto = new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 2, "preview");
          when(service.listAdminThreads(7L)).thenReturn(List.of(dto));
          mvc.perform(get("/api/clients/7/threads"))
             .andExpect(status().isOk())
             .andExpect(jsonPath("$[0].id").value(50))
             .andExpect(jsonPath("$[0].subject").value("Tax"));
      }
  }
  ```

  Resolving the calling admin's user id (needed for POST endpoints): the controller will accept `Authentication auth` and resolve `((User) auth.getPrincipal()).getId()` per the pattern in `DocumentController.java` (line 86). For test, use `@WithMockUser` + inject a custom `Authentication` via `with(authentication(...))` — concrete recipe in Step 5.

- [ ] **Step 2: Run — expect compile fail (no controller)**

  ```bash
  cd backend && ./mvnw test -Dtest=AdminMessageControllerTest -q 2>&1 | tail -15
  ```

- [ ] **Step 3: GREEN — minimal controller with GET /threads only**

  ```java
  package com.gwhaitech.accountingfirm.messaging.controller;

  import com.gwhaitech.accountingfirm.auth.domain.User;
  import com.gwhaitech.accountingfirm.messaging.dto.*;
  import com.gwhaitech.accountingfirm.messaging.service.MessagingService;
  import jakarta.validation.Valid;
  import org.springframework.http.ResponseEntity;
  import org.springframework.security.core.Authentication;
  import org.springframework.web.bind.annotation.*;

  import java.util.List;

  @RestController
  @RequestMapping("/api/clients")
  public class AdminMessageController {

      private final MessagingService service;

      public AdminMessageController(MessagingService service) {
          this.service = service;
      }

      @GetMapping("/{clientId}/threads")
      public List<MessageThreadSummaryDto> listThreads(@PathVariable Long clientId) {
          return service.listAdminThreads(clientId);
      }

      private long resolveAdminId(Authentication auth) {
          if (auth != null && auth.getPrincipal() instanceof User u && u.getId() != null) return u.getId();
          throw new IllegalStateException("Authenticated user not resolvable");
      }
  }
  ```

- [ ] **Step 4: Run — expect PASS for first test**

- [ ] **Step 5: RED → GREEN for the remaining four endpoints**

  Append tests one at a time and implement after each. Tests:

  ```java
  @Test @WithMockUser(roles = "ADMIN")
  void createThread_postsSubjectAndBody_returns201() throws Exception {
      var resp = new MessageThreadDto(100L, 7L, "Tax", LocalDateTime.now(), LocalDateTime.now(),
              0, 1, List.of());
      when(service.createThreadAsAdmin(eq(7L), eq("Tax"), eq("Hi"), anyLong())).thenReturn(resp);

      User u = new User(); u.setId(42L); u.setEmail("a@x"); u.setRole("ADMIN");

      mvc.perform(post("/api/clients/7/threads")
              .with(authentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                  u, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")))))
              .contentType(MediaType.APPLICATION_JSON)
              .content(json.writeValueAsString(new NewThreadRequest("Tax", "Hi"))))
         .andExpect(status().isCreated())
         .andExpect(jsonPath("$.id").value(100));
  }

  @Test @WithMockUser(roles = "ADMIN")
  void createThread_blankSubject_returns400() throws Exception {
      mvc.perform(post("/api/clients/7/threads")
              .contentType(MediaType.APPLICATION_JSON)
              .content("{\"subject\":\"\",\"body\":\"x\"}"))
         .andExpect(status().isBadRequest());
  }

  @Test @WithMockUser(roles = "ADMIN")
  void getThread_returnsThreadWithMessages() throws Exception {
      var resp = new MessageThreadDto(50L, 7L, "x", LocalDateTime.now(), LocalDateTime.now(),
              0, 0, List.of(new MessageDto(1L, 50L,
                  com.gwhaitech.accountingfirm.messaging.domain.SenderType.ADMIN,
                  42L, "hello", LocalDateTime.now())));
      when(service.getThreadAsAdmin(50L)).thenReturn(resp);

      mvc.perform(get("/api/clients/7/threads/50"))
         .andExpect(status().isOk())
         .andExpect(jsonPath("$.id").value(50))
         .andExpect(jsonPath("$.messages[0].body").value("hello"));
  }

  @Test @WithMockUser(roles = "ADMIN")
  void postReply_appendsMessage() throws Exception {
      var resp = new MessageDto(2L, 50L,
              com.gwhaitech.accountingfirm.messaging.domain.SenderType.ADMIN, 42L,
              "follow-up", LocalDateTime.now());
      when(service.postAdminReply(eq(50L), eq("follow-up"), anyLong())).thenReturn(resp);

      User u = new User(); u.setId(42L); u.setEmail("a@x"); u.setRole("ADMIN");
      mvc.perform(post("/api/clients/7/threads/50/messages")
              .with(authentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                  u, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")))))
              .contentType(MediaType.APPLICATION_JSON)
              .content(json.writeValueAsString(new NewMessageRequest("follow-up"))))
         .andExpect(status().isCreated())
         .andExpect(jsonPath("$.body").value("follow-up"));
  }

  @Test @WithMockUser(roles = "ADMIN")
  void unreadCounts_returnsList() throws Exception {
      when(service.getAdminUnreadCounts()).thenReturn(List.of(new ClientUnreadCountDto(7L, 3L)));
      mvc.perform(get("/api/clients/unread-counts"))
         .andExpect(status().isOk())
         .andExpect(jsonPath("$[0].clientId").value(7))
         .andExpect(jsonPath("$[0].unreadCount").value(3));
  }
  ```

  Add the static import: `import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;`

- [ ] **Step 6: GREEN — fill out the controller**

  ```java
  @PostMapping("/{clientId}/threads")
  public ResponseEntity<MessageThreadDto> createThread(@PathVariable Long clientId,
                                                       @Valid @RequestBody NewThreadRequest req,
                                                       Authentication auth) {
      MessageThreadDto dto = service.createThreadAsAdmin(clientId, req.subject(), req.body(), resolveAdminId(auth));
      return ResponseEntity.status(201).body(dto);
  }

  @GetMapping("/{clientId}/threads/{threadId}")
  public MessageThreadDto getThread(@PathVariable Long clientId, @PathVariable Long threadId) {
      return service.getThreadAsAdmin(threadId);
  }

  @PostMapping("/{clientId}/threads/{threadId}/messages")
  public ResponseEntity<MessageDto> postReply(@PathVariable Long clientId,
                                              @PathVariable Long threadId,
                                              @Valid @RequestBody NewMessageRequest req,
                                              Authentication auth) {
      MessageDto m = service.postAdminReply(threadId, req.body(), resolveAdminId(auth));
      return ResponseEntity.status(201).body(m);
  }

  @GetMapping("/unread-counts")
  public List<ClientUnreadCountDto> unreadCounts() {
      return service.getAdminUnreadCounts();
  }
  ```

- [ ] **Step 7: Run all controller tests — expect PASS**

  ```bash
  cd backend && ./mvnw test -Dtest=AdminMessageControllerTest -q 2>&1 | tail -10
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageController.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerTest.java
  git commit -m "feat(messaging): AdminMessageController with 5 endpoints"
  ```

## Task 13: `PortalMessageController` (RED → GREEN per endpoint)

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageController.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerTest.java`

Endpoints: `GET /api/portal/threads`, `POST /api/portal/threads`, `GET /api/portal/threads/{id}`, `POST /api/portal/threads/{id}/messages`, `GET /api/portal/messages/unread-count`.

Pattern matches Task 12 with three differences:
- All endpoints resolve the caller user id from `Authentication` (no `clientId` path param).
- Service methods are the `*AsClient` / `listPortalThreads` / `getPortalUnreadCount` variants.
- Test class structure mirrors Task 12 — same `@WebMvcTest` + `TestSecurityConfig` + `@MockitoBean MessagingService`.

- [ ] **Step 1: Create test class with first RED test (GET /api/portal/threads)**

  ```java
  package com.gwhaitech.accountingfirm.messaging.controller;

  // ... same imports as AdminMessageControllerTest ...

  @WebMvcTest(PortalMessageController.class)
  @Import(PortalMessageControllerTest.TestSecurityConfig.class)
  class PortalMessageControllerTest {

      @TestConfiguration
      static class TestSecurityConfig {
          @Bean SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
              http.csrf(csrf -> csrf.disable())
                  .authorizeHttpRequests(a -> a.anyRequest().permitAll());
              return http.build();
          }
      }

      @MockitoBean JwtAuthFilter jwtAuthFilter;
      @MockitoBean OAuth2SuccessHandler oAuth2SuccessHandler;
      @MockitoBean MessagingService service;
      @Autowired MockMvc mvc;
      @Autowired ObjectMapper json;

      private RequestPostProcessor portalUser() {
          User u = new User(); u.setId(99L); u.setEmail("c@x"); u.setRole("USER");
          return authentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
              u, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"))));
      }

      @Test
      void listMyThreads_returnsSummaries() throws Exception {
          when(service.listPortalThreads(99L)).thenReturn(
              List.of(new MessageThreadSummaryDto(50L, 7L, "Tax", LocalDateTime.now(), 1, "p")));
          mvc.perform(get("/api/portal/threads").with(portalUser()))
             .andExpect(status().isOk())
             .andExpect(jsonPath("$[0].id").value(50));
      }
  }
  ```

- [ ] **Step 2: RED → GREEN for each remaining endpoint (same recipe as Task 12)**

  Test variants:
  - `POST /api/portal/threads` with `NewThreadRequest` → 201
  - `POST /api/portal/threads` with blank subject → 400
  - `GET /api/portal/threads/{id}` → 200 with full thread
  - `POST /api/portal/threads/{id}/messages` → 201
  - `GET /api/portal/messages/unread-count` → `{ unreadCount: N }`

- [ ] **Step 3: Implement the controller**

  ```java
  package com.gwhaitech.accountingfirm.messaging.controller;

  import com.gwhaitech.accountingfirm.auth.domain.User;
  import com.gwhaitech.accountingfirm.messaging.dto.*;
  import com.gwhaitech.accountingfirm.messaging.service.MessagingService;
  import jakarta.validation.Valid;
  import org.springframework.http.ResponseEntity;
  import org.springframework.security.core.Authentication;
  import org.springframework.web.bind.annotation.*;

  import java.util.List;
  import java.util.Map;

  @RestController
  @RequestMapping("/api/portal")
  public class PortalMessageController {

      private final MessagingService service;

      public PortalMessageController(MessagingService service) {
          this.service = service;
      }

      @GetMapping("/threads")
      public List<MessageThreadSummaryDto> listMy(Authentication auth) {
          return service.listPortalThreads(resolveUserId(auth));
      }

      @PostMapping("/threads")
      public ResponseEntity<MessageThreadDto> create(@Valid @RequestBody NewThreadRequest req, Authentication auth) {
          return ResponseEntity.status(201).body(
              service.createThreadAsClient(resolveUserId(auth), req.subject(), req.body()));
      }

      @GetMapping("/threads/{threadId}")
      public MessageThreadDto get(@PathVariable Long threadId, Authentication auth) {
          return service.getThreadAsClient(threadId, resolveUserId(auth));
      }

      @PostMapping("/threads/{threadId}/messages")
      public ResponseEntity<MessageDto> reply(@PathVariable Long threadId,
                                              @Valid @RequestBody NewMessageRequest req,
                                              Authentication auth) {
          return ResponseEntity.status(201).body(
              service.postClientReply(threadId, req.body(), resolveUserId(auth)));
      }

      @GetMapping("/messages/unread-count")
      public Map<String, Integer> unreadCount(Authentication auth) {
          return Map.of("unreadCount", service.getPortalUnreadCount(resolveUserId(auth)));
      }

      private long resolveUserId(Authentication auth) {
          if (auth != null && auth.getPrincipal() instanceof User u && u.getId() != null) return u.getId();
          throw new IllegalStateException("Authenticated user not resolvable");
      }
  }
  ```

- [ ] **Step 4: All tests PASS, commit**

  ```bash
  cd backend && ./mvnw test -Dtest=PortalMessageControllerTest -q 2>&1 | tail -10
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageController.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerTest.java
  git commit -m "feat(messaging): PortalMessageController with 5 endpoints"
  ```

## Task 14: Security tests (source-pin + role guards)

**Files:**
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerSecurityTest.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerSecurityTest.java`

Follow the existing `DocumentControllerSecurityTest.java` pattern (mirrored `TestSecurityConfig` + source-pin).

- [ ] **Step 1: Create `AdminMessageControllerSecurityTest`**

  Mirror `DocumentControllerSecurityTest` structure. Tests:
  - USER role on GET /api/clients/7/threads → 403
  - USER role on POST /api/clients/7/threads → 403
  - USER role on GET /api/clients/unread-counts → 403
  - Source-pin: read `SecurityConfig.java` content and assert it contains the string `"/api/clients/*/threads/**"` AND `"/api/clients/unread-counts"`.

  Use `Files.readString(Paths.get("src/main/java/.../SecurityConfig.java"))` and `assertThat(source).contains("...")`.

  TestSecurityConfig block:
  ```java
  http.csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(a -> a
          .requestMatchers("/api/clients/*/threads", "/api/clients/*/threads/**", "/api/clients/unread-counts").hasRole("ADMIN")
          .anyRequest().permitAll());
  ```

- [ ] **Step 2: Run — expect PASS (security rule blocks USER, source-pin passes)**

  ```bash
  cd backend && ./mvnw test -Dtest=AdminMessageControllerSecurityTest -q 2>&1 | tail -10
  ```

- [ ] **Step 3: Create `PortalMessageControllerSecurityTest`**

  Tests:
  - Unauthenticated GET /api/portal/threads → 401 (or 403 with anonymous; the existing pattern returns whatever Spring's defaults produce — verify and assert)
  - With authenticated `@WithMockUser(roles = "USER")` → service mock is invoked; status 200
  - Source-pin: assert `SecurityConfig.java` contains `"/api/portal/**"`

  TestSecurityConfig:
  ```java
  http.csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(a -> a
          .requestMatchers("/api/portal/**").authenticated()
          .anyRequest().permitAll());
  ```

- [ ] **Step 4: Run — expect PASS, commit**

  ```bash
  cd backend && ./mvnw test -Dtest=*MessageControllerSecurityTest -q 2>&1 | tail -10
  git add backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/AdminMessageControllerSecurityTest.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/controller/PortalMessageControllerSecurityTest.java
  git commit -m "test(security): admin + portal messaging controller security tests with source-pin"
  ```

## Task 15: Phase 1 closeout — code review + dev log + full baseline

- [ ] **Step 1: Code review the Phase 1 diff**

  Invoke `superpowers:requesting-code-review` on the diff:
  ```bash
  git log --oneline main..HEAD
  git diff main...HEAD
  ```
  Pipe the diff to the review skill. Address every CRITICAL / HIGH finding before moving on. Roll up MEDIUM findings into commits as appropriate; defer LOW.

- [ ] **Step 2: Write dev log entry**

  Create or append to `docs/log/2026-05-20.md` (or today's date if working a different day):

  ```markdown
  ### N. Admin ↔ Client Messaging — Phase 1 (Backend)

  **Commits:** <list hashes from `git log --oneline main..HEAD` for this phase>

  **Feature:**
  - V8 Flyway migration adds `message_threads` + `messages` tables (denormalised unread counts; cascade from clients).
  - `MessagingService` covers createThreadAsAdmin/Client, postAdminReply/postClientReply, getThreadAsAdmin/Client (with mark-as-read side effect), listAdminThreads/PortalThreads, getAdminUnreadCounts/getPortalUnreadCount. Portal calls enforce ownership in the service layer.
  - Two new REST controllers: `AdminMessageController` (5 endpoints under `/api/clients/{id}/threads...` + `/api/clients/unread-counts`) and `PortalMessageController` (5 endpoints under `/api/portal/...`).
  - SecurityConfig matchers added; admin endpoints require ROLE_ADMIN, portal endpoints require authentication; source-pin tests assert both rule strings.

  **Code Review Findings:**
  | Severity | Issue | Fix |
  |---|---|---|

  **Tests:** <total> passing (<newly-added> new in Phase 1)

  **TDD Evidence:**
  <paste the RED failure lines from each new test added in this phase>
  ```

- [ ] **Step 3: Full backend baseline**

  ```bash
  cd backend && ./mvnw test 2>&1 | tail -20
  ```
  Expected: all tests pass except any pre-existing known failures noted in the pre-flight check. **No new failure may be introduced by this phase.**

- [ ] **Step 4: Commit dev log + close phase**

  ```bash
  git add docs/log/2026-05-20.md
  git commit -m "docs(log): phase 1 — admin↔client messaging backend complete"
  ```

---

# Phase 2 — Admin Frontend

**Pre-flight:** baseline must be green:
```bash
cd backend && ./mvnw test 2>&1 | tail -5
cd frontend && npx ng test --no-watch 2>&1 | tail -5
```

## Task 16: Frontend model and service

**Files:**
- Create: `frontend/src/app/core/models/message.model.ts`
- Create: `frontend/src/app/core/services/admin-client-messages.service.ts`
- Create: `frontend/src/app/core/services/admin-client-messages.service.spec.ts`

- [ ] **Step 1: Create models**

  ```typescript
  // message.model.ts
  export type SenderType = 'ADMIN' | 'CLIENT';

  export interface MessageDto {
    id: number;
    threadId: number;
    senderType: SenderType;
    senderUserId: number;
    body: string;
    sentAt: string;
  }

  export interface MessageThreadDto {
    id: number;
    clientId: number;
    subject: string;
    createdAt: string;
    lastMessageAt: string;
    adminUnreadCount: number;
    clientUnreadCount: number;
    messages: MessageDto[];
  }

  export interface MessageThreadSummaryDto {
    id: number;
    clientId: number;
    subject: string;
    lastMessageAt: string;
    unreadCount: number;
    lastMessagePreview: string;
  }

  export interface ClientUnreadCountDto {
    clientId: number;
    unreadCount: number;
  }
  ```

- [ ] **Step 2: RED — write service test**

  ```typescript
  // admin-client-messages.service.spec.ts
  import { TestBed } from '@angular/core/testing';
  import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
  import { provideZonelessChangeDetection } from '@angular/core';
  import { provideHttpClient } from '@angular/common/http';
  import { provideHttpClientTesting } from '@angular/common/http/testing';
  import { AdminClientMessagesService } from './admin-client-messages.service';

  describe('AdminClientMessagesService', () => {
    let service: AdminClientMessagesService;
    let http: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });
      service = TestBed.inject(AdminClientMessagesService);
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('listThreads calls GET /api/clients/:id/threads', () => {
      service.listThreads(7).subscribe();
      const req = http.expectOne('/api/clients/7/threads');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('createThread POSTs subject+body', () => {
      service.createThread(7, { subject: 'Tax', body: 'Hi' }).subscribe();
      const req = http.expectOne('/api/clients/7/threads');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ subject: 'Tax', body: 'Hi' });
      req.flush({});
    });

    it('getThread calls GET /api/clients/:id/threads/:tid', () => {
      service.getThread(7, 50).subscribe();
      http.expectOne('/api/clients/7/threads/50').flush({});
    });

    it('postReply POSTs body', () => {
      service.postReply(7, 50, 'follow-up').subscribe();
      const req = http.expectOne('/api/clients/7/threads/50/messages');
      expect(req.request.body).toEqual({ body: 'follow-up' });
      req.flush({});
    });

    it('getUnreadCounts calls GET /api/clients/unread-counts', () => {
      service.getUnreadCounts().subscribe();
      http.expectOne('/api/clients/unread-counts').flush([]);
    });
  });
  ```

- [ ] **Step 3: Run — expect compile fail**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/admin-client-messages.service.spec.ts' 2>&1 | tail -15
  ```

- [ ] **Step 4: GREEN — write service**

  ```typescript
  // admin-client-messages.service.ts
  import { Injectable, inject } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import {
    MessageThreadSummaryDto,
    MessageThreadDto,
    MessageDto,
    ClientUnreadCountDto,
  } from '../models/message.model';

  @Injectable({ providedIn: 'root' })
  export class AdminClientMessagesService {
    private http = inject(HttpClient);

    listThreads(clientId: number): Observable<MessageThreadSummaryDto[]> {
      return this.http.get<MessageThreadSummaryDto[]>(`/api/clients/${clientId}/threads`);
    }

    createThread(clientId: number, req: { subject: string; body: string }): Observable<MessageThreadDto> {
      return this.http.post<MessageThreadDto>(`/api/clients/${clientId}/threads`, req);
    }

    getThread(clientId: number, threadId: number): Observable<MessageThreadDto> {
      return this.http.get<MessageThreadDto>(`/api/clients/${clientId}/threads/${threadId}`);
    }

    postReply(clientId: number, threadId: number, body: string): Observable<MessageDto> {
      return this.http.post<MessageDto>(`/api/clients/${clientId}/threads/${threadId}/messages`, { body });
    }

    getUnreadCounts(): Observable<ClientUnreadCountDto[]> {
      return this.http.get<ClientUnreadCountDto[]>('/api/clients/unread-counts');
    }
  }
  ```

- [ ] **Step 5: Run — PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/admin-client-messages.service.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/core/models/message.model.ts \
          frontend/src/app/core/services/admin-client-messages.service.ts \
          frontend/src/app/core/services/admin-client-messages.service.spec.ts
  git commit -m "feat(frontend): admin client messages service + models"
  ```

## Task 17: Admin clients list — Messages button + badge

**Files:**
- Modify: `frontend/src/app/features/admin/clients/admin-clients.component.ts`
- Modify: `frontend/src/app/features/admin/clients/admin-clients.component.html`
- Modify: `frontend/src/app/features/admin/clients/admin-clients.component.css`
- Modify: `frontend/src/app/features/admin/clients/admin-clients.component.spec.ts`

- [ ] **Step 1: RED — extend spec to assert badge + Messages button**

  Append to `admin-clients.component.spec.ts` (inside the existing describe):

  ```typescript
  describe('Messages action and unread badge', () => {
    it('renders Messages button on each row', async () => {
      const fixture = await setup(sampleClients);
      const btns = fixture.nativeElement.querySelectorAll('[data-testid="client-messages-btn"]');
      expect(btns.length).toBe(2);
    });

    it('renders unread badge only when count > 0 for that client', async () => {
      const mockMsgService = { getUnreadCounts: vi.fn().mockReturnValue(of([{ clientId: 1, unreadCount: 3 }])) };
      const fixture = await setupWithMessages(sampleClients, mockMsgService);
      const badges = fixture.nativeElement.querySelectorAll('[data-testid="client-messages-badge"]');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent).toContain('3');
    });

    it('clicking Messages navigates to /admin/clients/:id/messages', async () => {
      const fixture = await setup(sampleClients);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="client-messages-btn"]');
      btn.click();
      expect(navSpy).toHaveBeenCalledWith(['/admin/clients', 1, 'messages']);
    });
  });
  ```

  Add helper at top:
  ```typescript
  async function setupWithMessages(clients: ClientDto[], msgService: any): Promise<ComponentFixture<AdminClientsComponent>> {
    const mockService: Partial<AdminClientsService> = {
      getAll: vi.fn().mockReturnValue(of(clients)),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [AdminClientsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: AdminClientsService, useValue: mockService },
        { provide: AdminClientMessagesService, useValue: msgService },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminClientsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  ```

  Also update the existing `setup()` to provide a default `AdminClientMessagesService` mock returning `of([])`.

- [ ] **Step 2: Run — expect fail (no Messages button, no badge)**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/admin-clients.component.spec.ts' 2>&1 | tail -20
  ```

- [ ] **Step 3: GREEN — extend component**

  In `admin-clients.component.ts`:
  ```typescript
  import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
  // ...

  private messagesService = inject(AdminClientMessagesService);
  unreadCounts = signal<Record<number, number>>({});

  ngOnInit(): void {
    this.load();
    this.loadUnreadCounts();
  }

  private loadUnreadCounts(): void {
    this.messagesService.getUnreadCounts().subscribe({
      next: (counts) => {
        const map: Record<number, number> = {};
        for (const c of counts) map[c.clientId] = c.unreadCount;
        this.unreadCounts.set(map);
      },
      error: () => { /* silent — badge degrades to absent */ },
    });
  }

  unreadFor(clientId: number): number {
    return this.unreadCounts()[clientId] ?? 0;
  }

  openMessages(client: ClientDto): void {
    this.router.navigate(['/admin/clients', client.id, 'messages']);
  }
  ```

  In `admin-clients.component.html` — within `.actions-cell`, after the Documents button:
  ```html
  <button mat-button class="action-btn action-messages"
          data-testid="client-messages-btn"
          (click)="openMessages(client)">
    Messages
    @if (unreadFor(client.id) > 0) {
      <span class="messages-badge" data-testid="client-messages-badge">{{ unreadFor(client.id) }}</span>
    }
  </button>
  ```

  In `admin-clients.component.css` append:
  ```css
  .action-messages { color: #38bdf8 !important; }
  .action-messages:hover { background: rgba(56, 189, 248, 0.1) !important; }
  .messages-badge {
    display: inline-block;
    margin-left: 5px;
    padding: 0 6px;
    height: 16px;
    line-height: 16px;
    background: #38bdf8;
    color: #0f172a;
    font-size: 10px;
    font-weight: 700;
    border-radius: 10px;
    vertical-align: 1px;
  }
  ```

- [ ] **Step 4: Run — PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/admin-clients.component.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/features/admin/clients/admin-clients.component.*
  git commit -m "feat(admin): Messages button + unread badge on clients list"
  ```

## Task 18: `NewThreadDialogComponent`

**Files:**
- Create: `frontend/src/app/features/admin/client-messages/new-thread-dialog.component.ts`

- [ ] **Step 1: Implement dialog (use the same inline-template pattern as `AdminClientDialogComponent`)**

  Match the existing pattern from `admin-client-dialog.component.ts` (custom header with icon, dark-themed submit button). Form fields: subject (required, max 200), body (required, max 5000). On submit, returns `{ subject, body }` via dialogRef.close — the parent makes the HTTP call.

  ```typescript
  import { Component, inject } from '@angular/core';
  import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
  import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
  import { MatButtonModule } from '@angular/material/button';
  import { MatFormFieldModule } from '@angular/material/form-field';
  import { MatInputModule } from '@angular/material/input';

  @Component({
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
    template: `
      <div class="dlg-header">
        <div class="dlg-icon">✉</div>
        <div>
          <div class="dlg-title">New Thread</div>
          <div class="dlg-subtitle">Start a conversation with this client</div>
        </div>
      </div>
      <mat-dialog-content>
        <form [formGroup]="form" id="newThreadForm" (ngSubmit)="submit()" class="dlg-form">
          <mat-form-field appearance="outline" class="dlg-field">
            <mat-label>Subject</mat-label>
            <input matInput formControlName="subject" maxlength="200" placeholder="e.g. 2026 tax filing"/>
            @if (form.get('subject')?.hasError('required') && form.get('subject')?.touched) {
              <mat-error>Subject is required</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="dlg-field">
            <mat-label>Message</mat-label>
            <textarea matInput rows="6" maxlength="5000" formControlName="body" placeholder="Write your message…"></textarea>
            @if (form.get('body')?.hasError('required') && form.get('body')?.touched) {
              <mat-error>Message is required</mat-error>
            }
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions class="dlg-actions">
        <button mat-button class="dlg-cancel" [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button class="dlg-submit" form="newThreadForm" type="submit">Send</button>
      </mat-dialog-actions>
    `,
    styles: [/* copy block from admin-client-dialog.component.ts dlg-* styles */],
  })
  export class NewThreadDialogComponent {
    private dialogRef = inject(MatDialogRef<NewThreadDialogComponent>);

    form = new FormGroup({
      subject: new FormControl('', [Validators.required, Validators.maxLength(200)]),
      body: new FormControl('', [Validators.required, Validators.maxLength(5000)]),
    });

    submit(): void {
      if (this.form.invalid) { this.form.markAllAsTouched(); return; }
      const v = this.form.getRawValue();
      this.dialogRef.close({ subject: v.subject!, body: v.body! });
    }
  }
  ```

  Copy the `dlg-*` styles block from `admin-client-dialog.component.ts` lines covering `.dlg-header` through `.dlg-submit` (including the email-color override removed since not needed here).

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/app/features/admin/client-messages/new-thread-dialog.component.ts
  git commit -m "feat(admin): new-thread dialog component"
  ```

  No spec needed — this dialog is exercised through `AdminClientThreadsComponent` tests.

## Task 19: `AdminClientThreadsComponent` (thread list page)

**Files:**
- Create all four `admin-client-threads.component.{ts,html,css,spec.ts}`

- [ ] **Step 1: RED — write the spec**

  ```typescript
  import { TestBed, ComponentFixture } from '@angular/core/testing';
  import { provideZonelessChangeDetection } from '@angular/core';
  import { provideHttpClient } from '@angular/common/http';
  import { provideHttpClientTesting } from '@angular/common/http/testing';
  import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
  import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
  import { of } from 'rxjs';
  import { AdminClientThreadsComponent } from './admin-client-threads.component';
  import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
  import { AdminClientsService } from '../../../core/services/admin-clients.service';
  import { MessageThreadSummaryDto } from '../../../core/models/message.model';
  import { ClientDto } from '../../../core/models/client.model';

  const sampleClient: ClientDto = { id: 7, name: 'Jane', email: 'j@x', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: 99 };
  const sampleThreads: MessageThreadSummaryDto[] = [
    { id: 50, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00', unreadCount: 2, lastMessagePreview: 'I will send the W-2…' },
    { id: 51, clientId: 7, subject: 'Q1 invoicing', lastMessageAt: '2026-05-15T09:00:00', unreadCount: 0, lastMessagePreview: 'Thanks!' },
  ];

  async function setup(threads: MessageThreadSummaryDto[] = sampleThreads): Promise<ComponentFixture<AdminClientThreadsComponent>> {
    const msgService = { listThreads: vi.fn().mockReturnValue(of(threads)), createThread: vi.fn() };
    const clientsService = { getAll: vi.fn().mockReturnValue(of([sampleClient])) };
    await TestBed.configureTestingModule({
      imports: [AdminClientThreadsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: AdminClientMessagesService, useValue: msgService },
        { provide: AdminClientsService, useValue: clientsService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
        provideRouter([]),
      ],
    }).compileComponents();
    const fx = TestBed.createComponent(AdminClientThreadsComponent);
    fx.detectChanges(); await fx.whenStable(); fx.detectChanges();
    return fx;
  }

  describe('AdminClientThreadsComponent', () => {
    it('renders thread rows', async () => {
      const fx = await setup();
      const rows = fx.nativeElement.querySelectorAll('[data-testid="thread-row"]');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Tax filing');
    });

    it('shows unread chip only when unreadCount > 0', async () => {
      const fx = await setup();
      const chips = fx.nativeElement.querySelectorAll('[data-testid="thread-unread-chip"]');
      expect(chips.length).toBe(1);
      expect(chips[0].textContent).toContain('2');
    });

    it('clicking a row navigates to thread view', async () => {
      const fx = await setup();
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const row: HTMLElement = fx.nativeElement.querySelector('[data-testid="thread-row"]');
      row.click();
      expect(navSpy).toHaveBeenCalledWith(['/admin/clients', 7, 'messages', 50]);
    });

    it('empty state renders when no threads', async () => {
      const fx = await setup([]);
      expect(fx.nativeElement.textContent).toContain('No conversations yet');
    });

    it('shows New Thread button', async () => {
      const fx = await setup();
      const btn = fx.nativeElement.querySelector('[data-testid="new-thread-btn"]');
      expect(btn).not.toBeNull();
    });
  });
  ```

- [ ] **Step 2: GREEN — implement component**

  `admin-client-threads.component.ts`:
  ```typescript
  import { Component, inject, OnInit, signal } from '@angular/core';
  import { ActivatedRoute, Router, RouterLink } from '@angular/router';
  import { MatButtonModule } from '@angular/material/button';
  import { MatDialog } from '@angular/material/dialog';
  import { take } from 'rxjs/operators';
  import { DatePipe } from '@angular/common';
  import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
  import { AdminClientsService } from '../../../core/services/admin-clients.service';
  import { MessageThreadSummaryDto } from '../../../core/models/message.model';
  import { ClientDto } from '../../../core/models/client.model';
  import { NewThreadDialogComponent } from './new-thread-dialog.component';

  @Component({
    selector: 'app-admin-client-threads',
    standalone: true,
    imports: [MatButtonModule, RouterLink, DatePipe],
    templateUrl: './admin-client-threads.component.html',
    styleUrl: './admin-client-threads.component.css',
  })
  export class AdminClientThreadsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private msgService = inject(AdminClientMessagesService);
    private clientsService = inject(AdminClientsService);
    private dialog = inject(MatDialog);

    clientId = signal<number>(0);
    client = signal<ClientDto | null>(null);
    threads = signal<MessageThreadSummaryDto[]>([]);

    ngOnInit(): void {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.clientId.set(id);
      this.clientsService.getAll().subscribe(list => {
        this.client.set(list.find(c => c.id === id) ?? null);
      });
      this.loadThreads();
    }

    private loadThreads(): void {
      this.msgService.listThreads(this.clientId()).subscribe(t => this.threads.set(t));
    }

    openThread(t: MessageThreadSummaryDto): void {
      this.router.navigate(['/admin/clients', this.clientId(), 'messages', t.id]);
    }

    openNewThread(): void {
      this.dialog.open(NewThreadDialogComponent, { width: '480px' })
        .afterClosed().pipe(take(1)).subscribe((result: { subject: string; body: string } | null) => {
          if (!result) return;
          this.msgService.createThread(this.clientId(), result).subscribe(thread => {
            this.router.navigate(['/admin/clients', this.clientId(), 'messages', thread.id]);
          });
        });
    }
  }
  ```

  `admin-client-threads.component.html`:
  ```html
  <div class="admin-threads">
    <a routerLink="/admin/clients" class="back-link">← Back to Clients</a>
    <div class="page-header">
      <div>
        <h1 class="page-title">Messages</h1>
        @if (client()) { <p class="page-subtitle">with {{ client()!.name }}</p> }
      </div>
      <button mat-flat-button class="new-btn" data-testid="new-thread-btn" (click)="openNewThread()">+ New Thread</button>
    </div>

    <div class="threads-list">
      @for (t of threads(); track t.id) {
        <div class="thread-row" data-testid="thread-row" (click)="openThread(t)">
          <div class="thread-main">
            <div class="thread-subject">{{ t.subject }}</div>
            <div class="thread-preview">{{ t.lastMessagePreview }}</div>
          </div>
          <div class="thread-meta">
            <div class="thread-date">{{ t.lastMessageAt | date:'short' }}</div>
            @if (t.unreadCount > 0) {
              <span class="thread-chip" data-testid="thread-unread-chip">·{{ t.unreadCount }}</span>
            }
          </div>
        </div>
      } @empty {
        <div class="empty">No conversations yet. Click + New Thread to start one.</div>
      }
    </div>
  </div>
  ```

  `admin-client-threads.component.css`: reuse the dark theme — page background `#0f172a`, card `#1e293b`, rows hover `#243347`. Match the look of `admin-clients.component.css`.

- [ ] **Step 3: Add route** in `app.routes.ts`:

  ```typescript
  {
    path: 'admin/clients/:id/messages',
    loadComponent: () =>
      import('./features/admin/client-messages/admin-client-threads.component').then(m => m.AdminClientThreadsComponent),
    canActivate: [authGuard, adminGuard],
  },
  ```

- [ ] **Step 4: Run tests — PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/admin-client-threads.component.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/features/admin/client-messages/admin-client-threads.component.* frontend/src/app/app.routes.ts
  git commit -m "feat(admin): client threads list page"
  ```

## Task 20: `AdminClientThreadViewComponent` (thread + compose)

**Files:**
- Create: four `admin-client-thread-view.component.{ts,html,css,spec.ts}`
- Modify: `app.routes.ts`

- [ ] **Step 1: RED — write the spec**

  ```typescript
  // Standard setup with AdminClientMessagesService.getThread returning a full thread DTO,
  // and postReply returning a new MessageDto.

  // Tests:
  // - renders all messages in order, with sender label
  // - admin messages get class .msg-admin, client messages get class .msg-client
  // - Send button disabled when textarea is empty
  // - typing + clicking Send calls service.postReply with body, appends to message list, clears textarea
  // - back link renders pointing to /admin/clients/:id/messages
  ```

  See Task 19's spec for the testing setup pattern. Required tests:

  ```typescript
  it('renders all messages with sender labels', async () => {
    const fx = await setup();
    const msgs = fx.nativeElement.querySelectorAll('[data-testid="message-row"]');
    expect(msgs.length).toBe(2);
  });

  it('applies different class for admin vs client messages', async () => {
    const fx = await setup();
    const admin = fx.nativeElement.querySelectorAll('.msg-admin');
    const client = fx.nativeElement.querySelectorAll('.msg-client');
    expect(admin.length).toBe(1);
    expect(client.length).toBe(1);
  });

  it('Send button is disabled when textarea is empty', async () => {
    const fx = await setup();
    const sendBtn: HTMLButtonElement = fx.nativeElement.querySelector('[data-testid="send-reply-btn"]');
    expect(sendBtn.disabled).toBe(true);
  });

  it('typing + Send calls postReply and appends message', async () => {
    const fx = await setup();
    const ta: HTMLTextAreaElement = fx.nativeElement.querySelector('[data-testid="reply-textarea"]');
    ta.value = 'follow-up';
    ta.dispatchEvent(new Event('input'));
    fx.detectChanges();

    const sendBtn: HTMLButtonElement = fx.nativeElement.querySelector('[data-testid="send-reply-btn"]');
    expect(sendBtn.disabled).toBe(false);
    sendBtn.click();
    await fx.whenStable(); fx.detectChanges();

    expect(msgService.postReply).toHaveBeenCalledWith(7, 50, 'follow-up');
    const msgs = fx.nativeElement.querySelectorAll('[data-testid="message-row"]');
    expect(msgs.length).toBe(3);
    expect(ta.value).toBe('');
  });
  ```

- [ ] **Step 2: GREEN — implement the component**

  ```typescript
  // admin-client-thread-view.component.ts
  import { Component, inject, OnInit, signal } from '@angular/core';
  import { ActivatedRoute, Router, RouterLink } from '@angular/router';
  import { FormsModule } from '@angular/forms';
  import { MatButtonModule } from '@angular/material/button';
  import { DatePipe } from '@angular/common';
  import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
  import { MessageThreadDto, MessageDto } from '../../../core/models/message.model';

  @Component({
    selector: 'app-admin-client-thread-view',
    standalone: true,
    imports: [FormsModule, MatButtonModule, RouterLink, DatePipe],
    templateUrl: './admin-client-thread-view.component.html',
    styleUrl: './admin-client-thread-view.component.css',
  })
  export class AdminClientThreadViewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private msgService = inject(AdminClientMessagesService);

    clientId = signal<number>(0);
    threadId = signal<number>(0);
    thread = signal<MessageThreadDto | null>(null);
    replyText = signal<string>('');
    sending = signal<boolean>(false);

    ngOnInit(): void {
      this.clientId.set(Number(this.route.snapshot.paramMap.get('id')));
      this.threadId.set(Number(this.route.snapshot.paramMap.get('threadId')));
      this.msgService.getThread(this.clientId(), this.threadId()).subscribe(t => this.thread.set(t));
    }

    canSend(): boolean {
      return !this.sending() && this.replyText().trim().length > 0;
    }

    send(): void {
      if (!this.canSend()) return;
      this.sending.set(true);
      const body = this.replyText().trim();
      this.msgService.postReply(this.clientId(), this.threadId(), body).subscribe({
        next: (msg: MessageDto) => {
          const t = this.thread();
          if (t) this.thread.set({ ...t, messages: [...t.messages, msg] });
          this.replyText.set('');
          this.sending.set(false);
        },
        error: () => this.sending.set(false),
      });
    }
  }
  ```

  Template:
  ```html
  <div class="thread-view">
    <a [routerLink]="['/admin/clients', clientId(), 'messages']" class="back-link">← Back to threads</a>
    @if (thread()) {
      <h1 class="page-title">{{ thread()!.subject }}</h1>
      <p class="page-subtitle">Thread #{{ thread()!.id }}</p>

      <div class="messages">
        @for (m of thread()!.messages; track m.id) {
          <div class="message" data-testid="message-row" [class.msg-admin]="m.senderType === 'ADMIN'" [class.msg-client]="m.senderType === 'CLIENT'">
            <div class="msg-body">{{ m.body }}</div>
            <div class="msg-meta">{{ m.senderType === 'ADMIN' ? 'you' : 'client' }} · {{ m.sentAt | date:'short' }}</div>
          </div>
        }
      </div>

      <div class="composer">
        <textarea data-testid="reply-textarea"
                  [ngModel]="replyText()"
                  (ngModelChange)="replyText.set($event)"
                  rows="4"
                  placeholder="Type your reply…"></textarea>
        <button mat-flat-button class="send-btn"
                data-testid="send-reply-btn"
                [disabled]="!canSend()"
                (click)="send()">Send →</button>
      </div>
    }
  </div>
  ```

  CSS — match the project dark theme. Message bubble alignment: `.msg-admin { align-self: flex-end; background: #38bdf8; color: #0f172a; }`, `.msg-client { align-self: flex-start; background: #1e293b; color: #e2e8f0; }`. Container is `display: flex; flex-direction: column; gap: 12px;`.

- [ ] **Step 3: Add route**

  ```typescript
  {
    path: 'admin/clients/:id/messages/:threadId',
    loadComponent: () =>
      import('./features/admin/client-messages/admin-client-thread-view.component').then(m => m.AdminClientThreadViewComponent),
    canActivate: [authGuard, adminGuard],
  },
  ```

- [ ] **Step 4: Tests PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/admin-client-thread-view.component.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/features/admin/client-messages/admin-client-thread-view.component.* frontend/src/app/app.routes.ts
  git commit -m "feat(admin): thread view page with inline reply composer"
  ```

## Task 21: Phase 2 closeout

- [ ] **Step 1: Code review the Phase 2 diff** — invoke `superpowers:requesting-code-review`. Address CRITICAL/HIGH.

- [ ] **Step 2: Dev log entry** — append to today's log: commits, feature bullets (Messages button + badge, threads list page, thread view + compose), test count, TDD evidence.

- [ ] **Step 3: Full baseline**

  ```bash
  cd backend && ./mvnw test 2>&1 | tail -5
  cd frontend && npx ng test --no-watch 2>&1 | tail -5
  ```

- [ ] **Step 4: Commit dev log**

  ```bash
  git add docs/log/2026-05-20.md
  git commit -m "docs(log): phase 2 — admin frontend complete"
  ```

---

# Phase 3 — Portal Frontend

**Pre-flight:** baseline green. Also locate the portal navbar component (look under `frontend/src/app/features/client-portal/` or `frontend/src/app/shared/`):
```bash
grep -rn "portal/dashboard" frontend/src/app --include='*.html' | head -5
```
Note the navbar file path — you'll modify it in Task 25.

## Task 22: Portal messages service

**Files:**
- Create: `frontend/src/app/core/services/portal-messages.service.ts`
- Create: `frontend/src/app/core/services/portal-messages.service.spec.ts`

Same shape as Task 16, but the endpoints are under `/api/portal/...` and there's no `clientId` path param. Methods:
```typescript
listThreads(): Observable<MessageThreadSummaryDto[]>            // GET /api/portal/threads
createThread(req: { subject, body }): Observable<MessageThreadDto>  // POST /api/portal/threads
getThread(threadId): Observable<MessageThreadDto>               // GET /api/portal/threads/:id
postReply(threadId, body): Observable<MessageDto>               // POST /api/portal/threads/:id/messages
getUnreadCount(): Observable<{ unreadCount: number }>           // GET /api/portal/messages/unread-count
```

- [ ] **Step 1: RED — service spec** (mirror Task 16's spec, just changed paths)
- [ ] **Step 2: GREEN — service impl**
- [ ] **Step 3: Run + commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/portal-messages.service.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/core/services/portal-messages.service.*
  git commit -m "feat(portal): portal messages service"
  ```

## Task 23: `NewPortalThreadDialogComponent`

**Files:**
- Create: `frontend/src/app/features/client-portal/messages/new-portal-thread-dialog.component.ts`

Same as Task 18 (NewThreadDialogComponent) but:
- Title: "New Message"
- Subtitle: "Send a message to your accountant"
- Submit returns `{ subject, body }` to the parent

- [ ] **Step 1: Copy `NewThreadDialogComponent` structure, change copy strings**
- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/app/features/client-portal/messages/new-portal-thread-dialog.component.ts
  git commit -m "feat(portal): new-portal-thread dialog component"
  ```

## Task 24: `PortalInboxComponent`

**Files:**
- Create: four `portal-inbox.component.{ts,html,css,spec.ts}`
- Modify: `app.routes.ts`

Mirror Task 19 (`AdminClientThreadsComponent`) with these differences:
- No `clientId` route param — endpoint is implicit via auth
- "with {client.name}" subtitle removed (client only has one counterparty)
- Empty state copy: "You have no messages yet."
- "+ New Message" instead of "+ New Thread"
- On submit of new thread dialog: navigates to `/portal/messages/:newThreadId`

- [ ] **Step 1: RED → GREEN spec + impl** (full step-by-step same as Task 19)

- [ ] **Step 2: Add route**

  ```typescript
  {
    path: 'portal/messages',
    loadComponent: () => import('./features/client-portal/messages/portal-inbox.component').then(m => m.PortalInboxComponent),
    canActivate: [authGuard],
  },
  ```

- [ ] **Step 3: Tests PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/portal-inbox.component.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/features/client-portal/messages/portal-inbox.component.* frontend/src/app/app.routes.ts
  git commit -m "feat(portal): inbox page"
  ```

## Task 25: `PortalThreadViewComponent`

**Files:**
- Create: four `portal-thread-view.component.{ts,html,css,spec.ts}`
- Modify: `app.routes.ts`

Mirror Task 20 (`AdminClientThreadViewComponent`) with these differences:
- Service is `PortalMessagesService`, not `AdminClientMessagesService`
- No `clientId` route param — only `:threadId`
- Bubble alignment flipped: `.msg-client { align-self: flex-end; background: #38bdf8; color: #0f172a; }` (the client is "you" here), `.msg-admin { align-self: flex-start; background: #1e293b; color: #e2e8f0; }`
- Back link points to `/portal/messages`
- Sender labels: "you" for CLIENT, "your accountant" for ADMIN

- [ ] **Step 1: RED → GREEN spec + impl**

- [ ] **Step 2: Add route**

  ```typescript
  {
    path: 'portal/messages/:threadId',
    loadComponent: () => import('./features/client-portal/messages/portal-thread-view.component').then(m => m.PortalThreadViewComponent),
    canActivate: [authGuard],
  },
  ```

- [ ] **Step 3: Tests PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch --include='**/portal-thread-view.component.spec.ts' 2>&1 | tail -5
  git add frontend/src/app/features/client-portal/messages/portal-thread-view.component.* frontend/src/app/app.routes.ts
  git commit -m "feat(portal): thread view page with reply composer"
  ```

## Task 26: Portal nav — Messages link + unread badge

**Files:**
- Modify: portal navbar component (path determined in pre-flight)
- Modify: matching spec for the navbar

- [ ] **Step 1: Locate the navbar source**

  ```bash
  grep -rn "portal/dashboard\|portal/documents" frontend/src/app --include='*.html'
  ```
  The matching `.ts`/`.html` files define the nav.

- [ ] **Step 2: RED — extend navbar spec to assert the Messages link + badge**

  Two tests:
  - When `portalMessagesService.getUnreadCount()` returns `{ unreadCount: 3 }`, the badge renders with `3`.
  - When it returns `{ unreadCount: 0 }`, the badge is absent.

- [ ] **Step 3: GREEN — inject `PortalMessagesService`, render a `Messages` link with conditional `.unread-badge` span**

  Template addition (adjust to match existing nav structure):
  ```html
  <a routerLink="/portal/messages" routerLinkActive="active">
    Messages
    @if (unreadCount() > 0) { <span class="unread-badge" data-testid="portal-unread-badge">{{ unreadCount() }}</span> }
  </a>
  ```

- [ ] **Step 4: Tests PASS, commit**

  ```bash
  cd frontend && npx ng test --no-watch 2>&1 | tail -5
  git add <navbar files>
  git commit -m "feat(portal): Messages nav link with unread badge"
  ```

## Task 27: Phase 3 closeout

- [ ] **Step 1: Code review** — invoke `superpowers:requesting-code-review` on Phase 3 diff. Address CRITICAL/HIGH.
- [ ] **Step 2: Dev log entry** — commits, feature bullets, tests, TDD evidence.
- [ ] **Step 3: Full baseline** — `./mvnw test` and `ng test --no-watch` both green.
- [ ] **Step 4: Commit dev log**

  ```bash
  git add docs/log/2026-05-20.md
  git commit -m "docs(log): phase 3 — portal frontend complete"
  ```

---

# Phase 4 — Email Notification + E2E

**Pre-flight:** baseline green. Verify `JavaMailSender` is available in the application context:
```bash
grep -rn "JavaMailSender" backend/src/main/java | head -5
```
Note: the existing `LoggingMailSender` swaps in for dev profiles — no special handling needed in our code.

## Task 28: `MessagePostedEvent` + `MessagingService` publishes events (RED → GREEN)

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/event/MessagePostedEvent.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java`

- [ ] **Step 1: Create event record**

  ```java
  package com.gwhaitech.accountingfirm.messaging.event;

  import com.gwhaitech.accountingfirm.messaging.domain.SenderType;

  public record MessagePostedEvent(
          Long threadId,
          Long clientId,
          String subject,
          SenderType senderType,
          Long senderUserId,
          String body
  ) {}
  ```

- [ ] **Step 2: RED — extend service tests to assert event publishing**

  Append to `MessagingServiceTest`:
  ```java
  // At top: mock the publisher
  // Add to setUp():
  //    publisher = mock(ApplicationEventPublisher.class);
  //    service = new MessagingService(threadRepo, messageRepo, clientRepo, publisher);

  @Test
  void createThreadAsAdmin_publishesMessagePostedEvent() {
      // ... same setup as before ...
      service.createThreadAsAdmin(7L, "Tax", "Hi", 42L);

      ArgumentCaptor<MessagePostedEvent> cap = ArgumentCaptor.forClass(MessagePostedEvent.class);
      verify(publisher).publishEvent(cap.capture());
      assertThat(cap.getValue().senderType()).isEqualTo(SenderType.ADMIN);
      assertThat(cap.getValue().clientId()).isEqualTo(7L);
      assertThat(cap.getValue().body()).isEqualTo("Hi");
  }
  ```

  Repeat for `createThreadAsClient`, `postAdminReply`, `postClientReply` — each should publish an event with matching sender type.

- [ ] **Step 3: GREEN — inject publisher and publish from each send-path method**

  In `MessagingService`, add to constructor:
  ```java
  private final org.springframework.context.ApplicationEventPublisher publisher;

  public MessagingService(..., ApplicationEventPublisher publisher) {
      ...
      this.publisher = publisher;
  }
  ```

  After each `messageRepo.save(m)` call, publish:
  ```java
  publisher.publishEvent(new MessagePostedEvent(
      m.getThreadId(), t.getClientId(), t.getSubject(),
      m.getSenderType(), m.getSenderUserId(), m.getBody()));
  ```

  (In each of the four methods. `t` and `m` are in scope.)

- [ ] **Step 4: Run all messaging tests — expect PASS**

  ```bash
  cd backend && ./mvnw test -Dtest='com.gwhaitech.accountingfirm.messaging.**' -q 2>&1 | tail -10
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/event/MessagePostedEvent.java \
          backend/src/main/java/com/gwhaitech/accountingfirm/messaging/service/MessagingService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/service/MessagingServiceTest.java
  git commit -m "feat(messaging): publish MessagePostedEvent on each send"
  ```

## Task 29: `MessageNotificationListener` + `application.yml` config (RED → GREEN)

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/messaging/event/MessageNotificationListener.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/messaging/event/MessageNotificationListenerTest.java`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Add `app.publicBaseUrl` to `application.yml`**

  ```yaml
  app:
    publicBaseUrl: http://localhost:4200
  ```

  Add a matching dev override in `application-dev.yml` if needed (same value).

- [ ] **Step 2: RED — write listener test**

  ```java
  package com.gwhaitech.accountingfirm.messaging.event;

  import com.gwhaitech.accountingfirm.client.domain.Client;
  import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
  import com.gwhaitech.accountingfirm.contact.config.MailProperties;
  import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
  import org.junit.jupiter.api.BeforeEach;
  import org.junit.jupiter.api.Test;
  import org.mockito.ArgumentCaptor;
  import org.springframework.mail.SimpleMailMessage;
  import org.springframework.mail.javamail.JavaMailSender;

  import java.util.Optional;

  import static org.assertj.core.api.Assertions.assertThat;
  import static org.mockito.Mockito.*;

  class MessageNotificationListenerTest {

      private JavaMailSender mailSender;
      private ClientRepository clientRepo;
      private MailProperties mailProps;
      private MessageNotificationListener listener;

      @BeforeEach
      void setUp() {
          mailSender = mock(JavaMailSender.class);
          clientRepo = mock(ClientRepository.class);
          mailProps = new MailProperties("admin@firm.com", "noreply@firm.com");
          listener = new MessageNotificationListener(mailSender, clientRepo, mailProps, "http://localhost:4200");
      }

      @Test
      void adminToClient_sendsToClientEmail_withPortalLink() {
          Client c = new Client(); c.setId(7L); c.setEmail("jane@x.com"); c.setName("Jane");
          when(clientRepo.findById(7L)).thenReturn(Optional.of(c));

          listener.onMessagePosted(new MessagePostedEvent(50L, 7L, "Tax", SenderType.ADMIN, 42L, "Hi"));

          ArgumentCaptor<SimpleMailMessage> cap = ArgumentCaptor.forClass(SimpleMailMessage.class);
          verify(mailSender).send(cap.capture());
          SimpleMailMessage sent = cap.getValue();
          assertThat(sent.getTo()).containsExactly("jane@x.com");
          assertThat(sent.getSubject()).contains("Tax");
          assertThat(sent.getText()).contains("/portal/messages/50");
          assertThat(sent.getText()).contains("your accountant");
      }

      @Test
      void clientToAdmin_sendsToFirmMailbox_withAdminLink() {
          Client c = new Client(); c.setId(7L); c.setEmail("jane@x.com"); c.setName("Jane");
          when(clientRepo.findById(7L)).thenReturn(Optional.of(c));

          listener.onMessagePosted(new MessagePostedEvent(50L, 7L, "Question", SenderType.CLIENT, 99L, "hello"));

          ArgumentCaptor<SimpleMailMessage> cap = ArgumentCaptor.forClass(SimpleMailMessage.class);
          verify(mailSender).send(cap.capture());
          SimpleMailMessage sent = cap.getValue();
          assertThat(sent.getTo()).containsExactly("admin@firm.com");
          assertThat(sent.getText()).contains("/admin/clients/7/messages/50");
          assertThat(sent.getText()).contains("Jane");
      }

      @Test
      void adminToClient_whenClientHasNoEmail_skipsAndLogsNoThrow() {
          Client c = new Client(); c.setId(7L); c.setEmail(null); c.setName("Jane");
          when(clientRepo.findById(7L)).thenReturn(Optional.of(c));

          listener.onMessagePosted(new MessagePostedEvent(50L, 7L, "Tax", SenderType.ADMIN, 42L, "Hi"));

          verify(mailSender, never()).send(any(SimpleMailMessage.class));
      }
  }
  ```

- [ ] **Step 3: Run — compile fail**

  ```bash
  cd backend && ./mvnw test -Dtest=MessageNotificationListenerTest -q 2>&1 | tail -15
  ```

- [ ] **Step 4: GREEN — implement listener**

  ```java
  package com.gwhaitech.accountingfirm.messaging.event;

  import com.gwhaitech.accountingfirm.client.domain.Client;
  import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
  import com.gwhaitech.accountingfirm.contact.config.MailProperties;
  import com.gwhaitech.accountingfirm.messaging.domain.SenderType;
  import org.slf4j.Logger;
  import org.slf4j.LoggerFactory;
  import org.springframework.beans.factory.annotation.Value;
  import org.springframework.mail.SimpleMailMessage;
  import org.springframework.mail.javamail.JavaMailSender;
  import org.springframework.stereotype.Component;
  import org.springframework.transaction.event.TransactionPhase;
  import org.springframework.transaction.event.TransactionalEventListener;

  @Component
  public class MessageNotificationListener {

      private static final Logger log = LoggerFactory.getLogger(MessageNotificationListener.class);

      private final JavaMailSender mailSender;
      private final ClientRepository clientRepo;
      private final MailProperties mailProps;
      private final String publicBaseUrl;

      public MessageNotificationListener(JavaMailSender mailSender,
                                          ClientRepository clientRepo,
                                          MailProperties mailProps,
                                          @Value("${app.publicBaseUrl:http://localhost:4200}") String publicBaseUrl) {
          this.mailSender = mailSender;
          this.clientRepo = clientRepo;
          this.mailProps = mailProps;
          this.publicBaseUrl = publicBaseUrl;
      }

      @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
      public void onMessagePosted(MessagePostedEvent event) {
          try {
              Client client = clientRepo.findById(event.clientId()).orElse(null);
              if (client == null) {
                  log.warn("MessagePosted event for missing client {}; skipping email", event.clientId());
                  return;
              }

              String recipient;
              String link;
              String senderLabel;
              if (event.senderType() == SenderType.ADMIN) {
                  recipient = client.getEmail();
                  link = publicBaseUrl + "/portal/messages/" + event.threadId();
                  senderLabel = "your accountant";
              } else {
                  recipient = mailProps.notificationEmail();
                  link = publicBaseUrl + "/admin/clients/" + event.clientId() + "/messages/" + event.threadId();
                  senderLabel = client.getName();
              }

              if (recipient == null || recipient.isBlank()) {
                  log.warn("No recipient email for message thread {}; skipping", event.threadId());
                  return;
              }

              SimpleMailMessage msg = new SimpleMailMessage();
              if (mailProps.fromEmail() != null && !mailProps.fromEmail().isBlank()) {
                  msg.setFrom(mailProps.fromEmail());
              }
              msg.setTo(recipient);
              msg.setSubject("New message in your accounting portal: " + event.subject());
              msg.setText("""
                      You have a new message from %s in thread "%s".

                      View it here: %s

                      — Your accounting team
                      """.formatted(senderLabel, event.subject(), link));
              mailSender.send(msg);
          } catch (Exception e) {
              log.error("Failed to send message notification email for thread {}: {}", event.threadId(), e.getMessage(), e);
          }
      }
  }
  ```

- [ ] **Step 5: Run — PASS, commit**

  ```bash
  cd backend && ./mvnw test -Dtest=MessageNotificationListenerTest -q 2>&1 | tail -10
  git add backend/src/main/java/com/gwhaitech/accountingfirm/messaging/event/MessageNotificationListener.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/messaging/event/MessageNotificationListenerTest.java \
          backend/src/main/resources/application.yml
  git commit -m "feat(messaging): notification email listener (AFTER_COMMIT)"
  ```

## Task 30: E2E test for the full roundtrip

**Files:**
- Create: `e2e/admin-client-messaging.spec.ts`

- [ ] **Step 1: Write the E2E spec**

  Follow the pattern of existing e2e tests (`e2e/admin-clients.spec.ts`, `e2e/admin-client-documents.spec.ts`). Use the fake JWT cookie + route mocking approach.

  Test outline (one big roundtrip):
  ```typescript
  import { test, expect } from '@playwright/test';

  test.describe('admin ↔ client messaging roundtrip', () => {
    test('admin sends, client reads + replies, admin sees badge', async ({ browser }) => {
      // Admin context
      const adminCtx = await browser.newContext();
      const adminPage = await adminCtx.newPage();
      // ... auth as admin, mock /api/clients/unread-counts → [{clientId:1, unreadCount:0}] then [{clientId:1,unreadCount:1}] after roundtrip
      // ... navigate to /admin/clients
      // ... no badge initially
      // ... click Messages on row 1 → /admin/clients/1/messages
      // ... click + New Thread → fill subject "E2E test" + body "hello" → Send
      // ... assert navigation to /admin/clients/1/messages/<newThreadId>

      // Client context
      const clientCtx = await browser.newContext();
      const clientPage = await clientCtx.newPage();
      // ... auth as the linked client user
      // ... navigate to /portal/messages
      // ... assert thread visible with unread badge
      // ... open thread, assert "hello" visible
      // ... type "reply" + send

      // Back to admin
      // ... reload /admin/clients
      // ... assert Messages·1 badge visible
      // ... open thread, assert "reply" visible, badge cleared on next list reload
    });
  });
  ```

  Full route mocks: `**/api/clients`, `**/api/clients/unread-counts`, `**/api/clients/1/threads`, `**/api/clients/1/threads/*`, `**/api/portal/threads`, `**/api/portal/threads/*`, `**/api/portal/messages/unread-count`. Stub the responses to track state in-memory.

  Keep the spec focused on UI flow, not the full backend. Stubs simulate the backend's contract.

- [ ] **Step 2: Run the E2E test**

  ```bash
  cd e2e && npx playwright test admin-client-messaging.spec.ts
  ```
  Requires `./start.sh` (backend) and `cd frontend && npm start` running. Expected: PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add e2e/admin-client-messaging.spec.ts
  git commit -m "test(e2e): admin↔client messaging full roundtrip"
  ```

## Task 31: Final verification + dev log + phase closeout

- [ ] **Step 1: Code review the Phase 4 diff** — invoke `superpowers:requesting-code-review`. Address CRITICAL/HIGH.

- [ ] **Step 2: Run `superpowers:verification-before-completion`**

  - Full backend tests: `cd backend && ./mvnw test`
  - Full frontend tests: `cd frontend && npx ng test --no-watch`
  - All E2E tests: `cd e2e && npx playwright test`
  - Scan diff for stray `console.log`, `System.out.println`, debug breakpoints
  - Review the diff one more time

  Document the result in the dev log.

- [ ] **Step 3: Final dev log entry**

  Append to `docs/log/2026-05-20.md`:
  ```markdown
  ### N. Admin ↔ Client Messaging — Phase 4 (Email + E2E + Final Verification)

  **Commits:** <hashes>

  **Feature:**
  - `MessagePostedEvent` published from `MessagingService` after each send.
  - `MessageNotificationListener` runs `AFTER_COMMIT`, sends short plain-text email via `JavaMailSender`. Admin → client email goes to `client.email`; client → admin to `MailProperties.notificationEmail`. Missing-email path logs WARN and does not throw.
  - `app.publicBaseUrl` config drives the link URL.
  - Playwright E2E covers the full admin → portal → admin roundtrip with badge clearing.

  **Code Review Findings:** <table>

  **Tests:** <backend> + <frontend> + <e2e> = <total> passing

  **TDD Evidence:** <RED failures for new Phase 4 tests>

  **Verification:**
  - [x] Backend suite green
  - [x] Frontend suite green
  - [x] E2E suite green
  - [x] No stray debug output in diff
  - [x] Spec sections 1–5 all implemented
  ```

- [ ] **Step 4: Commit dev log + close project**

  ```bash
  git add docs/log/2026-05-20.md
  git commit -m "docs(log): phase 4 — admin↔client messaging complete"
  ```

---

## Verification (project-wide)

When all 31 tasks are checked, run this final sweep:

1. **All test suites green:**
   ```bash
   cd backend && ./mvnw test                       # full backend
   cd frontend && npx ng test --no-watch           # full frontend
   cd e2e && npx playwright test                   # all E2E (requires servers running)
   ```

2. **Manual smoke test:**
   - Set a user's role to ADMIN: `UPDATE users SET role = 'ADMIN' WHERE email = '...';`
   - Open `/admin/clients` → click Messages on a client → start a thread.
   - Log in as the linked client → `/portal/messages` shows the thread with unread badge.
   - Open it, reply.
   - Switch back to admin → reload `/admin/clients` → see `Messages·1` badge.
   - Open the thread → reply visible, badge clears on next clients-list reload.
   - Inspect the application log (or check the dev `LoggingMailSender` output) for the four expected notification emails.

3. **Spec coverage check:** open `docs/superpowers/specs/2026-05-20-admin-client-messaging-design.md` alongside this plan. Confirm every requirement section maps to a task above.
