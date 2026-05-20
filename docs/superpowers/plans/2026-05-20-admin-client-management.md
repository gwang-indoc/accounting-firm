# Admin Client Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-CRUD admin UI so firm staff can create/edit/delete client records from the browser, enabling the Option A onboarding flow where clients are pre-registered by the firm and auto-linked on login.

**Architecture:** Backend gets two new endpoints (`PUT /api/clients/{id}`, `DELETE /api/clients/{id}`) and a `hasRole("ADMIN")` guard on the entire `/api/clients/**` path. The frontend adds an `adminGuard`, a new `/admin/clients` route, and two standalone dialog components (create/edit and delete confirm) accessed from a table-based `AdminClientsComponent`. The navbar gets an "Admin" link visible only when `currentUser().role === 'ADMIN'`.

**Tech Stack:** Java 21 / Spring Boot 3.5 (MockMvc + `@WithMockUser` for security tests, Mockito for unit tests), Angular 21 standalone components (zoneless, Vitest, Angular Material dialogs/table).

---

## File Map

**New files:**
- `backend/.../client/dto/UpdateClientRequest.java`
- `backend/.../client/controller/ClientControllerSecurityTest.java`
- `frontend/src/app/core/models/client.model.ts`
- `frontend/src/app/core/services/admin-clients.service.ts`
- `frontend/src/app/core/services/admin-clients.service.spec.ts`
- `frontend/src/app/core/guards/admin.guard.ts`
- `frontend/src/app/core/guards/admin.guard.spec.ts`
- `frontend/src/app/features/admin/clients/admin-clients.component.ts`
- `frontend/src/app/features/admin/clients/admin-clients.component.html`
- `frontend/src/app/features/admin/clients/admin-clients.component.css`
- `frontend/src/app/features/admin/clients/admin-clients.component.spec.ts`
- `frontend/src/app/features/admin/clients/admin-client-dialog.component.ts`
- `frontend/src/app/features/admin/clients/admin-confirm-dialog.component.ts`
- `e2e/admin-clients.spec.ts`

**Modified files:**
- `backend/.../client/dto/ClientDto.java` — add `linkedUserId` field
- `backend/.../client/service/ClientService.java` — update `toDto()`, add `updateClient()` + `deleteClient()`
- `backend/.../client/controller/ClientController.java` — add PUT + DELETE endpoints
- `backend/.../config/SecurityConfig.java` — add `hasRole("ADMIN")` for `/api/clients/**`
- `backend/.../client/service/ClientServiceTest.java` — update for new DTO field + new methods
- `backend/.../client/controller/ClientControllerTest.java` — update `sampleDto()` for new field + add PUT/DELETE tests
- `frontend/src/app/app.routes.ts` — add `/admin/clients` route
- `frontend/src/app/shared/navbar/navbar.component.html` — add Admin link

---

## Task 1: Extend `ClientDto` with `linkedUserId`

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/ClientDto.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/ClientService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/ClientServiceTest.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/ClientControllerTest.java`

- [ ] **Step 1: Update `ClientServiceTest` to assert the new `linkedUserId` field**

  In `ClientServiceTest.java`, add to `createClient_returnsClientDtoWithAllFields`:
  ```java
  assertThat(dto.linkedUserId()).isNull();
  ```

- [ ] **Step 2: Run the test — expect a compile error**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientServiceTest -q 2>&1 | tail -20
  ```
  Expected: compile error — `linkedUserId()` does not exist on `ClientDto`.

- [ ] **Step 3: Add `linkedUserId` to `ClientDto`**

  Replace the entire `ClientDto.java` with:
  ```java
  package com.gwhaitech.accountingfirm.client.dto;

  import java.time.LocalDateTime;

  public record ClientDto(
          Long id,
          String name,
          String email,
          String phone,
          LocalDateTime createdAt,
          Long linkedUserId
  ) {}
  ```

- [ ] **Step 4: Update `ClientService.toDto()` to map `userId`**

  Replace the `toDto` method in `ClientService.java`:
  ```java
  private ClientDto toDto(Client c) {
      return new ClientDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getCreatedAt(), c.getUserId());
  }
  ```

- [ ] **Step 5: Fix the broken `sampleDto()` in `ClientControllerTest`**

  Replace `sampleDto()` in `ClientControllerTest.java`:
  ```java
  private ClientDto sampleDto() {
      return new ClientDto(1L, "Acme Corp", "contact@acme.com", "555-1234",
              LocalDateTime.of(2026, 1, 1, 0, 0), null);
  }
  ```

- [ ] **Step 6: Run all backend tests**

  ```bash
  cd backend && ./mvnw test -q 2>&1 | tail -20
  ```
  Expected: `BUILD SUCCESS`, all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/ClientDto.java \
          backend/src/main/java/com/gwhaitech/accountingfirm/client/service/ClientService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/client/service/ClientServiceTest.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/ClientControllerTest.java
  git commit -m "feat(client): add linkedUserId to ClientDto"
  ```

---

## Task 2: Add `updateClient()` and `deleteClient()` to `ClientService`

**Files:**
- Create: `backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/UpdateClientRequest.java`
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/service/ClientService.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/client/service/ClientServiceTest.java`

