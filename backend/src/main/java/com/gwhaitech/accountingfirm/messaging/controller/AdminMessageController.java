package com.gwhaitech.accountingfirm.messaging.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.service.ClientService;
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
    private final ClientService clientService;

    public AdminMessageController(MessagingService service, ClientService clientService) {
        this.service = service;
        this.clientService = clientService;
    }

    @GetMapping("/{clientId}/threads")
    public List<MessageThreadSummaryDto> listThreads(@PathVariable Long clientId, Authentication auth) {
        clientService.findById(clientId, resolveAdminId(auth));
        return service.listAdminThreads(clientId);
    }

    @PostMapping("/{clientId}/threads")
    public ResponseEntity<MessageThreadDto> createThread(@PathVariable Long clientId,
                                                         @Valid @RequestBody NewThreadRequest req,
                                                         Authentication auth) {
        long adminId = resolveAdminId(auth);
        clientService.findById(clientId, adminId);
        return ResponseEntity.status(201).body(
            service.createThreadAsAdmin(clientId, req.subject(), req.body(), adminId));
    }

    @GetMapping("/{clientId}/threads/{threadId}")
    public MessageThreadDto getThread(@PathVariable Long clientId, @PathVariable Long threadId,
                                      Authentication auth) {
        clientService.findById(clientId, resolveAdminId(auth));
        return service.getThreadAsAdmin(clientId, threadId);
    }

    @PostMapping("/{clientId}/threads/{threadId}/messages")
    public ResponseEntity<MessageDto> postReply(@PathVariable Long clientId,
                                                @PathVariable Long threadId,
                                                @Valid @RequestBody NewMessageRequest req,
                                                Authentication auth) {
        long adminId = resolveAdminId(auth);
        clientService.findById(clientId, adminId);
        return ResponseEntity.status(201).body(
            service.postAdminReply(clientId, threadId, req.body(), adminId));
    }

    @GetMapping("/unread-counts")
    public List<ClientUnreadCountDto> unreadCounts() {
        return service.getAdminUnreadCounts();
    }

    private long resolveAdminId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof User u && u.getId() != null) return u.getId();
        throw new IllegalStateException("Authenticated user not resolvable");
    }
}
