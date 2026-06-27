package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.client.domain.BusinessType;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
import com.gwhaitech.accountingfirm.client.dto.CreateClientRequest;
import com.gwhaitech.accountingfirm.client.exception.ClientEmailAlreadyExistsException;
import com.gwhaitech.accountingfirm.client.exception.ClientEmailNotRegisteredException;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ClientService clientService;

    private Client sampleClient() {
        Client c = new Client();
        c.setId(1L);
        c.setName("Acme Corp");
        c.setEmail("contact@acme.com");
        c.setPhone("555-1234");
        c.setAdminId(99L);
        c.setBusinessType(BusinessType.PERSONAL);
        c.setFiscalYearEndMonth((short) 12);
        c.setFiscalYearEndDay((short) 31);
        // simulate @PrePersist
        try {
            var f = Client.class.getDeclaredField("createdAt");
            f.setAccessible(true);
            f.set(c, LocalDateTime.of(2026, 1, 1, 0, 0));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return c;
    }

    private User registeredUser(String email) {
        User u = new User();
        u.setId(10L);
        u.setEmail(email);
        u.setName("Registered");
        return u;
    }

    @Test
    void createClient_returnsClientDtoWithAllFields() {
        Client client = sampleClient();
        when(userRepository.findByEmail("contact@acme.com")).thenReturn(Optional.of(registeredUser("contact@acme.com")));
        when(clientRepository.findByEmailIgnoreCaseOrderById("contact@acme.com")).thenReturn(List.of());
        when(clientRepository.save(any(Client.class))).thenReturn(client);

        CreateClientRequest request = new CreateClientRequest("Acme Corp", "contact@acme.com", "555-1234", BusinessType.PERSONAL, null, null);
        ClientDto dto = clientService.createClient(request, 99L);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.name()).isEqualTo("Acme Corp");
        assertThat(dto.email()).isEqualTo("contact@acme.com");
        assertThat(dto.phone()).isEqualTo("555-1234");
        assertThat(dto.createdAt()).isNotNull();
        assertThat(dto.linkedUserId()).isNull();
    }

    @Test
    void createClient_throws400WhenEmailNotRegistered() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        CreateClientRequest request = new CreateClientRequest("Ghost", "ghost@example.com", null, BusinessType.PERSONAL, null, null);
        assertThatThrownBy(() -> clientService.createClient(request, 1L))
                .isInstanceOf(ClientEmailNotRegisteredException.class);
    }

    @Test
    void createClient_throws409WhenEmailAlreadyAClient() {
        when(userRepository.findByEmail("dup@example.com")).thenReturn(Optional.of(registeredUser("dup@example.com")));
        when(clientRepository.findByEmailIgnoreCaseOrderById("dup@example.com")).thenReturn(List.of(sampleClient()));

        CreateClientRequest request = new CreateClientRequest("Dup", "dup@example.com", null, BusinessType.PERSONAL, null, null);
        assertThatThrownBy(() -> clientService.createClient(request, 1L))
                .isInstanceOf(ClientEmailAlreadyExistsException.class);
    }

    @Test
    void createClient_setsAdminIdFromParam() {
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.of(registeredUser("new@example.com")));
        when(clientRepository.findByEmailIgnoreCaseOrderById("new@example.com")).thenReturn(List.of());
        ArgumentCaptor<Client> captor = ArgumentCaptor.forClass(Client.class);
        Client saved = sampleClient();
        saved.setAdminId(42L);
        when(clientRepository.save(captor.capture())).thenReturn(saved);

        clientService.createClient(new CreateClientRequest("New", "new@example.com", null, BusinessType.PERSONAL, null, null), 42L);

        assertThat(captor.getValue().getAdminId()).isEqualTo(42L);
    }

    @Test
    void findAll_returnsListOfClientDto() {
        when(clientRepository.findByAdminId(99L)).thenReturn(List.of(sampleClient(), sampleClient()));

        List<ClientDto> result = clientService.findAll(99L);

        assertThat(result).hasSize(2);
    }

    @Test
    void findById_returnsClientDto() {
        Client client = sampleClient();
        when(clientRepository.findById(1L)).thenReturn(Optional.of(client));

        ClientDto dto = clientService.findById(1L, 99L);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.name()).isEqualTo("Acme Corp");
    }

    @Test
    void findById_throwsClientNotFoundException() {
        when(clientRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.findById(999L, 99L))
                .isInstanceOf(ClientNotFoundException.class);
    }

    @Test
    void updateClient_updatesAndReturnsDto() {
        Client existing = sampleClient();
        when(clientRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(clientRepository.save(any(Client.class))).thenReturn(existing);

        UpdateClientRequest req = new UpdateClientRequest("New Name", "new@email.com", "999-0000", BusinessType.PERSONAL, null, null);
        ClientDto dto = clientService.updateClient(1L, req, 99L);

        assertThat(dto.name()).isEqualTo("New Name");
        assertThat(dto.email()).isEqualTo("new@email.com");
        assertThat(dto.phone()).isEqualTo("999-0000");
        verify(clientRepository).save(existing);
    }

    @Test
    void updateClient_throwsClientNotFoundException_whenMissing() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());

        UpdateClientRequest req = new UpdateClientRequest("X", null, null, BusinessType.PERSONAL, null, null);
        assertThatThrownBy(() -> clientService.updateClient(99L, req, 1L))
                .isInstanceOf(ClientNotFoundException.class);
    }

    @Test
    void deleteClient_deletesById() {
        Client existing = sampleClient();
        when(clientRepository.findById(1L)).thenReturn(Optional.of(existing));

        clientService.deleteClient(1L, 99L);

        verify(clientRepository).delete(existing);
    }

    @Test
    void deleteClient_throwsClientNotFoundException_whenMissing() {
        when(clientRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clientService.deleteClient(99L, 1L))
                .isInstanceOf(ClientNotFoundException.class);
    }
}
