# Client Documents View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in client view and download the documents the firm has uploaded for them, filtered by tax year, with a per-year "Download All" zip option.

**Architecture:** Add a `UserClientLinkService` that links a `User` to a `clients` row by matching email at login. Add a client-self API surface under `/api/me/documents` (list + per-doc download + per-year zip). Add an Angular `DocumentsComponent` at `/portal/documents` and minor dashboard tweaks. No DB migration — `clients.user_id` already exists. No changes to `LocalStorageService` or the on-disk layout.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Data JPA, PostgreSQL, JUnit 5 + Mockito + `@WebMvcTest` / `@DataJpaTest`. Angular 21 standalone components (zoneless), RxJS, Vitest + TestBed, Playwright.

**Reference docs:**
- Design spec: `docs/superpowers/specs/2026-05-15-client-documents-view-design.md`

---

## Pre-flight: baseline

Confirm the current suites are green before starting; any later failure is attributable to this work.

- [ ] **Step 1: Run backend tests (baseline)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: pass except 4 pre-existing `@SpringBootTest` failures (`LoggingMailSenderTest`, `ContactIntegrationTest`, `ContactSecurityTest`) caused by no local PostgreSQL. Note the failure count so you can detect regressions later. If the count grows after a task, that's a regression.

- [ ] **Step 2: Run frontend tests (baseline)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
```

Expected: all pass (73 tests, 3 todo at last check).

---

## Task 1: `ClientRepository` query methods

Add two query methods needed by the linkage service and the document service.

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientRepository.java`
- Create test: `backend/src/test/java/com/gwhaitech/accountingfirm/client/domain/ClientRepositoryTest.java`

- [ ] **Step 1: Write the failing repository test**

Create `backend/src/test/java/com/gwhaitech/accountingfirm/client/domain/ClientRepositoryTest.java`:

```java
package com.gwhaitech.accountingfirm.client.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm_test",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class ClientRepositoryTest {

    @Autowired
    ClientRepository repo;

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
        Client a = new Client(); a.setName("A"); a.setEmail("a@x.com"); a.setUserId(42L);
        Client b = new Client(); b.setName("B"); b.setEmail("b@x.com"); b.setUserId(null);
        repo.save(a); repo.save(b);

        Optional<Client> found = repo.findByUserId(42L);

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
```

