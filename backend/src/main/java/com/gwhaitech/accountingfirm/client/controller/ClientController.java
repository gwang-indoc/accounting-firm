package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.ClientDto;
import com.gwhaitech.accountingfirm.client.dto.CreateClientRequest;
import com.gwhaitech.accountingfirm.client.dto.UpdateClientRequest;
import com.gwhaitech.accountingfirm.client.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @PostMapping
    public ResponseEntity<ClientDto> create(@Valid @RequestBody CreateClientRequest request,
                                            Authentication authentication) {
        return ResponseEntity.status(201).body(clientService.createClient(request, adminId(authentication)));
    }

    @GetMapping
    public ResponseEntity<List<ClientDto>> list(Authentication authentication) {
        return ResponseEntity.ok(clientService.findAll(adminId(authentication)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientDto> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(clientService.findById(id, adminId(authentication)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientDto> update(@PathVariable Long id,
                                            @Valid @RequestBody UpdateClientRequest request,
                                            Authentication authentication) {
        return ResponseEntity.ok(clientService.updateClient(id, request, adminId(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        clientService.deleteClient(id, adminId(authentication));
        return ResponseEntity.noContent().build();
    }

    private Long adminId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
