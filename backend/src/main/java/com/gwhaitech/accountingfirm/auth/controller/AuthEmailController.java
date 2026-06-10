package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.exception.RateLimitException;
import com.gwhaitech.accountingfirm.auth.service.EmailLoginCodeService;
import com.gwhaitech.accountingfirm.auth.service.JwtCookieHelper;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth/email")
public class AuthEmailController {

    private final EmailLoginCodeService emailLoginCodeService;
    private final JavaMailSender mailSender;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final JwtCookieHelper jwtCookieHelper;
    private final UserClientLinkService userClientLinkService;

    public AuthEmailController(EmailLoginCodeService emailLoginCodeService,
                               JavaMailSender mailSender,
                               UserRepository userRepository,
                               JwtService jwtService,
                               JwtCookieHelper jwtCookieHelper,
                               UserClientLinkService userClientLinkService) {
        this.emailLoginCodeService = emailLoginCodeService;
        this.mailSender = mailSender;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.jwtCookieHelper = jwtCookieHelper;
        this.userClientLinkService = userClientLinkService;
    }

    record RequestCodeRequest(@NotBlank @Email String email) {}
    record VerifyCodeRequest(@NotBlank @Email String email, @NotBlank String code) {}
    record CompleteSignupRequest(@NotBlank String signupToken, @NotBlank String name) {}

    @PostMapping("/request-code")
    public ResponseEntity<Map<String, String>> requestCode(@Valid @RequestBody RequestCodeRequest req) {
        String code;
        try {
            code = emailLoginCodeService.generateAndStore(req.email());
        } catch (RateLimitException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(req.email());
        message.setSubject("Your login code");
        message.setText("Your login code is: " + code + "\n\nThis code expires in 10 minutes.");

        try {
            mailSender.send(message);
        } catch (MailException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }

        return ResponseEntity.ok(Map.of("status", "code_sent"));
    }

    @PostMapping("/verify-code")
    public ResponseEntity<Map<String, Object>> verifyCode(@Valid @RequestBody VerifyCodeRequest req,
                                                          HttpServletResponse response) {
        boolean verified = emailLoginCodeService.verify(req.email(), req.code());
        if (!verified) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<User> existing = userRepository.findByEmail(req.email());
        if (existing.isPresent()) {
            User user = existing.get();
            String token = jwtService.issueToken(user);
            response.addCookie(jwtCookieHelper.buildJwtCookie(token));
            userClientLinkService.linkIfPossible(user);
            return ResponseEntity.ok(Map.of("status", "authenticated"));
        }

        String signupToken = jwtService.issueSignupToken(req.email());
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("status", "signup_required");
        body.put("signupToken", signupToken);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/complete-signup")
    public ResponseEntity<Void> completeSignup(@Valid @RequestBody CompleteSignupRequest req,
                                               HttpServletResponse response) {
        String email;
        try {
            email = jwtService.validateSignupToken(req.signupToken());
        } catch (io.jsonwebtoken.JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = new User();
        user.setEmail(email);
        user.setName(req.name().trim());
        user.setRole("USER");
        user = userRepository.save(user);

        String token = jwtService.issueToken(user);
        response.addCookie(jwtCookieHelper.buildJwtCookie(token));
        userClientLinkService.linkIfPossible(user);
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<Void> handleRateLimit() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
    }
}
