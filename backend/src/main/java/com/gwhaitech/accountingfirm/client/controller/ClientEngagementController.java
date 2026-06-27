package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.CreateEngagementRequest;
import com.gwhaitech.accountingfirm.client.dto.EngagementDto;
import com.gwhaitech.accountingfirm.client.dto.EngagementHistoryDto;
import com.gwhaitech.accountingfirm.client.dto.TransitionStatusRequest;
import com.gwhaitech.accountingfirm.client.service.ClientEngagementService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/clients/{clientId}/engagements")
public class ClientEngagementController {

    private final ClientEngagementService engagementService;

    public ClientEngagementController(ClientEngagementService engagementService) {
        this.engagementService = engagementService;
    }

    @PostMapping
    public ResponseEntity<EngagementDto> create(@PathVariable Long clientId,
                                                @Valid @RequestBody CreateEngagementRequest request,
                                                Authentication authentication) {
        EngagementDto dto = engagementService.createEngagement(clientId, request.taxYear(), request.name(), adminId(authentication));
        return ResponseEntity.status(201).body(dto);
    }

    @GetMapping
    public ResponseEntity<List<EngagementDto>> list(@PathVariable Long clientId,
                                                    Authentication authentication) {
        return ResponseEntity.ok(engagementService.listForClient(clientId, adminId(authentication)));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<EngagementHistoryDto>> history(@PathVariable Long clientId,
                                                              @PathVariable Long id,
                                                              Authentication authentication) {
        return ResponseEntity.ok(engagementService.getHistory(clientId, id, adminId(authentication)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<EngagementDto> transition(@PathVariable Long clientId,
                                                    @PathVariable Long id,
                                                    @Valid @RequestBody TransitionStatusRequest request,
                                                    Authentication authentication) {
        EngagementDto dto = engagementService.transitionStatus(
                clientId, id, request.status(), request.note(), adminId(authentication));
        return ResponseEntity.ok(dto);
    }

    private Long adminId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