- [ ] **Step 2: Run the test — expect FAIL (methods don't exist)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=ClientRepositoryTest
```

Expected: compile error — `findByEmailIgnoreCaseOrderById` and `findByUserId` aren't defined.

- [ ] **Step 3: Add the query methods to the repository**

Open `backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientRepository.java`. Replace contents with:

```java
package com.gwhaitech.accountingfirm.client.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientRepository extends JpaRepository<Client, Long> {

    List<Client> findByEmailIgnoreCaseOrderById(String email);

    Optional<Client> findByUserId(Long userId);
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=ClientRepositoryTest
```

Expected: 4 tests pass. If PostgreSQL isn't running locally these will fail with connection errors — start PostgreSQL on `localhost:5432` (database `accounting_firm_test`, user `postgres`/`postgres`) before re-running.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientRepository.java backend/src/test/java/com/gwhaitech/accountingfirm/client/domain/ClientRepositoryTest.java
git commit -m "$(cat <<'EOF'
feat(client): add findByEmailIgnoreCaseOrderById and findByUserId to ClientRepository

Needed for the upcoming user→client linkage flow and the /api/me/documents
endpoint. Email lookups are case-insensitive and deterministically ordered
by client id so duplicate-email scenarios resolve to the lowest id.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `UserClientLinkService`

The service that links a `User` to a `clients` row by matching email. Called from both login paths in later tasks.

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkService.java`
- Create test: `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkServiceTest.java`

- [ ] **Step 1: Write the failing service tests**

Create `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkServiceTest.java`:

```java
package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserClientLinkServiceTest {

    private ClientRepository repo;
    private UserClientLinkService service;

    @BeforeEach
    void setUp() {
        repo = mock(ClientRepository.class);
        service = new UserClientLinkService(repo);
    }

    private User user(long id, String email) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        return u;
    }

    private Client client(long id, String email, Long userId) {
        Client c = new Client();
        c.setId(id);
        c.setEmail(email);
        c.setUserId(userId);
        return c;
    }

    @Test
    void linksToSingleMatchingClient_caseInsensitive() {
        User u = user(7L, "Jane@Example.com");
        when(repo.findByUserId(7L)).thenReturn(Optional.empty());
        when(repo.findByEmailIgnoreCaseOrderById("Jane@Example.com"))
            .thenReturn(List.of(client(99L, "jane@example.com", null)));

        service.linkIfPossible(u);

        ArgumentCaptor<Client> captor = ArgumentCaptor.forClass(Client.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(99L);
        assertThat(captor.getValue().getUserId()).isEqualTo(7L);
    }

    @Test
    void shortCircuits_whenUserAlreadyLinked() {
        User u = user(7L, "jane@example.com");
        when(repo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "jane@example.com", 7L)));

        service.linkIfPossible(u);

        verify(repo, never()).findByEmailIgnoreCaseOrderById(any());
        verify(repo, never()).save(any());
    }

    @Test
    void noOp_whenNoMatchingClient() {
        User u = user(7L, "ghost@nowhere.com");
        when(repo.findByUserId(7L)).thenReturn(Optional.empty());
        when(repo.findByEmailIgnoreCaseOrderById("ghost@nowhere.com")).thenReturn(List.of());

        service.linkIfPossible(u);

        verify(repo, never()).save(any());
    }

    @Test
    void linksToLowestIdWhenMultipleUnlinkedMatch() {
        User u = user(7L, "jane@example.com");
        when(repo.findByUserId(7L)).thenReturn(Optional.empty());
        when(repo.findByEmailIgnoreCaseOrderById("jane@example.com")).thenReturn(List.of(
            client(50L, "jane@example.com", null),
            client(80L, "jane@example.com", null)
        ));

        service.linkIfPossible(u);

        ArgumentCaptor<Client> captor = ArgumentCaptor.forClass(Client.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(50L);
    }

    @Test
    void refusesToOverwrite_whenMatchAlreadyLinkedToOtherUser() {
        User u = user(7L, "jane@example.com");
        when(repo.findByUserId(7L)).thenReturn(Optional.empty());
        when(repo.findByEmailIgnoreCaseOrderById("jane@example.com")).thenReturn(List.of(
            client(50L, "jane@example.com", 99L) // already linked to user 99
        ));

        service.linkIfPossible(u);

        verify(repo, never()).save(any());
    }

    @Test
    void skipsClientsLinkedToOthers_butLinksAvailableOne() {
        User u = user(7L, "jane@example.com");
        when(repo.findByUserId(7L)).thenReturn(Optional.empty());
        when(repo.findByEmailIgnoreCaseOrderById("jane@example.com")).thenReturn(List.of(
            client(50L, "jane@example.com", 99L),
            client(80L, "jane@example.com", null) // this one is free
        ));

        service.linkIfPossible(u);

        ArgumentCaptor<Client> captor = ArgumentCaptor.forClass(Client.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(80L);
    }

    @Test
    void noOp_whenUserHasNoEmail() {
        User u = user(7L, null);
        when(repo.findByUserId(7L)).thenReturn(Optional.empty());

        service.linkIfPossible(u);

        verify(repo, never()).findByEmailIgnoreCaseOrderById(any());
        verify(repo, never()).save(any());
    }
}
```

- [ ] **Step 2: Run the tests — expect FAIL (service doesn't exist)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=UserClientLinkServiceTest
```

Expected: compile failure — `UserClientLinkService` is undefined.

- [ ] **Step 3: Implement the service**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkService.java`:

```java
package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserClientLinkService {

    private static final Logger log = LoggerFactory.getLogger(UserClientLinkService.class);

    private final ClientRepository clientRepository;

    public UserClientLinkService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    @Transactional
    public void linkIfPossible(User user) {
        if (user.getId() == null) {
            return;
        }
        if (clientRepository.findByUserId(user.getId()).isPresent()) {
            return; // already linked
        }
        String email = user.getEmail();
        if (email == null || email.isBlank()) {
            return;
        }

        List<Client> matches = clientRepository.findByEmailIgnoreCaseOrderById(email);
        if (matches.isEmpty()) {
            return;
        }

        Optional<Client> unlinked = matches.stream()
                .filter(c -> c.getUserId() == null)
                .findFirst();

        if (unlinked.isEmpty()) {
            log.warn("User id={} email={} matches {} client(s) but all are already linked to other users; not linking",
                    user.getId(), email, matches.size());
            return;
        }

        long unlinkedCount = matches.stream().filter(c -> c.getUserId() == null).count();
        if (unlinkedCount > 1) {
            log.warn("User id={} email={} matches {} unlinked client(s); linking to lowest id={}",
                    user.getId(), email, unlinkedCount, unlinked.get().getId());
        }

        Client target = unlinked.get();
        target.setUserId(user.getId());
        clientRepository.save(target);
    }
}
```

- [ ] **Step 4: Run the tests — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=UserClientLinkServiceTest
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkService.java backend/src/test/java/com/gwhaitech/accountingfirm/client/service/UserClientLinkServiceTest.java
git commit -m "$(cat <<'EOF'
feat(client): UserClientLinkService — link User to clients row by email

Idempotent linkage helper called from login flows. Refuses to overwrite
an existing link, handles multiple-match cases by linking to the lowest
client id, logs warnings on ambiguous data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Hook linkage into both login paths

Call `UserClientLinkService.linkIfPossible` from `OAuth2SuccessHandler` and `AuthService.login`.

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/auth/service/AuthService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandlerTest.java` (add a verify, update constructor calls)
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/auth/service/AuthServiceTest.java` (add a verify, update constructor calls)

- [ ] **Step 1: Add the linkage call to `OAuth2SuccessHandler`**

Open `backend/src/main/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandler.java`.

Change the imports section — add:

```java
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
```

Add a new field after the existing `private final` fields (around line 22-24):

```java
    private final UserClientLinkService userClientLinkService;
```

Update the constructor signature and body to accept and store the new dependency. Replace the existing constructor with:

```java
    public OAuth2SuccessHandler(
            UserRepository userRepository,
            JwtService jwtService,
            UserClientLinkService userClientLinkService,
            @Value("${app.cookie.secure:true}") boolean cookieSecure,
            @Value("${app.oauth2.redirect-uri:http://localhost:4200/portal/dashboard}") String redirectUri,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userClientLinkService = userClientLinkService;
        this.cookieSecure = cookieSecure;
        this.redirectUri = redirectUri;
        this.expirationMs = expirationMs;
    }
```

Inside `onAuthenticationSuccess`, find the line `user = userRepository.save(user);` and insert immediately after it:

```java
        userClientLinkService.linkIfPossible(user);
```

(So the link happens after the user row has an id.)

- [ ] **Step 2: Update `OAuth2SuccessHandlerTest`**

Open `backend/src/test/java/com/gwhaitech/accountingfirm/auth/handler/OAuth2SuccessHandlerTest.java`.

Add the import:

```java
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
```

Find the field declarations (around line 27-31). Add a new field:

```java
    private UserClientLinkService mockLinkService;
```

In `setUp()`, after the other mocks are created, add:

```java
        mockLinkService = mock(UserClientLinkService.class);
```

Update the `handler = new OAuth2SuccessHandler(...)` constructor call to pass `mockLinkService` as the third argument:

```java
        handler = new OAuth2SuccessHandler(
            mockUserRepo,
            mockJwtService,
            mockLinkService,
            false,
            "http://localhost:4200/portal/dashboard",
            86400000L
        );
```

At the end of the existing `firstLogin_createsUserAndSetsCookie` test (right before the closing `}` of that test method), add:

```java
        verify(mockLinkService).linkIfPossible(any(User.class));
```

Add a new dedicated test at the end of the class (before the closing `}` of the class):

```java
    @Test
    void linkIfPossibleIsCalledAfterSave() throws Exception {
        when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());

        User savedUser = new User();
        savedUser.setId(42L);
        savedUser.setEmail("test@example.com");
        savedUser.setName("Test User");
        savedUser.setGoogleSub("google-sub-123");
        savedUser.setRole("USER");
        when(mockUserRepo.save(any(User.class))).thenReturn(savedUser);
        when(mockJwtService.issueToken(any(User.class))).thenReturn("test.jwt.token");

        handler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(mockUserRepo, mockLinkService);
        inOrder.verify(mockUserRepo).save(any(User.class));
        inOrder.verify(mockLinkService).linkIfPossible(any(User.class));
    }
```

- [ ] **Step 3: Add the linkage call to `AuthService.login`**

Open `backend/src/main/java/com/gwhaitech/accountingfirm/auth/service/AuthService.java`.

Add to imports:

```java
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
```

Replace the entire class body (keeping the package and import statements above) with:

```java
@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserClientLinkService userClientLinkService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       UserClientLinkService userClientLinkService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userClientLinkService = userClientLinkService;
    }

    public void register(RegisterRequest request) {
        Objects.requireNonNull(request.password(), "password must not be null");
        if (!request.password().equals(request.confirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        User user = new User();
        user.setName(request.fullName());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("USER");
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new EmailAlreadyRegisteredException();
        }
    }

    public User login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        userClientLinkService.linkIfPossible(user);
        return user;
    }
}
```

- [ ] **Step 4: Create new `AuthServiceTest`**

There is no existing `AuthServiceTest` in the repo — `AuthService` is exercised today only indirectly via `AuthControllerTest` (which mocks the service). We need a dedicated unit test for the new linkage behavior.

Create `backend/src/test/java/com/gwhaitech/accountingfirm/auth/service/AuthServiceTest.java`:

```java
package com.gwhaitech.accountingfirm.auth.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.dto.LoginRequest;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private UserClientLinkService linkService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        linkService = mock(UserClientLinkService.class);
        authService = new AuthService(userRepository, passwordEncoder, linkService);
    }

    @Test
    void login_invokesLinkIfPossibleAfterSuccessfulPasswordMatch() {
        User user = new User();
        user.setId(11L);
        user.setEmail("a@b.com");
        user.setPasswordHash(passwordEncoder.encode("pw"));
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));

        authService.login(new LoginRequest("a@b.com", "pw"));

        verify(linkService).linkIfPossible(user);
    }

    @Test
    void login_doesNotInvokeLinkIfPossibleWhenPasswordWrong() {
        User user = new User();
        user.setId(11L);
        user.setEmail("a@b.com");
        user.setPasswordHash(passwordEncoder.encode("correct"));
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("a@b.com", "wrong")))
            .isInstanceOf(ResponseStatusException.class);

        verify(linkService, never()).linkIfPossible(any());
    }

    @Test
    void login_doesNotInvokeLinkIfPossibleWhenUserMissing() {
        when(userRepository.findByEmail("nobody@x.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@x.com", "pw")))
            .isInstanceOf(ResponseStatusException.class);

        verify(linkService, never()).linkIfPossible(any());
    }
}
```

Note: `AuthControllerTest` already uses `@MockitoBean AuthService authService` so its existing tests don't construct `AuthService` directly — the constructor-signature change won't break that test. Verify in Step 6.

- [ ] **Step 5: Run the affected tests — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=OAuth2SuccessHandlerTest,AuthServiceTest,UserClientLinkServiceTest
```

Expected: all green.

- [ ] **Step 6: Run the full backend suite for regressions**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: pre-existing 4 `@SpringBootTest` failures remain; nothing new broken. If any other test now fails (e.g., `AuthControllerTest`), it's likely because `AuthService`'s constructor signature changed and the controller test wires the service manually. Fix by passing a `mock(UserClientLinkService.class)` to its constructor call.

- [ ] **Step 7: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/auth backend/src/test/java/com/gwhaitech/accountingfirm/auth
git commit -m "$(cat <<'EOF'
feat(auth): link user to client on every successful login

Both OAuth2SuccessHandler and AuthService.login now call
UserClientLinkService.linkIfPossible after the user is saved/loaded
so a portal account is connected to its clients row by matching email.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `MyDocumentsDto` and `MeDocumentService`

The response DTO and the service that powers `/api/me/documents` (list and zip).

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java`
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java`
- Create test: `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientDocumentRepository.java` (add a `findByClientId` and `findByClientIdAndYearOrderByUploadedAtDesc`)

- [ ] **Step 1: Add the missing repository methods**

Open `backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientDocumentRepository.java`. Replace contents with:

```java
package com.gwhaitech.accountingfirm.client.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientDocumentRepository extends JpaRepository<ClientDocument, Long> {

    List<ClientDocument> findByClientIdAndYear(Long clientId, int year);

    Optional<ClientDocument> findByClientIdAndYearAndFilename(Long clientId, int year, String filename);

    List<ClientDocument> findByClientIdOrderByYearDescUploadedAtDesc(Long clientId);

    List<ClientDocument> findByClientIdAndYearOrderByUploadedAtDesc(Long clientId, int year);
}
```

- [ ] **Step 2: Create the response DTO**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java`:

```java
package com.gwhaitech.accountingfirm.client.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MyDocumentsDto(
        boolean linked,
        String clientName,
        List<Item> documents
) {
    public record Item(
            Long id,
            int year,
            String filename,
            String mimeType,
            Long sizeBytes,
            LocalDateTime uploadedAt
    ) {}
}
```

- [ ] **Step 3: Write the failing service test**

Create `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java`:

```java
package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class MeDocumentServiceTest {

    private ClientRepository clientRepo;
    private ClientDocumentRepository docRepo;
    private LocalStorageService storage;
    private MeDocumentService service;

    @BeforeEach
    void setUp() {
        clientRepo = mock(ClientRepository.class);
        docRepo = mock(ClientDocumentRepository.class);
        storage = mock(LocalStorageService.class);
        service = new MeDocumentService(clientRepo, docRepo, storage);
    }

    private User user(long id) {
        User u = new User();
        u.setId(id);
        return u;
    }

    private Client client(long id, String name) {
        Client c = new Client();
        c.setId(id);
        c.setName(name);
        return c;
    }

    private ClientDocument doc(long id, long clientId, int year, String filename, String filePath) {
        ClientDocument d = new ClientDocument();
        d.setId(id);
        d.setClientId(clientId);
        d.setYear((short) year);
        d.setFilename(filename);
        d.setFilePath(filePath);
        d.setMimeType("application/pdf");
        d.setSizeBytes(100L);
        d.setUploadedBy(1L);
        return d;
    }

    @Test
    void listMyDocuments_returnsLinkedPayloadWhenUserHasClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane Smith")));
        ClientDocument d1 = doc(1L, 99L, 2025, "T4-2025.pdf", "clients/99/2025/T4-2025.pdf");
        ClientDocument d2 = doc(2L, 99L, 2024, "T4-2024.pdf", "clients/99/2024/T4-2024.pdf");
        when(docRepo.findByClientIdOrderByYearDescUploadedAtDesc(99L)).thenReturn(List.of(d1, d2));

        MyDocumentsDto result = service.listMyDocuments(user(7L));

        assertThat(result.linked()).isTrue();
        assertThat(result.clientName()).isEqualTo("Jane Smith");
        assertThat(result.documents()).hasSize(2);
        assertThat(result.documents().get(0).year()).isEqualTo(2025);
        assertThat(result.documents().get(1).year()).isEqualTo(2024);
    }

    @Test
    void listMyDocuments_returnsUnlinkedPayloadWhenUserHasNoClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.empty());

        MyDocumentsDto result = service.listMyDocuments(user(7L));

        assertThat(result.linked()).isFalse();
        assertThat(result.clientName()).isNull();
        assertThat(result.documents()).isEmpty();
        verify(docRepo, never()).findByClientIdOrderByYearDescUploadedAtDesc(any());
    }

    @Test
    void zipForYear_streamsZipWithYearPrefixedEntries(@TempDir Path tmp) throws Exception {
        // Create real files for the storage to read
        Path file1 = tmp.resolve("a.pdf");
        Path file2 = tmp.resolve("b.pdf");
        Files.writeString(file1, "PDF content A");
        Files.writeString(file2, "PDF content B");

        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        ClientDocument d1 = doc(1L, 99L, 2025, "a.pdf", "clients/99/2025/a.pdf");
        ClientDocument d2 = doc(2L, 99L, 2025, "b.pdf", "clients/99/2025/b.pdf");
        when(docRepo.findByClientIdAndYearOrderByUploadedAtDesc(99L, 2025)).thenReturn(List.of(d1, d2));
        when(storage.resolve("clients/99/2025/a.pdf")).thenReturn(file1);
        when(storage.resolve("clients/99/2025/b.pdf")).thenReturn(file2);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        service.zipForYear(user(7L), 2025, out);

        try (ZipInputStream zis = new ZipInputStream(new java.io.ByteArrayInputStream(out.toByteArray()))) {
            ZipEntry e1 = zis.getNextEntry();
            assertThat(e1.getName()).isEqualTo("2025/a.pdf");
            byte[] body = zis.readAllBytes();
            assertThat(new String(body)).isEqualTo("PDF content A");

            ZipEntry e2 = zis.getNextEntry();
            assertThat(e2.getName()).isEqualTo("2025/b.pdf");
            byte[] body2 = zis.readAllBytes();
            assertThat(new String(body2)).isEqualTo("PDF content B");

            assertThat(zis.getNextEntry()).isNull();
        }
    }

    @Test
    void zipForYear_throwsWhenUserHasNoClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.zipForYear(user(7L), 2025, new ByteArrayOutputStream()))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void zipForYear_throwsWhenYearHasNoDocs() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        when(docRepo.findByClientIdAndYearOrderByUploadedAtDesc(99L, 2025)).thenReturn(List.of());

        assertThatThrownBy(() -> service.zipForYear(user(7L), 2025, new ByteArrayOutputStream()))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void getMyDocumentForDownload_returnsPathWhenDocBelongsToCallerClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        ClientDocument d = doc(42L, 99L, 2025, "a.pdf", "clients/99/2025/a.pdf");
        when(docRepo.findById(42L)).thenReturn(Optional.of(d));
        when(storage.resolve("clients/99/2025/a.pdf")).thenReturn(Path.of("/tmp/a.pdf"));

        MeDocumentService.DownloadInfo info = service.getMyDocumentForDownload(user(7L), 42L);

        assertThat(info.filename()).isEqualTo("a.pdf");
        assertThat(info.mimeType()).isEqualTo("application/pdf");
        assertThat(info.path()).isEqualTo(Path.of("/tmp/a.pdf"));
    }

    @Test
    void getMyDocumentForDownload_throwsWhenDocBelongsToOtherClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.of(client(99L, "Jane")));
        ClientDocument d = doc(42L, 100L, 2025, "a.pdf", "clients/100/2025/a.pdf"); // belongs to client 100, not 99
        when(docRepo.findById(42L)).thenReturn(Optional.of(d));

        assertThatThrownBy(() -> service.getMyDocumentForDownload(user(7L), 42L))
            .isInstanceOf(DocumentNotFoundException.class);
    }

    @Test
    void getMyDocumentForDownload_throwsWhenUserHasNoClient() {
        when(clientRepo.findByUserId(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMyDocumentForDownload(user(7L), 42L))
            .isInstanceOf(DocumentNotFoundException.class);
    }
}
```

- [ ] **Step 4: Run the test — expect FAIL (service doesn't exist)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=MeDocumentServiceTest
```

Expected: compile failure.

- [ ] **Step 5: Implement `MeDocumentService`**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java`:

```java
package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientDocument;
import com.gwhaitech.accountingfirm.client.domain.ClientDocumentRepository;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.storage.LocalStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class MeDocumentService {

    private final ClientRepository clientRepository;
    private final ClientDocumentRepository documentRepository;
    private final LocalStorageService storage;

    public MeDocumentService(ClientRepository clientRepository,
                             ClientDocumentRepository documentRepository,
                             LocalStorageService storage) {
        this.clientRepository = clientRepository;
        this.documentRepository = documentRepository;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public MyDocumentsDto listMyDocuments(User user) {
        Optional<Client> client = clientRepository.findByUserId(user.getId());
        if (client.isEmpty()) {
            return new MyDocumentsDto(false, null, List.of());
        }
        Client c = client.get();
        List<MyDocumentsDto.Item> items = documentRepository
                .findByClientIdOrderByYearDescUploadedAtDesc(c.getId())
                .stream()
                .map(d -> new MyDocumentsDto.Item(
                        d.getId(),
                        d.getYear(),
                        d.getFilename(),
                        d.getMimeType(),
                        d.getSizeBytes(),
                        d.getUploadedAt()))
                .toList();
        return new MyDocumentsDto(true, c.getName(), items);
    }

    @Transactional(readOnly = true)
    public void zipForYear(User user, int year, OutputStream out) {
        Client client = clientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new DocumentNotFoundException("No documents for user"));
        List<ClientDocument> docs = documentRepository
                .findByClientIdAndYearOrderByUploadedAtDesc(client.getId(), year);
        if (docs.isEmpty()) {
            throw new DocumentNotFoundException("No documents for year " + year);
        }
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            for (ClientDocument d : docs) {
                ZipEntry entry = new ZipEntry(year + "/" + d.getFilename());
                zos.putNextEntry(entry);
                Path source = storage.resolve(d.getFilePath());
                Files.copy(source, zos);
                zos.closeEntry();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Transactional(readOnly = true)
    public DownloadInfo getMyDocumentForDownload(User user, long docId) {
        Client client = clientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        ClientDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found: " + docId));
        if (!doc.getClientId().equals(client.getId())) {
            throw new DocumentNotFoundException("Document not found: " + docId);
        }
        return new DownloadInfo(doc.getFilename(), doc.getMimeType(), storage.resolve(doc.getFilePath()));
    }

    public record DownloadInfo(String filename, String mimeType, Path path) {}
}
```

- [ ] **Step 6: Run the tests — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=MeDocumentServiceTest
```

Expected: 8 tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/MyDocumentsDto.java backend/src/main/java/com/gwhaitech/accountingfirm/client/service/MeDocumentService.java backend/src/main/java/com/gwhaitech/accountingfirm/client/domain/ClientDocumentRepository.java backend/src/test/java/com/gwhaitech/accountingfirm/client/service/MeDocumentServiceTest.java
git commit -m "$(cat <<'EOF'
feat(client): MeDocumentService — list/zip/download my own documents

Derives client_id from the authenticated user via the user→client link,
then lists docs across all years, streams a per-year zip with
year-prefixed entries, or resolves a single doc for download while
enforcing ownership (404 on cross-client access — no info leak).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `MeDocumentController`

The HTTP surface for the client-self endpoints.

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java`
- Create test: `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentControllerTest.java`

- [ ] **Step 1: Write the failing controller test**

Create `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentControllerTest.java`:

```java
package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.service.MeDocumentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MeDocumentController.class)
@Import(MeDocumentControllerTest.TestSecurityConfig.class)
class MeDocumentControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    MockMvc mvc;

    @MockitoBean
    MeDocumentService meDocumentService;

    private Authentication authForUser(long id) {
        User u = new User();
        u.setId(id);
        u.setEmail("test@example.com");
        u.setName("Test");
        u.setRole("USER");
        return new UsernamePasswordAuthenticationToken(u, null, List.of());
    }

    @Test
    void getMyDocuments_returnsLinkedPayload() throws Exception {
        MyDocumentsDto.Item item = new MyDocumentsDto.Item(
            42L, 2025, "T4.pdf", "application/pdf", 100L, LocalDateTime.parse("2026-02-14T10:23:00"));
        when(meDocumentService.listMyDocuments(any())).thenReturn(
            new MyDocumentsDto(true, "Jane Smith", List.of(item)));

        mvc.perform(get("/api/me/documents").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(true))
            .andExpect(jsonPath("$.clientName").value("Jane Smith"))
            .andExpect(jsonPath("$.documents[0].id").value(42))
            .andExpect(jsonPath("$.documents[0].year").value(2025))
            .andExpect(jsonPath("$.documents[0].filename").value("T4.pdf"));
    }

    @Test
    void getMyDocuments_returnsUnlinkedPayload() throws Exception {
        when(meDocumentService.listMyDocuments(any())).thenReturn(
            new MyDocumentsDto(false, null, List.of()));

        mvc.perform(get("/api/me/documents").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(false))
            .andExpect(jsonPath("$.documents").isEmpty());
    }

    @Test
    void downloadMyDocument_returnsFileWithCorrectHeaders() throws Exception {
        Path tmp = Files.createTempFile("test", ".pdf");
        Files.writeString(tmp, "PDF body");
        when(meDocumentService.getMyDocumentForDownload(any(), eq(42L))).thenReturn(
            new MeDocumentService.DownloadInfo("T4.pdf", "application/pdf", tmp));

        mvc.perform(get("/api/me/documents/42/download").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/pdf"))
            .andExpect(header().string("Content-Disposition",
                "attachment; filename=\"T4.pdf\"; filename*=UTF-8''T4.pdf"))
            .andExpect(content().string("PDF body"));

        Files.deleteIfExists(tmp);
    }

    @Test
    void downloadMyDocument_returns404WhenServiceThrows() throws Exception {
        when(meDocumentService.getMyDocumentForDownload(any(), eq(42L)))
            .thenThrow(new DocumentNotFoundException("Document not found: 42"));

        mvc.perform(get("/api/me/documents/42/download").with(authentication(authForUser(7L))))
            .andExpect(status().isNotFound());
    }

    @Test
    void zipForYear_returns200AndZipMimeType() throws Exception {
        doAnswer(invocation -> {
            OutputStream out = invocation.getArgument(2);
            out.write(new byte[] { 'P', 'K', 0x03, 0x04 }); // minimal zip magic
            return null;
        }).when(meDocumentService).zipForYear(any(), eq(2025), any(OutputStream.class));

        mvc.perform(get("/api/me/documents/zip?year=2025").with(authentication(authForUser(7L))))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "application/zip"))
            .andExpect(header().string("Content-Disposition",
                "attachment; filename=\"GWH-2025-documents.zip\"; filename*=UTF-8''GWH-2025-documents.zip"));
    }

    @Test
    void zipForYear_returns404WhenServiceThrows() throws Exception {
        doThrow(new DocumentNotFoundException("No documents for year 2025"))
            .when(meDocumentService).zipForYear(any(), eq(2025), any(OutputStream.class));

        mvc.perform(get("/api/me/documents/zip?year=2025").with(authentication(authForUser(7L))))
            .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run the test — expect FAIL (controller doesn't exist)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=MeDocumentControllerTest
```

Expected: compile failure.

- [ ] **Step 3: Implement `MeDocumentController`**

Create `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java`:

```java
package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.MyDocumentsDto;
import com.gwhaitech.accountingfirm.client.service.MeDocumentService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/me/documents")
public class MeDocumentController {

    private final MeDocumentService meDocumentService;

    public MeDocumentController(MeDocumentService meDocumentService) {
        this.meDocumentService = meDocumentService;
    }

    @GetMapping
    public ResponseEntity<MyDocumentsDto> listMyDocuments(Authentication authentication) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(meDocumentService.listMyDocuments(user));
    }

    @GetMapping("/{docId}/download")
    public ResponseEntity<Resource> downloadMyDocument(@PathVariable Long docId,
                                                       Authentication authentication) {
        User user = resolveUser(authentication);
        MeDocumentService.DownloadInfo info = meDocumentService.getMyDocumentForDownload(user, docId);
        String contentType = info.mimeType() != null ? info.mimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        String disposition = ContentDisposition.attachment()
                .filename(info.filename(), StandardCharsets.UTF_8)
                .build()
                .toString();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(new FileSystemResource(info.path()));
    }

    @GetMapping("/zip")
    public ResponseEntity<StreamingResponseBody> zipForYear(@RequestParam("year") int year,
                                                            Authentication authentication) {
        User user = resolveUser(authentication);
        String filename = "GWH-" + year + "-documents.zip";
        String disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build()
                .toString();
        StreamingResponseBody body = out -> meDocumentService.zipForYear(user, year, out);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.CONTENT_TYPE, "application/zip")
                .body(body);
    }

    private User resolveUser(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof User user && user.getId() != null) {
            return user;
        }
        throw new IllegalStateException("Authenticated user not resolvable — check security configuration");
    }
}
```

- [ ] **Step 4: Run the tests — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test -Dtest=MeDocumentControllerTest
```

Expected: 6 tests pass. If `DocumentNotFoundException` isn't mapped to 404 by the existing global exception handler, check `GlobalExceptionHandler.java` — it should already map this. If it does not, add a `@ExceptionHandler(DocumentNotFoundException.class)` returning `ResponseEntity.status(HttpStatus.NOT_FOUND).build()` in that file. Existing `DocumentControllerTest` already exercises this path, so the mapping is almost certainly in place.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentController.java backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/MeDocumentControllerTest.java
git commit -m "$(cat <<'EOF'
feat(api): /api/me/documents — list, single download, per-year zip

Three GET endpoints scoped to the authenticated user's linked client.
Cross-client access returns 404 (no info leak). Per-year zip streams
via StreamingResponseBody so no temp file is created on disk.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: TODO marker on `DocumentController` and full-suite verification

A small comment in the staff-facing endpoint flags the known authorization gap so it isn't forgotten. Then run the full backend suite.

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/DocumentController.java`

- [ ] **Step 1: Add TODO comment at the top of `DocumentController`**

Open `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/DocumentController.java`. Insert a comment block immediately above the existing `@RestController` annotation (around line 21):

```java
// TODO(auth): restrict to STAFF/ADMIN role or owning user — currently any
// authenticated user can pass any clientId. Tracked separately from the
// /api/me/documents client-self surface added in May 2026.
@RestController
@RequestMapping("/api/clients/{clientId}/documents")
public class DocumentController {
```

- [ ] **Step 2: Run the full backend suite**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: pre-existing 4 `@SpringBootTest` failures only. Everything else green.

- [ ] **Step 3: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/DocumentController.java
git commit -m "$(cat <<'EOF'
docs(client): flag authorization gap in /api/clients/{id}/documents

Adds a TODO comment marking the known security gap that the parallel
/api/me/documents work intentionally left untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Frontend `MyDocumentsService` + response model

The HTTP service and the typed response model.

**Files:**
- Create: `frontend/src/app/core/models/my-documents.ts`
- Create: `frontend/src/app/core/services/my-documents.service.ts`
- Create test: `frontend/src/app/core/services/my-documents.service.spec.ts`

- [ ] **Step 1: Create the response model**

Create `frontend/src/app/core/models/my-documents.ts`:

```ts
export interface MyDocumentItem {
  id: number;
  year: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
}

export interface MyDocumentsResponse {
  linked: boolean;
  clientName: string | null;
  documents: MyDocumentItem[];
}
```

- [ ] **Step 2: Write the failing service test**

Create `frontend/src/app/core/services/my-documents.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MyDocumentsService } from './my-documents.service';
import { MyDocumentsResponse } from '../models/my-documents';

describe('MyDocumentsService', () => {
  let service: MyDocumentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyDocumentsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MyDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll issues GET /api/me/documents and returns the typed response', () => {
    const expected: MyDocumentsResponse = {
      linked: true,
      clientName: 'Jane Smith',
      documents: [
        { id: 1, year: 2025, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-14T10:23:00' },
      ],
    };

    let received: MyDocumentsResponse | null = null;
    service.getAll().subscribe((res) => (received = res));

    const req = httpMock.expectOne('/api/me/documents');
    expect(req.request.method).toBe('GET');
    req.flush(expected);

    expect(received).toEqual(expected);
  });

  it('getAll passes through unlinked response shape', () => {
    let received: MyDocumentsResponse | null = null;
    service.getAll().subscribe((res) => (received = res));

    const req = httpMock.expectOne('/api/me/documents');
    req.flush({ linked: false, clientName: null, documents: [] });

    expect(received).toEqual({ linked: false, clientName: null, documents: [] });
  });
});
```

- [ ] **Step 3: Run the test — expect FAIL (service doesn't exist)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch --include='**/my-documents.service.spec.ts'
```

Expected: import error — `./my-documents.service` not found.

- [ ] **Step 4: Implement the service**

Create `frontend/src/app/core/services/my-documents.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyDocumentsResponse } from '../models/my-documents';

@Injectable({ providedIn: 'root' })
export class MyDocumentsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<MyDocumentsResponse> {
    return this.http.get<MyDocumentsResponse>('/api/me/documents');
  }
}
```

- [ ] **Step 5: Run the test — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch --include='**/my-documents.service.spec.ts'
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/core/models/my-documents.ts frontend/src/app/core/services/my-documents.service.ts frontend/src/app/core/services/my-documents.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(frontend): MyDocumentsService for /api/me/documents

Typed model + HttpClient wrapper. JWT cookie is sent automatically via
the existing CredentialsInterceptor — no auth handling needed here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `DocumentsComponent` — class, template, CSS, tests

The full `/portal/documents` page.

**Files:**
- Create: `frontend/src/app/features/client-portal/documents/documents.component.ts`
- Create: `frontend/src/app/features/client-portal/documents/documents.component.html`
- Create: `frontend/src/app/features/client-portal/documents/documents.component.css`
- Create test: `frontend/src/app/features/client-portal/documents/documents.component.spec.ts`

- [ ] **Step 1: Write the failing component spec**

Create `frontend/src/app/features/client-portal/documents/documents.component.spec.ts`:

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DocumentsComponent } from './documents.component';
import { MyDocumentsResponse } from '../../../core/models/my-documents';

function linkedResponse(): MyDocumentsResponse {
  return {
    linked: true,
    clientName: 'Jane Smith',
    documents: [
      { id: 1, year: 2025, filename: 'T4-2025.pdf',          mimeType: 'application/pdf', sizeBytes: 50_000,  uploadedAt: '2026-02-14T10:23:00' },
      { id: 2, year: 2025, filename: 'Tax-Return-2025.pdf',  mimeType: 'application/pdf', sizeBytes: 200_000, uploadedAt: '2026-03-02T09:00:00' },
      { id: 3, year: 2024, filename: 'T4-2024.pdf',          mimeType: 'application/pdf', sizeBytes: 48_000,  uploadedAt: '2025-02-12T10:00:00' },
    ],
  };
}

describe('DocumentsComponent', () => {
  let fixture: ComponentFixture<DocumentsComponent>;
  let component: DocumentsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit + initial GET
  });

  afterEach(() => httpMock.verify());

  it('renders not-set-up empty state when linked is false', async () => {
    httpMock.expectOne('/api/me/documents').flush({ linked: false, clientName: null, documents: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Your portal isn't set up yet");
    expect(fixture.nativeElement.querySelector('select.year-select')).toBeNull();
  });

  it('renders no-documents empty state when linked but documents is empty', async () => {
    httpMock.expectOne('/api/me/documents').flush({ linked: true, clientName: 'Jane', documents: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No documents have been shared with you yet');
  });

  it('year dropdown shows unique years sorted descending', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('select.year-select option')) as HTMLOptionElement[];
    const values = options.map(o => o.value);
    expect(values).toEqual(['2025', '2024']);
  });

  it('default selected year is the most recent year', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.selectedYear()).toBe(2025);
  });

  it('changing the year filters the displayed list', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedYear.set(2024);
    fixture.detectChanges();

    const rowTexts = Array.from(fixture.nativeElement.querySelectorAll('.doc-row')).map((r: any) => r.textContent);
    expect(rowTexts.length).toBe(1);
    expect(rowTexts[0]).toContain('T4-2024.pdf');
  });

  it('"Download All" button is disabled when selected year has no docs', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    // Force a year that has no docs (hypothetical, but the computed signal should react)
    component.selectedYear.set(2030 as any);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button.download-all-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  it('"Download All" button is enabled and triggers navigation when year has docs', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    let navigatedTo = '';
    component.navigate = (url: string) => { navigatedTo = url; };

    const btn = fixture.nativeElement.querySelector('button.download-all-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(navigatedTo).toBe('/api/me/documents/zip?year=2025');
  });

  it('per-row Download link points to the right URL', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a.download-link')) as HTMLAnchorElement[];
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/api/me/documents/1/download');
    expect(links[1].getAttribute('href')).toBe('/api/me/documents/2/download');
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL (component doesn't exist)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch --include='**/documents.component.spec.ts'
```

Expected: import error.

- [ ] **Step 3: Create the component class**

Create `frontend/src/app/features/client-portal/documents/documents.component.ts`:

```ts
import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { MyDocumentItem, MyDocumentsResponse } from '../../../core/models/my-documents';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit {
  private myDocs = inject(MyDocumentsService);
  private snackBar = inject(MatSnackBar);

  response = signal<MyDocumentsResponse | null>(null);
  selectedYear = signal<number | null>(null);

  years = computed<number[]>(() => {
    const r = this.response();
    if (!r) return [];
    const uniq = Array.from(new Set(r.documents.map(d => d.year)));
    return uniq.sort((a, b) => b - a);
  });

  filteredDocs = computed<MyDocumentItem[]>(() => {
    const r = this.response();
    const y = this.selectedYear();
    if (!r || y == null) return [];
    return r.documents.filter(d => d.year === y);
  });

  // Indirection for test stubbing. Default uses window.location.
  navigate: (url: string) => void = (url) => { window.location.href = url; };

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => {
        this.response.set(res);
        const ys = this.years();
        if (ys.length > 0) {
          this.selectedYear.set(ys[0]);
        }
      },
      error: () => {
        this.snackBar.open('Could not load your documents. Please try again.', 'OK');
      },
    });
  }

  onYearChange(value: string): void {
    this.selectedYear.set(Number(value));
  }

  downloadYearZip(): void {
    const y = this.selectedYear();
    if (y == null) return;
    this.navigate(`/api/me/documents/zip?year=${y}`);
  }

  downloadHref(docId: number): string {
    return `/api/me/documents/${docId}/download`;
  }

  formatBytes(bytes: number | null): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatUploadedAt(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
```

- [ ] **Step 4: Create the template**

Create `frontend/src/app/features/client-portal/documents/documents.component.html`:

```html
<div class="documents-page">
  <header class="page-header">
    <h1>My Documents</h1>
    <p class="subtitle">Documents shared with you by GWH Accounting</p>
  </header>

  @if (response() === null) {
    <p class="loading">Loading…</p>
  } @else if (!response()!.linked) {
    <div class="empty-state">
      <mat-icon>info_outline</mat-icon>
      <p>Your portal isn't set up yet. Please contact GWH Accounting to get started.</p>
    </div>
  } @else if (response()!.documents.length === 0) {
    <div class="empty-state">
      <mat-icon>folder_open</mat-icon>
      <p>No documents have been shared with you yet. Your accountant will upload them here.</p>
    </div>
  } @else {
    <div class="controls">
      <label class="year-label">
        Tax Year:
        <select class="year-select" [value]="selectedYear()" (change)="onYearChange($any($event.target).value)">
          @for (y of years(); track y) {
            <option [value]="y">{{ y }}</option>
          }
        </select>
      </label>
      <span class="doc-count">· {{ filteredDocs().length }} document{{ filteredDocs().length === 1 ? '' : 's' }}</span>

      <div class="spacer"></div>

      <button mat-flat-button color="primary"
              class="download-all-btn"
              [disabled]="filteredDocs().length === 0"
              (click)="downloadYearZip()">
        <mat-icon>download</mat-icon>
        Download All for {{ selectedYear() }}
      </button>
    </div>

    @if (filteredDocs().length === 0) {
      <div class="empty-state">
        <mat-icon>folder_open</mat-icon>
        <p>No documents for {{ selectedYear() }}. Try a different year above.</p>
      </div>
    } @else {
      <div class="doc-list">
        @for (doc of filteredDocs(); track doc.id) {
          <div class="doc-row">
            <mat-icon class="doc-icon">description</mat-icon>
            <div class="doc-info">
              <div class="doc-filename">{{ doc.filename }}</div>
              <div class="doc-meta">
                {{ doc.mimeType || 'file' }} · {{ formatBytes(doc.sizeBytes) }} · uploaded {{ formatUploadedAt(doc.uploadedAt) }}
              </div>
            </div>
            <a mat-stroked-button class="download-link" [href]="downloadHref(doc.id)" download>
              Download
            </a>
          </div>
        }
      </div>
    }
  }
</div>
```

- [ ] **Step 5: Create the stylesheet**

Create `frontend/src/app/features/client-portal/documents/documents.component.css`:

```css
.documents-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 4px;
  color: #0f172a;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.year-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 14px;
}

.year-select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  background: white;
}

.doc-count {
  color: #64748b;
  font-size: 13px;
}

.spacer {
  flex: 1;
}

.download-all-btn[disabled] {
  opacity: 0.4;
}

.doc-list {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.doc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.doc-row:last-child {
  border-bottom: none;
}

.doc-icon {
  color: #475569;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-filename {
  font-weight: 500;
  color: #0f172a;
}

.doc-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  text-align: center;
}

.empty-state mat-icon {
  font-size: 36px;
  width: 36px;
  height: 36px;
  color: #94a3b8;
}

.loading {
  color: #64748b;
}
```

- [ ] **Step 6: Run the spec — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch --include='**/documents.component.spec.ts'
```

Expected: 8 tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/features/client-portal/documents
git commit -m "$(cat <<'EOF'
feat(client-portal): DocumentsComponent for /portal/documents

Year selector + list + per-row download + Download All for year.
Three empty states: portal not set up, no docs at all, no docs for
selected year. Navigation indirection lets the test stub
window.location for the zip download.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Wire the new route

**Files:**
- Modify: `frontend/src/app/app.routes.ts`

- [ ] **Step 1: Add the route**

Open `frontend/src/app/app.routes.ts`. Find the existing `portal/dashboard` route. Add a new route entry **after** it (still inside the `routes` array):

```ts
  {
    path: 'portal/documents',
    loadComponent: () =>
      import('./features/client-portal/documents/documents.component').then(m => m.DocumentsComponent),
    canActivate: [authGuard],
  },
```

(The `authGuard` import is already present at the top of the file for the dashboard route.)

- [ ] **Step 2: Run the full frontend suite**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/app.routes.ts
git commit -m "$(cat <<'EOF'
feat(routes): add /portal/documents route guarded by authGuard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Dashboard updates — real counts + View Documents link

The dashboard's Account Overview card currently shows `—` for Documents and a hardcoded `2025` for Tax Year. Replace with real values from `MyDocumentsService`. Replace the "Upload Document" Quick Actions button with a "View Documents" link.

**Files:**
- Modify: `frontend/src/app/features/client-portal/dashboard/dashboard.component.ts`
- Modify: `frontend/src/app/features/client-portal/dashboard/dashboard.component.html`
- Modify: `frontend/src/app/features/client-portal/dashboard/dashboard.component.spec.ts`

- [ ] **Step 1: Update the dashboard component class**

Open `frontend/src/app/features/client-portal/dashboard/dashboard.component.ts`. Replace the entire file with:

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { MyDocumentsResponse } from '../../../core/models/my-documents';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';

interface PortalMessage {
  id: number;
  title: string;
  sender: string;
  date: string;
  read: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent,
    MatIcon, MatButton, MatAnchor, MatDivider,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private myDocs = inject(MyDocumentsService);

  response = signal<MyDocumentsResponse | null>(null);

  documentCount = computed(() => this.response()?.documents.length ?? null);

  mostRecentYear = computed<number | null>(() => {
    const r = this.response();
    if (!r || r.documents.length === 0) return null;
    return r.documents.reduce((max, d) => Math.max(max, d.year), 0);
  });

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => this.response.set(res),
      error: () => this.response.set(null),
    });
  }

  get unreadCount(): number {
    return this.messages.filter(m => !m.read).length;
  }

  readonly messages: PortalMessage[] = [
    { id: 1, title: 'Your 2024 tax return is ready for review', sender: 'GWH Accounting', date: 'May 6', read: false },
    { id: 2, title: 'Document received: T4 Statement 2024', sender: 'GWH Accounting', date: 'Apr 28', read: true },
    { id: 3, title: 'Action required: Missing T5 slip', sender: 'GWH Accounting', date: 'Apr 15', read: true },
  ];

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
```

- [ ] **Step 2: Update the dashboard template**

Open `frontend/src/app/features/client-portal/dashboard/dashboard.component.html`.

Find the two `.stat-cell` blocks (around lines 28-37):

```html
          <div class="stat-cell">
            <span class="stat-value">—</span>
            <span class="stat-label">Documents</span>
          </div>
          <mat-divider [vertical]="true" class="stat-divider"></mat-divider>
          <div class="stat-cell">
            <span class="stat-value">2025</span>
            <span class="stat-label">Tax Year</span>
          </div>
```

Replace with:

```html
          <div class="stat-cell">
            <span class="stat-value">{{ documentCount() ?? '—' }}</span>
            <span class="stat-label">Documents</span>
          </div>
          <mat-divider [vertical]="true" class="stat-divider"></mat-divider>
          <div class="stat-cell">
            <span class="stat-value">{{ mostRecentYear() ?? '—' }}</span>
            <span class="stat-label">Tax Year</span>
          </div>
```

Find the Quick Actions block (around lines 41-51):

```html
    <!-- Quick Actions -->
    <mat-card class="card card-actions">
      <mat-card-header>
        <mat-card-title>Quick Actions</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="action-single">
          <button mat-button class="action-tile">Upload Document</button>
        </div>
      </mat-card-content>
    </mat-card>
```

Replace the button line with a routerLink anchor. The new block:

```html
    <!-- Quick Actions -->
    <mat-card class="card card-actions">
      <mat-card-header>
        <mat-card-title>Quick Actions</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="action-single">
          <a mat-button class="action-tile" routerLink="/portal/documents" data-testid="view-documents-link">View Documents</a>
        </div>
      </mat-card-content>
    </mat-card>
```

- [ ] **Step 3: Update the dashboard spec**

Open `frontend/src/app/features/client-portal/dashboard/dashboard.component.spec.ts`. Replace the entire file with:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders mat-card wrapping welcome content', () => {
    // Drain the /api/me/documents request triggered by ngOnInit
    httpMock.match(() => true).forEach(r => r.flush({ linked: false, clientName: null, documents: [] }));
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('does not render a secondary mat-toolbar (logout moved to navbar)', () => {
    httpMock.match(() => true).forEach(r => r.flush({ linked: false, clientName: null, documents: [] }));
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
  });

  it('Documents stat shows real count from /api/me/documents', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true,
      clientName: 'Jane',
      documents: [
        { id: 1, year: 2025, filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-01T00:00:00' },
        { id: 2, year: 2024, filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-01T00:00:00' },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const statValues = Array.from(fixture.nativeElement.querySelectorAll('.stat-value')).map((e: any) => e.textContent.trim());
    expect(statValues).toContain('2');
  });

  it('Tax Year stat shows most recent year from response', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true,
      clientName: 'Jane',
      documents: [
        { id: 1, year: 2025, filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-01T00:00:00' },
        { id: 2, year: 2024, filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-01T00:00:00' },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const statValues = Array.from(fixture.nativeElement.querySelectorAll('.stat-value')).map((e: any) => e.textContent.trim());
    expect(statValues).toContain('2025');
  });

  it('shows em-dash placeholders before the response arrives', () => {
    // Response not flushed yet — placeholders should be visible
    const statValues = Array.from(fixture.nativeElement.querySelectorAll('.stat-value')).map((e: any) => e.textContent.trim());
    expect(statValues.filter(v => v === '—').length).toBe(2);

    // Then drain the pending request so afterEach.verify() is happy
    httpMock.expectOne('/api/me/documents').flush({ linked: false, clientName: null, documents: [] });
  });

  it('View Documents link points to /portal/documents', () => {
    httpMock.match(() => true).forEach(r => r.flush({ linked: false, clientName: null, documents: [] }));
    const link = fixture.nativeElement.querySelector('[data-testid="view-documents-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/portal/documents');
    expect(link.textContent.trim()).toBe('View Documents');
  });
});
```

- [ ] **Step 4: Run the dashboard spec — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch --include='**/dashboard.component.spec.ts'
```

Expected: 6 tests pass.

- [ ] **Step 5: Run the full frontend suite**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/features/client-portal/dashboard
git commit -m "$(cat <<'EOF'
feat(dashboard): wire real document count + year, swap upload for view link

Documents and Tax Year stats now reflect the authenticated user's
linked client. Quick Actions "Upload Document" placeholder becomes a
"View Documents" link that routes to /portal/documents.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: E2E spec for the documents page

Three Playwright tests using `page.route` to mock the backend response (no DB seed required).

**Files:**
- Create: `e2e/client-documents.spec.ts`

- [ ] **Step 1: Create the spec**

Create `e2e/client-documents.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

// These tests assume an authenticated session. The simplest way is to set
// the JWT cookie via page.context().addCookies() before the test runs.
// Adjust the token value to match a local dev signing secret if needed.
// For mocking purposes we don't actually call the backend — page.route
// intercepts /api/me/documents and friends — but the AuthGuard still
// requires the cookie to be present.

async function fakeAuth(page) {
  await page.context().addCookies([{
    name: 'jwt',
    value: 'mock.jwt.token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  // Also mock /api/auth/me so APP_INITIALIZER doesn't blank the user out.
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 7, email: 'jane@example.com', name: 'Jane Smith', role: 'USER' }),
  }));
}

test.describe('/portal/documents', () => {

  test('linked client with docs in two years: dropdown lists both, list updates on change', async ({ page }) => {
    await fakeAuth(page);
    await page.route('**/api/me/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        linked: true,
        clientName: 'Jane Smith',
        documents: [
          { id: 1, year: 2025, filename: 'T4-2025.pdf',         mimeType: 'application/pdf', sizeBytes: 50000,  uploadedAt: '2026-02-14T10:23:00' },
          { id: 2, year: 2025, filename: 'Tax-Return-2025.pdf', mimeType: 'application/pdf', sizeBytes: 200000, uploadedAt: '2026-03-02T09:00:00' },
          { id: 3, year: 2024, filename: 'T4-2024.pdf',         mimeType: 'application/pdf', sizeBytes: 48000,  uploadedAt: '2025-02-12T10:00:00' },
        ],
      }),
    }));

    await page.goto('/portal/documents');

    // Default year is 2025 (most recent); two docs in that year
    await expect(page.locator('.year-select')).toHaveValue('2025');
    await expect(page.locator('.doc-row')).toHaveCount(2);
    await expect(page.locator('.doc-row').first()).toContainText('T4-2025.pdf');

    // Switch year to 2024
    await page.locator('.year-select').selectOption('2024');
    await expect(page.locator('.doc-row')).toHaveCount(1);
    await expect(page.locator('.doc-row').first()).toContainText('T4-2024.pdf');
  });

  test('click "Download All" fires a navigation to the zip endpoint', async ({ page }) => {
    await fakeAuth(page);
    await page.route('**/api/me/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        linked: true,
        clientName: 'Jane Smith',
        documents: [
          { id: 1, year: 2025, filename: 'T4-2025.pdf', mimeType: 'application/pdf', sizeBytes: 50000, uploadedAt: '2026-02-14T10:23:00' },
        ],
      }),
    }));
    // Intercept the zip download so the test doesn't actually fetch a file
    let zipUrlSeen = '';
    await page.route('**/api/me/documents/zip*', route => {
      zipUrlSeen = route.request().url();
      route.fulfill({ status: 200, contentType: 'application/zip', body: 'PK\x03\x04' });
    });

    await page.goto('/portal/documents');
    await page.locator('button.download-all-btn').click();

    // Give the navigation a tick to resolve
    await page.waitForTimeout(200);
    expect(zipUrlSeen).toContain('/api/me/documents/zip?year=2025');
  });

  test('unlinked user sees the not-set-up empty state', async ({ page }) => {
    await fakeAuth(page);
    await page.route('**/api/me/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ linked: false, clientName: null, documents: [] }),
    }));

    await page.goto('/portal/documents');

    await expect(page.locator('.documents-page')).toContainText("Your portal isn't set up yet");
    await expect(page.locator('.year-select')).toHaveCount(0);
    await expect(page.locator('button.download-all-btn')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Start the dev servers (in two terminals)**

```bash
# Terminal 1: backend
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./start.sh
```

```bash
# Terminal 2: frontend
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npm start
```

Wait for backend on `:8080` and frontend on `:4200`.

- [ ] **Step 3: Run the new E2E spec**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && npx playwright test client-documents.spec.ts
```

Expected: 3 tests pass. If the AuthGuard refuses to admit the page despite the mocked `/api/auth/me`, check that the frontend's `APP_INITIALIZER` actually consumes the mocked response — open the `client-documents.spec.ts` describe block, add `await page.waitForResponse(...)` for `/api/auth/me` before navigating to `/portal/documents`, and re-run.

- [ ] **Step 4: Run the full E2E suite (regressions)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && npx playwright test
```

Expected: pre-existing stale `mat-card` mobile layout test in `book-consultation.spec.ts` still fails (unrelated). New tests green. No other regressions.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add e2e/client-documents.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): /portal/documents — year filter, download all, unlinked state

Three Playwright tests covering the documents page using mocked
/api/me/* responses (no DB seed required).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Manual browser smoke test

Per CLAUDE.md ("For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete"). This task is verification only — no commits.

- [ ] **Step 1: Confirm both servers are running** (backend `:8080`, frontend `:4200`)

- [ ] **Step 2: Seed a small data set in the DB**

In psql (or any SQL client) connected to your local `accounting_firm` DB:

```sql
-- Create a portal user (or use the one you already log in with)
-- Then create a client with matching email so the linkage hooks in.
INSERT INTO clients (user_id, name, email, phone) VALUES
  (NULL, 'Smoke Test Client', 'YOUR_LOGIN_EMAIL', '555-0100');

-- Pretend a staff member already uploaded 2 docs for that client.
-- (Find the client_id you just inserted first.)
INSERT INTO client_documents (client_id, year, filename, file_path, mime_type, size_bytes, uploaded_by, uploaded_at) VALUES
  ((SELECT id FROM clients WHERE email='YOUR_LOGIN_EMAIL'), 2025, 'T4-2025.pdf',         'clients/' || (SELECT id FROM clients WHERE email='YOUR_LOGIN_EMAIL') || '/2025/T4-2025.pdf',         'application/pdf', 51234,  1, NOW()),
  ((SELECT id FROM clients WHERE email='YOUR_LOGIN_EMAIL'), 2024, 'Tax-Return-2024.pdf', 'clients/' || (SELECT id FROM clients WHERE email='YOUR_LOGIN_EMAIL') || '/2024/Tax-Return-2024.pdf', 'application/pdf', 200000, 1, NOW());
```

Replace `YOUR_LOGIN_EMAIL` with the email you actually log in with. Also create the files on disk at the matching paths under `UPLOAD_DIR` (default `./uploads`):

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
CLIENT_ID=$(psql -t -c "SELECT id FROM clients WHERE email='YOUR_LOGIN_EMAIL'" accounting_firm | tr -d ' ')
mkdir -p uploads/clients/$CLIENT_ID/2025 uploads/clients/$CLIENT_ID/2024
echo "Sample 2025 T4 PDF content"        > uploads/clients/$CLIENT_ID/2025/T4-2025.pdf
echo "Sample 2024 Tax Return PDF content" > uploads/clients/$CLIENT_ID/2024/Tax-Return-2024.pdf
```

- [ ] **Step 3: Log out and log back in** to trigger the new `linkIfPossible` hook. Verify in the DB that `clients.user_id` is now set to your user's id.

- [ ] **Step 4: Visit `http://localhost:4200/portal/dashboard`**

- Documents stat shows `2` (not `—`).
- Tax Year stat shows `2025`.
- "View Documents" link visible in Quick Actions.

- [ ] **Step 5: Click "View Documents"** — URL changes to `/portal/documents`.

- Year dropdown shows `2025` and `2024`, defaults to `2025`.
- One row visible for 2025 (`T4-2025.pdf`).
- Switching to 2024 shows one row (`Tax-Return-2024.pdf`).
- Click "Download" on a row — file downloads.
- Click "Download All for 2025" — zip downloads named `GWH-2025-documents.zip`. Open it — contents are under `2025/T4-2025.pdf`.

- [ ] **Step 6: Log out, sign up a brand-new account with an email that does NOT match any client**

- Log in. Visit `/portal/documents`. Empty state shows: "Your portal isn't set up yet."
- Dashboard shows `—` for both Documents and Tax Year. "View Documents" link still present.

If anything fails, fix before continuing.

---

## Task 13: Final verification

- [ ] **Step 1: Run all frontend tests**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
```

Expected: all green.

- [ ] **Step 2: Run all backend tests**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: same failure count as the baseline (4 pre-existing `@SpringBootTest` errors, no new failures).

- [ ] **Step 3: Review git log**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm && git log --oneline -15
```

Expected: ~12 focused commits, each scoped to one task.

- [ ] **Step 4: Done**

No final commit. If everything else committed cleanly, the branch is ready for review.

---

## Notes for the implementer

- **No DB migration.** `clients.user_id` is already in V5. Existing rows with `user_id IS NULL` are the "not yet linked" state — that's correct.
- **The on-disk storage layout was already right.** `LocalStorageService.store()` already writes to `clients/<id>/<year>/<filename>`. Do not change it.
- **`/api/clients/{clientId}/documents` is intentionally left alone.** The known authorization gap there is tracked via the TODO comment added in Task 6. Do not lock it down as part of this work.
- **CSS in `DocumentsComponent` is intentionally not shared with other components.** Keeps the file self-contained; YAGNI on extraction.
- **`navigate` indirection** on `DocumentsComponent` is just for testability — production runtime uses `window.location.href`. If you'd prefer Angular's `Router.navigateByUrl` for the zip, note that the zip endpoint is a backend redirect target, not a frontend route — direct browser navigation is correct because we want the browser's download dialog.
- **JWT cookie behavior:** `<a href="/api/me/documents/{id}/download" download>` triggers the browser to issue a same-origin GET, which automatically includes the `jwt` cookie. No extra interceptor work is needed because the link is same-origin.