- [ ] **Step 1: Write failing tests in `ClientServiceTest`**

  Add these four tests to the existing `ClientServiceTest.java`:
  ```java
  @Test
  void updateClient_updatesAndReturnsDto() {
      Client existing = sampleClient();
      when(clientRepository.findById(1L)).thenReturn(Optional.of(existing));
      when(clientRepository.save(any(Client.class))).thenReturn(existing);

      UpdateClientRequest req = new UpdateClientRequest("New Name", "new@email.com", "999-0000");
      ClientDto dto = clientService.updateClient(1L, req);

      assertThat(dto.name()).isEqualTo("Acme Corp"); // from sampleClient (save returns original mock)
      verify(clientRepository).save(existing);
  }

  @Test
  void updateClient_throwsClientNotFoundException_whenMissing() {
      when(clientRepository.findById(99L)).thenReturn(Optional.empty());

      UpdateClientRequest req = new UpdateClientRequest("X", null, null);
      assertThatThrownBy(() -> clientService.updateClient(99L, req))
              .isInstanceOf(ClientNotFoundException.class);
  }

  @Test
  void deleteClient_deletesById() {
      Client existing = sampleClient();
      when(clientRepository.findById(1L)).thenReturn(Optional.of(existing));

      clientService.deleteClient(1L);

      verify(clientRepository).delete(existing);
  }

  @Test
  void deleteClient_throwsClientNotFoundException_whenMissing() {
      when(clientRepository.findById(99L)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> clientService.deleteClient(99L))
              .isInstanceOf(ClientNotFoundException.class);
  }
  ```

  Add the import at the top of `ClientServiceTest.java`:
  ```java
  import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;
  import static org.mockito.Mockito.verify;
  ```

- [ ] **Step 2: Run tests — expect failures**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientServiceTest -q 2>&1 | tail -20
  ```
  Expected: compile errors — `UpdateClientRequest` and `updateClient`/`deleteClient` don't exist yet.

- [ ] **Step 3: Create `UpdateClientRequest.java`**

  ```java
  package com.gwhaitech.accountingfirm.client.dto;

  import jakarta.validation.constraints.NotBlank;

  public record UpdateClientRequest(
          @NotBlank String name,
          String email,
          String phone
  ) {}
  ```

- [ ] **Step 4: Add `updateClient()` and `deleteClient()` to `ClientService`**

  Add these two methods to `ClientService.java` (before the private `toDto` method):
  ```java
  public ClientDto updateClient(Long id, UpdateClientRequest request) {
      Client client = clientRepository.findById(id)
              .orElseThrow(() -> new ClientNotFoundException(id));
      client.setName(request.name());
      client.setEmail(request.email());
      client.setPhone(request.phone());
      return toDto(clientRepository.save(client));
  }

  public void deleteClient(Long id) {
      Client client = clientRepository.findById(id)
              .orElseThrow(() -> new ClientNotFoundException(id));
      clientRepository.delete(client);
  }
  ```

  Add the import at the top of `ClientService.java`:
  ```java
  import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;
  ```

- [ ] **Step 5: Run tests — expect pass**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientServiceTest -q 2>&1 | tail -10
  ```
  Expected: `BUILD SUCCESS`.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/client/dto/UpdateClientRequest.java \
          backend/src/main/java/com/gwhaitech/accountingfirm/client/service/ClientService.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/client/service/ClientServiceTest.java
  git commit -m "feat(client): add updateClient and deleteClient to ClientService"
  ```

---

## Task 3: Add PUT + DELETE endpoints to `ClientController`

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/ClientController.java`
- Modify: `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/ClientControllerTest.java`

- [ ] **Step 1: Write failing controller tests**

  Add these tests to `ClientControllerTest.java`. First add imports:
  ```java
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
  import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;
  import static org.mockito.Mockito.doThrow;
  import static org.mockito.Mockito.doNothing;
  ```

  Then add the tests:
  ```java
  @Test
  void putClient_existing_returns200AndDto() throws Exception {
      when(clientService.updateClient(eq(1L), any())).thenReturn(sampleDto());

      mockMvc.perform(put("/api/clients/1")
                      .contentType(MediaType.APPLICATION_JSON)
                      .content("""
                              {"name":"Updated","email":"u@u.com","phone":"111"}
                              """))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.id").value(1));
  }

  @Test
  void putClient_withoutName_returns400() throws Exception {
      mockMvc.perform(put("/api/clients/1")
                      .contentType(MediaType.APPLICATION_JSON)
                      .content("""
                              {"email":"u@u.com"}
                              """))
              .andExpect(status().isBadRequest());
  }

  @Test
  void putClient_notFound_returns404() throws Exception {
      when(clientService.updateClient(eq(999L), any()))
              .thenThrow(new ClientNotFoundException(999L));

      mockMvc.perform(put("/api/clients/999")
                      .contentType(MediaType.APPLICATION_JSON)
                      .content("""
                              {"name":"X"}
                              """))
              .andExpect(status().isNotFound());
  }

  @Test
  void deleteClient_existing_returns204() throws Exception {
      doNothing().when(clientService).deleteClient(1L);

      mockMvc.perform(delete("/api/clients/1"))
              .andExpect(status().isNoContent());
  }

  @Test
  void deleteClient_notFound_returns404() throws Exception {
      doThrow(new ClientNotFoundException(999L)).when(clientService).deleteClient(999L);

      mockMvc.perform(delete("/api/clients/999"))
              .andExpect(status().isNotFound());
  }
  ```

