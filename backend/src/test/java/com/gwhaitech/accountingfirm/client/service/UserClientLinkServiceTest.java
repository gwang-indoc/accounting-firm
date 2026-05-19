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
