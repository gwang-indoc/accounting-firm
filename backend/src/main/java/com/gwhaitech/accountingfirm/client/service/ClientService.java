package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
import com.gwhaitech.accountingfirm.client.dto.CreateClientRequest;
import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;
import com.gwhaitech.accountingfirm.client.exception.ClientAccessDeniedException;
import com.gwhaitech.accountingfirm.client.exception.ClientEmailAlreadyExistsException;
import com.gwhaitech.accountingfirm.client.exception.ClientEmailNotRegisteredException;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final UserRepository userRepository;

    public ClientService(ClientRepository clientRepository, UserRepository userRepository) {
        this.clientRepository = clientRepository;
        this.userRepository = userRepository;
    }

    public ClientDto createClient(CreateClientRequest request, Long adminId) {
        String email = request.email();
        if (userRepository.findByEmail(email).isEmpty()) {
            throw new ClientEmailNotRegisteredException(email);
        }
        if (!clientRepository.findByEmailIgnoreCaseOrderById(email).isEmpty()) {
            throw new ClientEmailAlreadyExistsException(email);
        }
        Client client = new Client();
        client.setName(request.name());
        client.setEmail(email);
        client.setPhone(request.phone());
        client.setAdminId(adminId);
        return toDto(clientRepository.save(client));
    }

    public List<ClientDto> findAll(Long adminId) {
        return clientRepository.findByAdminId(adminId).stream()
                .map(this::toDto)
                .toList();
    }

    public ClientDto findById(Long id, Long adminId) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ClientNotFoundException(id));
        if (!client.getAdminId().equals(adminId)) {
            throw new ClientAccessDeniedException(id);
        }
        return toDto(client);
    }

    public ClientDto updateClient(Long id, UpdateClientRequest request, Long adminId) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ClientNotFoundException(id));
        if (!client.getAdminId().equals(adminId)) {
            throw new ClientAccessDeniedException(id);
        }
        client.setName(request.name());
        client.setEmail(request.email());
        client.setPhone(request.phone());
        return toDto(clientRepository.save(client));
    }

    public void deleteClient(Long id, Long adminId) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ClientNotFoundException(id));
        if (!client.getAdminId().equals(adminId)) {
            throw new ClientAccessDeniedException(id);
        }
        clientRepository.delete(client);
    }

    private ClientDto toDto(Client c) {
        return new ClientDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getCreatedAt(), c.getUserId(), c.getAdminId());
    }
}
