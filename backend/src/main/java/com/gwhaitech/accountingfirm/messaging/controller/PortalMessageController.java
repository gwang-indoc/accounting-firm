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
    public ResponseEntity<MessageThreadDto> create(@Valid @RequestBody NewThreadRequest req,
                                                    Authentication auth) {
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
