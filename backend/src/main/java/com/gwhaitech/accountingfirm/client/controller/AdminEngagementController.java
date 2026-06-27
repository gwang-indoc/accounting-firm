package com.gwhaitech.accountingfirm.client.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.dto.EngagementDashboardDto;
import com.gwhaitech.accountingfirm.client.service.ClientEngagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/engagements")
public class AdminEngagementController {

    private final ClientEngagementService engagementService;

    public AdminEngagementController(ClientEngagementService engagementService) {
        this.engagementService = engagementService;
    }

    @GetMapping
    public ResponseEntity<List<EngagementDashboardDto>> listAll(Authentication authentication) {
        Long adminId = ((User) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(engagementService.listAll(adminId));
    }
}