- [ ] **Step 2: Run tests — expect failures**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientControllerTest -q 2>&1 | tail -20
  ```
  Expected: failures — PUT and DELETE endpoints don't exist yet.

- [ ] **Step 3: Add PUT + DELETE to `ClientController`**

  `ClientNotFoundException` is already mapped to 404 by `GlobalExceptionHandler` — do NOT add a duplicate `@ExceptionHandler` here.

  Add the following imports at the top of `ClientController.java`:
  ```java
  import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;
  import org.springframework.web.bind.annotation.PutMapping;
  import org.springframework.web.bind.annotation.DeleteMapping;
  ```

  Then add these two methods to the class (before the closing brace):
  ```java
  @PutMapping("/{id}")
  public ResponseEntity<ClientDto> update(@PathVariable Long id,
                                          @Valid @RequestBody UpdateClientRequest request) {
      return ResponseEntity.ok(clientService.updateClient(id, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
      clientService.deleteClient(id);
      return ResponseEntity.noContent().build();
  }
  ```

- [ ] **Step 4: Run tests — expect pass**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientControllerTest -q 2>&1 | tail -10
  ```
  Expected: `BUILD SUCCESS`.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/client/controller/ClientController.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/ClientControllerTest.java
  git commit -m "feat(client): add PUT and DELETE endpoints to ClientController"
  ```

---

## Task 4: Secure `/api/clients/**` with `hasRole("ADMIN")`

**Files:**
- Modify: `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java`
- Create: `backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/ClientControllerSecurityTest.java`

- [ ] **Step 1: Write the failing security test**

  Create `ClientControllerSecurityTest.java`:
  ```java
  package com.gwhaitech.accountingfirm.client.controller;

  import com.gwhaitech.accountingfirm.client.service.ClientService;
  import org.junit.jupiter.api.Test;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
  import org.springframework.boot.test.context.TestConfiguration;
  import org.springframework.context.annotation.Bean;
  import org.springframework.context.annotation.Import;
  import org.springframework.security.config.annotation.web.builders.HttpSecurity;
  import org.springframework.security.test.context.support.WithMockUser;
  import org.springframework.security.web.SecurityFilterChain;
  import org.springframework.test.context.bean.override.mockito.MockitoBean;
  import org.springframework.test.web.servlet.MockMvc;

  import java.util.List;

  import static org.mockito.Mockito.when;
  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

  @WebMvcTest(ClientController.class)
  @Import(ClientControllerSecurityTest.TestSecurityConfig.class)
  class ClientControllerSecurityTest {

      @TestConfiguration
      static class TestSecurityConfig {
          @Bean
          SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
              http
                  .csrf(csrf -> csrf.disable())
                  .authorizeHttpRequests(auth -> auth
                      .requestMatchers("/api/clients/**").hasRole("ADMIN")
                      .anyRequest().permitAll()
                  );
              return http.build();
          }
      }

      @Autowired
      private MockMvc mockMvc;

      @MockitoBean
      private ClientService clientService;

      @Test
      @WithMockUser(roles = "USER")
      void getClients_withUserRole_returns403() throws Exception {
          mockMvc.perform(get("/api/clients"))
                  .andExpect(status().isForbidden());
      }

      @Test
      @WithMockUser(roles = "ADMIN")
      void getClients_withAdminRole_returns200() throws Exception {
          when(clientService.findAll()).thenReturn(List.of());
          mockMvc.perform(get("/api/clients"))
                  .andExpect(status().isOk());
      }
  }
  ```

- [ ] **Step 2: Run the security test — the USER test should fail**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientControllerSecurityTest -q 2>&1 | tail -20
  ```
  Expected: `getClients_withUserRole_returns403` FAILS (returns 200, not 403) because SecurityConfig doesn't have the ADMIN rule yet.

- [ ] **Step 3: Add the `hasRole("ADMIN")` rule to `SecurityConfig`**

  In `SecurityConfig.java`, inside `.authorizeHttpRequests(auth -> auth`, add this line **before** the existing `.requestMatchers("/api/**").authenticated()` line:
  ```java
  .requestMatchers("/api/clients/**").hasRole("ADMIN")
  ```

  The full block should look like:
  ```java
  .authorizeHttpRequests(auth -> auth
      .requestMatchers("/oauth2/**", "/login/oauth2/**", "/api/auth/**").permitAll()
      .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
      .requestMatchers("/api/clients/**").hasRole("ADMIN")
      .requestMatchers("/api/**").authenticated()
      .anyRequest().denyAll()
  )
  ```

- [ ] **Step 4: Run security tests — expect pass**

  ```bash
  cd backend && ./mvnw test -Dtest=ClientControllerSecurityTest -q 2>&1 | tail -10
  ```
  Expected: `BUILD SUCCESS`.

- [ ] **Step 5: Run all backend tests**

  ```bash
  cd backend && ./mvnw test -q 2>&1 | tail -10
  ```
  Expected: `BUILD SUCCESS`. The existing `ClientControllerTest` uses `permitAll()` in its own `TestSecurityConfig`, so it is unaffected.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java \
          backend/src/test/java/com/gwhaitech/accountingfirm/client/controller/ClientControllerSecurityTest.java
  git commit -m "feat(security): restrict /api/clients/** to ADMIN role"
  ```

---

## Task 5: Frontend — `ClientDto` model and `AdminClientsService`

**Files:**
- Create: `frontend/src/app/core/models/client.model.ts`
- Create: `frontend/src/app/core/services/admin-clients.service.ts`
- Create: `frontend/src/app/core/services/admin-clients.service.spec.ts`

- [ ] **Step 1: Write the failing service test**

  Create `admin-clients.service.spec.ts`:
  ```typescript
  import { TestBed } from '@angular/core/testing';
  import { provideHttpClient } from '@angular/common/http';
  import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
  import { AdminClientsService } from './admin-clients.service';

  describe('AdminClientsService', () => {
    let service: AdminClientsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      service = TestBed.inject(AdminClientsService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('getAll calls GET /api/clients', () => {
      service.getAll().subscribe();
      httpMock.expectOne('/api/clients').flush([]);
    });

    it('create calls POST /api/clients', () => {
      service.create({ name: 'Jane', email: 'j@j.com', phone: '' }).subscribe();
      const req = httpMock.expectOne('/api/clients');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('update calls PUT /api/clients/1', () => {
      service.update(1, { name: 'Jane', email: 'j@j.com', phone: '' }).subscribe();
      const req = httpMock.expectOne('/api/clients/1');
      expect(req.request.method).toBe('PUT');
      req.flush({});
    });

    it('delete calls DELETE /api/clients/1', () => {
      service.delete(1).subscribe();
      const req = httpMock.expectOne('/api/clients/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
  ```

- [ ] **Step 2: Run the test — expect failures**

  ```bash
  cd frontend && npx ng test --include='**/admin-clients.service.spec.ts' --no-watch 2>&1 | tail -20
  ```
  Expected: errors — `AdminClientsService` doesn't exist yet.

- [ ] **Step 3: Create the `ClientDto` model**

  Create `frontend/src/app/core/models/client.model.ts`:
  ```typescript
  export interface ClientDto {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
    linkedUserId: number | null;
  }
  ```

- [ ] **Step 4: Create `AdminClientsService`**

  Create `frontend/src/app/core/services/admin-clients.service.ts`:
  ```typescript
  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import { ClientDto } from '../models/client.model';

  @Injectable({ providedIn: 'root' })
  export class AdminClientsService {
    constructor(private http: HttpClient) {}

    getAll(): Observable<ClientDto[]> {
      return this.http.get<ClientDto[]>('/api/clients');
    }

    create(req: { name: string; email: string; phone: string }): Observable<ClientDto> {
      return this.http.post<ClientDto>('/api/clients', req);
    }

    update(id: number, req: { name: string; email: string; phone: string }): Observable<ClientDto> {
      return this.http.put<ClientDto>(`/api/clients/${id}`, req);
    }

    delete(id: number): Observable<void> {
      return this.http.delete<void>(`/api/clients/${id}`);
    }
  }
  ```

- [ ] **Step 5: Run tests — expect pass**

  ```bash
  cd frontend && npx ng test --include='**/admin-clients.service.spec.ts' --no-watch 2>&1 | tail -10
  ```
  Expected: 4 tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/app/core/models/client.model.ts \
          frontend/src/app/core/services/admin-clients.service.ts \
          frontend/src/app/core/services/admin-clients.service.spec.ts
  git commit -m "feat(admin): ClientDto model and AdminClientsService"
  ```

---

## Task 6: Frontend — `adminGuard`

**Files:**
- Create: `frontend/src/app/core/guards/admin.guard.ts`
- Create: `frontend/src/app/core/guards/admin.guard.spec.ts`

- [ ] **Step 1: Write failing guard tests**

  Create `admin.guard.spec.ts`:
  ```typescript
  import { TestBed } from '@angular/core/testing';
  import { provideZonelessChangeDetection } from '@angular/core';
  import { provideRouter, Router } from '@angular/router';
  import { adminGuard } from './admin.guard';
  import { AuthService } from '../services/auth.service';
  import { provideHttpClient } from '@angular/common/http';
  import { provideHttpClientTesting } from '@angular/common/http/testing';

  describe('adminGuard', () => {
    let authService: AuthService;
    let router: Router;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
        ],
      });
      authService = TestBed.inject(AuthService);
      router = TestBed.inject(Router);
    });

    it('returns true when user has ADMIN role', () => {
      authService.currentUser.set({ id: 1, email: 'a@a.com', name: 'Admin', role: 'ADMIN' });
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('redirects to / and returns false when user has USER role', () => {
      authService.currentUser.set({ id: 2, email: 'u@u.com', name: 'User', role: 'USER' });
      const spy = vi.spyOn(router, 'navigate');
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith(['/']);
    });

    it('redirects to / and returns false when not authenticated', () => {
      authService.currentUser.set(null);
      const spy = vi.spyOn(router, 'navigate');
      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith(['/']);
    });
  });
  ```

- [ ] **Step 2: Run test — expect failure**

  ```bash
  cd frontend && npx ng test --include='**/admin.guard.spec.ts' --no-watch 2>&1 | tail -20
  ```
  Expected: error — `adminGuard` doesn't exist yet.

- [ ] **Step 3: Create `admin.guard.ts`**

  Create `frontend/src/app/core/guards/admin.guard.ts`:
  ```typescript
  import { inject } from '@angular/core';
  import { CanActivateFn, Router } from '@angular/router';
  import { AuthService } from '../services/auth.service';

  export const adminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.currentUser()?.role === 'ADMIN') {
      return true;
    }
    router.navigate(['/']);
    return false;
  };
  ```

- [ ] **Step 4: Run test — expect pass**

  ```bash
  cd frontend && npx ng test --include='**/admin.guard.spec.ts' --no-watch 2>&1 | tail -10
  ```
  Expected: 3 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/app/core/guards/admin.guard.ts \
          frontend/src/app/core/guards/admin.guard.spec.ts
  git commit -m "feat(admin): adminGuard — redirects non-ADMIN users to /"
  ```

---

## Task 7: Frontend — `AdminClientDialogComponent` and `AdminConfirmDialogComponent`

**Files:**
- Create: `frontend/src/app/features/admin/clients/admin-client-dialog.component.ts`
- Create: `frontend/src/app/features/admin/clients/admin-confirm-dialog.component.ts`

No isolated unit tests for these — they are covered by the `AdminClientsComponent` integration test in Task 8.

- [ ] **Step 1: Create the `admin-confirm-dialog.component.ts`**

  ```typescript
  import { Component, inject } from '@angular/core';
  import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
  import { MatButtonModule } from '@angular/material/button';

  @Component({
    standalone: true,
    imports: [MatDialogModule, MatButtonModule],
    template: `
      <h2 mat-dialog-title>Confirm Delete</h2>
      <mat-dialog-content>{{ data.message }}</mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button [mat-dialog-close]="false">Cancel</button>
        <button mat-flat-button color="warn" [mat-dialog-close]="true">Delete</button>
      </mat-dialog-actions>
    `,
  })
  export class AdminConfirmDialogComponent {
    protected data = inject<{ message: string }>(MAT_DIALOG_DATA);
  }
  ```

- [ ] **Step 2: Create `admin-client-dialog.component.ts`**

  ```typescript
  import { Component, inject } from '@angular/core';
  import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
  import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
  import { MatButtonModule } from '@angular/material/button';
  import { MatFormFieldModule } from '@angular/material/form-field';
  import { MatInputModule } from '@angular/material/input';
  import { MatSnackBar } from '@angular/material/snack-bar';
  import { AdminClientsService } from '../../../core/services/admin-clients.service';
  import { ClientDto } from '../../../core/models/client.model';

  export interface AdminClientDialogData {
    client: ClientDto | null;
  }

  @Component({
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
    template: `
      <h2 mat-dialog-title>{{ isEdit ? 'Edit Client' : 'Add Client' }}</h2>
      <mat-dialog-content>
        <form [formGroup]="form" id="clientForm" (ngSubmit)="submit()" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="name" />
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-hint>Must match the client's Google account email</mat-hint>
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <mat-error>Email is required</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Phone (optional)</mat-label>
            <input matInput formControlName="phone" />
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button [mat-dialog-close]="null">Cancel</button>
        <button mat-flat-button color="primary" form="clientForm" type="submit">
          {{ isEdit ? 'Save' : 'Add Client' }}
        </button>
      </mat-dialog-actions>
    `,
    styles: [`.dialog-form { display: flex; flex-direction: column; gap: 8px; min-width: 320px; padding-top: 8px; }`],
  })
  export class AdminClientDialogComponent {
    private data = inject<AdminClientDialogData>(MAT_DIALOG_DATA);
    private dialogRef = inject(MatDialogRef<AdminClientDialogComponent>);
    private adminClientsService = inject(AdminClientsService);
    private snackBar = inject(MatSnackBar);

    protected isEdit = this.data.client !== null;

    form = new FormGroup({
      name: new FormControl(this.data.client?.name ?? '', Validators.required),
      email: new FormControl(this.data.client?.email ?? '', Validators.required),
      phone: new FormControl(this.data.client?.phone ?? ''),
    });

    submit(): void {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      const req = this.form.value as { name: string; email: string; phone: string };
      const obs$ = this.isEdit
        ? this.adminClientsService.update(this.data.client!.id, req)
        : this.adminClientsService.create(req);

      obs$.subscribe({
        next: (result) => this.dialogRef.close(result),
        error: () => this.snackBar.open('Failed to save client. Please try again.', 'OK'),
      });
    }
  }
  ```

- [ ] **Step 3: Run all frontend tests to confirm no breakage**

  ```bash
  cd frontend && npx ng test --no-watch 2>&1 | tail -10
  ```
  Expected: all existing tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/app/features/admin/clients/admin-client-dialog.component.ts \
          frontend/src/app/features/admin/clients/admin-confirm-dialog.component.ts
  git commit -m "feat(admin): AdminClientDialogComponent and AdminConfirmDialogComponent"
  ```

---

## Task 8: Frontend — `AdminClientsComponent`

**Files:**
- Create: `frontend/src/app/features/admin/clients/admin-clients.component.ts`
- Create: `frontend/src/app/features/admin/clients/admin-clients.component.html`
- Create: `frontend/src/app/features/admin/clients/admin-clients.component.css`
- Create: `frontend/src/app/features/admin/clients/admin-clients.component.spec.ts`

- [ ] **Step 1: Write failing component tests**

  Create `admin-clients.component.spec.ts`:
  ```typescript
  import { TestBed, ComponentFixture } from '@angular/core/testing';
  import { provideZonelessChangeDetection } from '@angular/core';
  import { provideHttpClient } from '@angular/common/http';
  import { provideHttpClientTesting } from '@angular/common/http/testing';
  import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
  import { AdminClientsComponent } from './admin-clients.component';
  import { AdminClientsService } from '../../../core/services/admin-clients.service';
  import { ClientDto } from '../../../core/models/client.model';
  import { of } from 'rxjs';

  const sampleClients: ClientDto[] = [
    { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: '555-1234', createdAt: '2026-01-01T00:00:00', linkedUserId: 42 },
    { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null,        createdAt: '2026-01-02T00:00:00', linkedUserId: null },
  ];

  describe('AdminClientsComponent', () => {
    let fixture: ComponentFixture<AdminClientsComponent>;
    let mockService: Partial<AdminClientsService>;

    beforeEach(async () => {
      mockService = {
        getAll: vi.fn().mockReturnValue(of(sampleClients)),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [AdminClientsComponent],
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideAnimationsAsync(),
          { provide: AdminClientsService, useValue: mockService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(AdminClientsComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('renders two client rows on load', () => {
      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(2);
    });

    it('shows Linked badge for linked client', () => {
      const firstRow = fixture.nativeElement.querySelector('[data-testid="client-row"]');
      expect(firstRow.textContent).toContain('Linked');
    });

    it('shows Not linked badge for unlinked client', () => {
      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows[1].textContent).toContain('Not linked');
    });

    it('Add Client button exists', () => {
      const btn = fixture.nativeElement.querySelector('[data-testid="add-client-btn"]');
      expect(btn).not.toBeNull();
    });
  });
  ```

- [ ] **Step 2: Run test — expect failures**

  ```bash
  cd frontend && npx ng test --include='**/admin-clients.component.spec.ts' --no-watch 2>&1 | tail -20
  ```
  Expected: error — `AdminClientsComponent` doesn't exist.

- [ ] **Step 3: Create `admin-clients.component.ts`**

  ```typescript
  import { Component, inject, OnInit, signal } from '@angular/core';
  import { MatButtonModule } from '@angular/material/button';
  import { MatDialog } from '@angular/material/dialog';
  import { MatSnackBar } from '@angular/material/snack-bar';
  import { RouterLink } from '@angular/router';
  import { AdminClientsService } from '../../../core/services/admin-clients.service';
  import { ClientDto } from '../../../core/models/client.model';
  import { AdminClientDialogComponent } from './admin-client-dialog.component';
  import { AdminConfirmDialogComponent } from './admin-confirm-dialog.component';

  @Component({
    selector: 'app-admin-clients',
    standalone: true,
    imports: [MatButtonModule, RouterLink],
    templateUrl: './admin-clients.component.html',
    styleUrl: './admin-clients.component.css',
  })
  export class AdminClientsComponent implements OnInit {
    private adminClientsService = inject(AdminClientsService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    clients = signal<ClientDto[]>([]);

    ngOnInit(): void {
      this.load();
    }

    private load(): void {
      this.adminClientsService.getAll().subscribe({
        next: (list) => this.clients.set(list),
        error: () => this.snackBar.open('Failed to load clients.', 'OK'),
      });
    }

    openAddDialog(): void {
      this.dialog.open(AdminClientDialogComponent, { data: { client: null }, width: '420px' })
        .afterClosed()
        .subscribe((result: ClientDto | null) => {
          if (result) this.clients.update(list => [...list, result]);
        });
    }

    openEditDialog(client: ClientDto): void {
      this.dialog.open(AdminClientDialogComponent, { data: { client }, width: '420px' })
        .afterClosed()
        .subscribe((result: ClientDto | null) => {
          if (result) this.clients.update(list => list.map(c => c.id === result.id ? result : c));
        });
    }

    confirmDelete(client: ClientDto): void {
      const warning = client.linkedUserId
        ? ' This client is linked to a user account — they will lose portal access.'
        : '';
      this.dialog.open(AdminConfirmDialogComponent, {
        data: { message: `Delete "${client.name}"?${warning}` },
        width: '380px',
      })
        .afterClosed()
        .subscribe((confirmed: boolean) => {
          if (!confirmed) return;
          this.adminClientsService.delete(client.id).subscribe({
            next: () => this.clients.update(list => list.filter(c => c.id !== client.id)),
            error: () => this.snackBar.open('Failed to delete client.', 'OK'),
          });
        });
    }
  }
  ```

- [ ] **Step 4: Create `admin-clients.component.html`**

  ```html
  <div class="admin-clients">
    <div class="page-header">
      <div>
        <h1 class="page-title">Clients</h1>
        <p class="page-subtitle">{{ clients().length }} record{{ clients().length === 1 ? '' : 's' }}</p>
      </div>
      <button mat-flat-button color="primary" data-testid="add-client-btn" (click)="openAddDialog()">
        + Add Client
      </button>
    </div>

    <div class="table-card">
      <table class="clients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Portal Link</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (client of clients(); track client.id) {
            <tr data-testid="client-row">
              <td class="name-cell">{{ client.name }}</td>
              <td>{{ client.email ?? '—' }}</td>
              <td>{{ client.phone ?? '—' }}</td>
              <td>
                @if (client.linkedUserId) {
                  <span class="badge badge-linked">Linked</span>
                } @else {
                  <span class="badge badge-unlinked">Not linked</span>
                }
              </td>
              <td class="actions-cell">
                <button mat-button color="primary" (click)="openEditDialog(client)">Edit</button>
                <button mat-button color="warn" (click)="confirmDelete(client)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="empty-cell">No clients yet. Click "+ Add Client" to create one.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <a mat-button routerLink="/portal/dashboard" class="back-link">← Back to Portal</a>
  </div>
  ```

- [ ] **Step 5: Create `admin-clients.component.css`**

  ```css
  .admin-clients {
    max-width: 900px;
    margin: 40px auto;
    padding: 0 24px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 4px;
    color: #1e1b4b;
  }

  .page-subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }

  .table-card {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .clients-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .clients-table thead tr {
    background: #f5f3ff;
  }

  .clients-table th {
    padding: 10px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #4338ca;
  }

  .clients-table td {
    padding: 12px 16px;
    border-top: 1px solid #f3f4f6;
    color: #374151;
  }

  .name-cell {
    font-weight: 600;
    color: #111827;
  }

  .badge {
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  .badge-linked {
    background: #d1fae5;
    color: #065f46;
  }

  .badge-unlinked {
    background: #fef3c7;
    color: #92400e;
  }

  .actions-cell {
    white-space: nowrap;
  }

  .empty-cell {
    text-align: center;
    color: #9ca3af;
    padding: 32px;
  }

  .back-link {
    color: #6b7280;
  }
  ```

- [ ] **Step 6: Run the component tests — expect pass**

  ```bash
  cd frontend && npx ng test --include='**/admin-clients.component.spec.ts' --no-watch 2>&1 | tail -10
  ```
  Expected: 4 tests pass.

- [ ] **Step 7: Run all frontend tests**

  ```bash
  cd frontend && npx ng test --no-watch 2>&1 | tail -10
  ```
  Expected: all pass.

- [ ] **Step 8: Commit**

  ```bash
  git add frontend/src/app/features/admin/clients/
  git commit -m "feat(admin): AdminClientsComponent with CRUD table and dialogs"
  ```

---

## Task 9: Wire up route and navbar

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/shared/navbar/navbar.component.html`

- [ ] **Step 1: Add `/admin/clients` route to `app.routes.ts`**

  Add this entry to the `routes` array (after the existing portal routes):
  ```typescript
  {
    path: 'admin/clients',
    loadComponent: () =>
      import('./features/admin/clients/admin-clients.component').then(m => m.AdminClientsComponent),
    canActivate: [authGuard, adminGuard],
  },
  ```

  Add `adminGuard` to the imports at the top of `app.routes.ts`:
  ```typescript
  import { adminGuard } from './core/guards/admin.guard';
  ```

- [ ] **Step 2: Add Admin link to navbar**

  In `navbar.component.html`, inside the `@if (authService.isAuthenticated())` block, add the Admin link before the Logout button:
  ```html
  @if (authService.currentUser()?.role === 'ADMIN') {
    <a mat-button routerLink="/admin/clients" data-testid="admin-nav-link">Admin</a>
  }
  ```

  The full authenticated block becomes:
  ```html
  @if (authService.isAuthenticated()) {
    <span class="nav-user-name">{{ authService.currentUser()?.name }}</span>
    @if (authService.currentUser()?.role === 'ADMIN') {
      <a mat-button routerLink="/admin/clients" data-testid="admin-nav-link">Admin</a>
    }
    <button mat-button data-testid="logout-btn" (click)="logout()">Logout</button>
  }
  ```

- [ ] **Step 3: Run all frontend tests**

  ```bash
  cd frontend && npx ng test --no-watch 2>&1 | tail -10
  ```
  Expected: all pass.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/app/app.routes.ts \
          frontend/src/app/shared/navbar/navbar.component.html
  git commit -m "feat(admin): wire /admin/clients route and navbar Admin link"
  ```

---

## Task 10: E2E test

**Files:**
- Create: `e2e/admin-clients.spec.ts`

- [ ] **Step 1: Create the E2E test**

  Create `e2e/admin-clients.spec.ts`:
  ```typescript
  import { test, expect } from '@playwright/test';

  async function fakeAdminAuth(page) {
    await page.context().addCookies([{
      name: 'jwt',
      value: 'mock.jwt.token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    }]);
    await page.route('**/api/auth/me', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' }),
    }));
  }

  test.describe('/admin/clients', () => {

    test('admin sees client list', async ({ page }) => {
      await fakeAdminAuth(page);
      await page.route('**/api/clients', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: '555-1234', createdAt: '2026-01-01T00:00:00', linkedUserId: 10 },
          { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null,        createdAt: '2026-01-02T00:00:00', linkedUserId: null },
        ]),
      }));

      await page.goto('/admin/clients');

      await expect(page.getByTestId('client-row')).toHaveCount(2);
      await expect(page.getByTestId('client-row').first()).toContainText('Jane Smith');
      await expect(page.getByTestId('client-row').first()).toContainText('Linked');
      await expect(page.getByTestId('client-row').nth(1)).toContainText('Not linked');
    });

    test('non-admin is redirected to /', async ({ page }) => {
      await page.context().addCookies([{
        name: 'jwt', value: 'mock.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false,
      }]);
      await page.route('**/api/auth/me', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 2, email: 'user@x.com', name: 'User', role: 'USER' }),
      }));

      await page.goto('/admin/clients');
      await expect(page).toHaveURL('/');
    });

    test('admin creates a new client', async ({ page }) => {
      await fakeAdminAuth(page);

      const clients = [
        { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: null },
      ];

      await page.route('**/api/clients', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(clients) });
        } else if (route.request().method() === 'POST') {
          const newClient = { id: 99, name: 'Carol Wu', email: 'carol@example.com', phone: '555-9999', createdAt: '2026-05-20T00:00:00', linkedUserId: null };
          clients.push(newClient);
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newClient) });
        }
      });

      await page.goto('/admin/clients');
      await expect(page.getByTestId('client-row')).toHaveCount(1);

      await page.getByTestId('add-client-btn').click();
      await page.getByLabel('Full Name').fill('Carol Wu');
      await page.getByLabel('Email').fill('carol@example.com');
      await page.getByLabel('Phone (optional)').fill('555-9999');
      await page.getByRole('button', { name: 'Add Client' }).click();

      await expect(page.getByTestId('client-row')).toHaveCount(2);
      await expect(page.getByTestId('client-row').nth(1)).toContainText('Carol Wu');
    });

  });
  ```

- [ ] **Step 2: Run the E2E test (requires backend + frontend running)**

  ```bash
  cd e2e && npx playwright test admin-clients.spec.ts
  ```
  Expected: 3 tests pass. If servers aren't running, start them first: `./start.sh` in one terminal, `cd frontend && npm start` in another.

- [ ] **Step 3: Commit**

  ```bash
  git add e2e/admin-clients.spec.ts
  git commit -m "test(e2e): admin client management — list, guard redirect, create"
  ```

---

## Verification

After all tasks are complete:

1. **All backend tests pass:**
   ```bash
   cd backend && ./mvnw test
   ```

2. **All frontend tests pass:**
   ```bash
   cd frontend && npx ng test --no-watch
   ```

3. **E2E tests pass:**
   ```bash
   cd e2e && npx playwright test admin-clients.spec.ts
   ```

4. **Manual smoke test:**
   - Start backend and frontend
   - Set a user's role to ADMIN in DB: `UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';`
   - Log in — "Admin" link appears in navbar
   - Navigate to `/admin/clients` — client table loads
   - Create a client with the same email as a test Google account
   - Log in with that Google account — should land on portal with linked status
