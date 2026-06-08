package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.dto.UserNameDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class UserLookupController {

    private final UserRepository userRepository;

    public UserLookupController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/lookup")
    public ResponseEntity<UserNameDto> lookup(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(new UserNameDto(user.getName())))
                .orElse(ResponseEntity.notFound().build());
    }
}
