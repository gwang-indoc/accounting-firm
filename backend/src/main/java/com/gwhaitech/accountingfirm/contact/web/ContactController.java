package com.gwhaitech.accountingfirm.contact.web;

import com.gwhaitech.accountingfirm.contact.dto.ContactSubmissionRequest;
import com.gwhaitech.accountingfirm.contact.service.ClientIpResolver;
import com.gwhaitech.accountingfirm.contact.service.ContactService;
import com.gwhaitech.accountingfirm.contact.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final ContactService contactService;
    private final RateLimiter rateLimiter;

    public ContactController(ContactService contactService, RateLimiter rateLimiter) {
        this.contactService = contactService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping
    public ResponseEntity<Void> submit(
            @Valid @RequestBody ContactSubmissionRequest request,
            HttpServletRequest req) {

        if (request.companyUrl() != null && !request.companyUrl().isBlank()) {
            return ResponseEntity.ok().build();
        }

        String ip = ClientIpResolver.resolve(req);
        if (!rateLimiter.tryAcquire(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        contactService.submit(request, ip);
        return ResponseEntity.accepted().build();
    }
}
