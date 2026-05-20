package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
import com.gwhaitech.accountingfirm.client.dto.CreateClientRequest;
import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClientService {

    private final ClientRepository clientRepository;

    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    public ClientDto createClient(CreateClientRequest request) {
        Client client = new Client();
        client.setName(request.name());
        client.setEmail(request.email());
        client.setPhone(request.phone());
        return toDto(clientRepository.save(client));
    }

    public List<ClientDto> findAll() {
        return clientRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public ClientDto findById(Long id) {
        return clientRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ClientNotFoundException(id));
    }

    private ClientDto toDto(Client c) {
        return new ClientDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getCreatedAt(), c.getUserId());
    }
}
