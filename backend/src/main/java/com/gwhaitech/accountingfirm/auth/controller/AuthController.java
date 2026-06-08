package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtCookieHelper;
import com.gwhaitech.accountingfirm.common.dto.UserDto;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtCookieHelper jwtCookieHelper;
    private final UserRepository userRepository;

    public AuthController(JwtCookieHelper jwtCookieHelper, UserRepository userRepository) {
        this.jwtCookieHelper = jwtCookieHelper;
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(new UserDto(user.getId(), user.getEmail(), user.getName(), user.getRole(), user.getLanguage()));
    }

    @PatchMapping("/me/language")
    public ResponseEntity<Void> updateLanguage(@AuthenticationPrincipal User user,
                                               @RequestBody Map<String, String> body) {
        if (user == null) return ResponseEntity.status(401).build();
        user.setLanguage(body.get("language"));
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addCookie(jwtCookieHelper.clearJwtCookie());
        return ResponseEntity.ok().build();
    }

}

