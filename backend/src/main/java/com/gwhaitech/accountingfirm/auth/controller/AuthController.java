package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.dto.LoginRequest;
import com.gwhaitech.accountingfirm.auth.dto.RegisterRequest;
import com.gwhaitech.accountingfirm.auth.exception.EmailAlreadyRegisteredException;
import com.gwhaitech.accountingfirm.auth.service.AuthService;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.common.dto.UserDto;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(new UserDto(user.getId(), user.getEmail(), user.getName(), user.getRole()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addCookie(buildJwtCookie("", 0));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<Void> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        User user = authService.login(request);
        response.addCookie(buildJwtCookie(jwtService.issueToken(user), jwtService.expirationSeconds()));
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ResponseEntity<Void> handleDuplicate() {
        return ResponseEntity.status(HttpStatus.CONFLICT).build();
    }

    private Cookie buildJwtCookie(String value, int maxAge) {
        Cookie cookie = new Cookie("jwt", value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setSecure(cookieSecure);
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        return cookie;
    }
}
