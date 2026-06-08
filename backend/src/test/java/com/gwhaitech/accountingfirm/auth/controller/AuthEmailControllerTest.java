package com.gwhaitech.accountingfirm.auth.controller;

import com.gwhaitech.accountingfirm.auth.domain.EmailLoginCodeRepository;
import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.EmailLoginCodeService;
import com.gwhaitech.accountingfirm.auth.service.JwtCookieHelper;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthEmailController.class)
@Import(AuthEmailControllerTest.TestSecurityConfig.class)
class AuthEmailControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmailLoginCodeService emailLoginCodeService;

    @MockitoBean
    private JavaMailSender mailSender;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private EmailLoginCodeRepository emailLoginCodeRepository;

    @MockitoBean
    private UserClientLinkService userClientLinkService;

    @MockitoBean
    private JwtCookieHelper jwtCookieHelper;

    @BeforeEach
    void setUpCookieMock() {
        when(jwtCookieHelper.buildJwtCookie(anyString())).thenAnswer(inv -> {
            Cookie c = new Cookie("jwt", inv.getArgument(0));
            c.setHttpOnly(true); c.setPath("/"); c.setMaxAge(86400);
            return c;
        });
    }

    private User existingUser() {
        User u = new User();
        u.setId(1L); u.setEmail("existing@example.com");
        u.setName("Existing User"); u.setRole("USER");
        return u;
    }

    // ---- request-code tests ----

    @Test
    void requestCode_knownEmail_returns200UniformBodyAndSendsEmail() throws Exception {
        when(emailLoginCodeService.generateAndStore("known@example.com")).thenReturn("123456");
        doNothing().when(mailSender).send(any(org.springframework.mail.SimpleMailMessage.class));

        mockMvc.perform(post("/api/auth/email/request-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"known@example.com"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("code_sent"));

        verify(emailLoginCodeService).generateAndStore("known@example.com");
        verify(mailSender).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    @Test
    void requestCode_unknownEmail_returns200SameBodyAndSendsEmail() throws Exception {
        when(emailLoginCodeService.generateAndStore("unknown@example.com")).thenReturn("654321");
        doNothing().when(mailSender).send(any(org.springframework.mail.SimpleMailMessage.class));

        mockMvc.perform(post("/api/auth/email/request-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"unknown@example.com"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("code_sent"));
    }

    @Test
    void requestCode_cooldownActive_returns429AndNoEmailSent() throws Exception {
        when(emailLoginCodeService.generateAndStore(anyString()))
                .thenThrow(new com.gwhaitech.accountingfirm.auth.exception.RateLimitException("cooldown"));

        mockMvc.perform(post("/api/auth/email/request-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"rate@example.com"}
                        """))
                .andExpect(status().isTooManyRequests());

        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    @Test
    void requestCode_hourlyCap_returns429AndNoEmailSent() throws Exception {
        when(emailLoginCodeService.generateAndStore(anyString()))
                .thenThrow(new com.gwhaitech.accountingfirm.auth.exception.RateLimitException("hourly cap"));

        mockMvc.perform(post("/api/auth/email/request-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"cap@example.com"}
                        """))
                .andExpect(status().isTooManyRequests());

        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    @Test
    void requestCode_mailSenderThrows_returns502() throws Exception {
        when(emailLoginCodeService.generateAndStore(anyString())).thenReturn("000000");
        doThrow(new MailSendException("smtp down"))
                .when(mailSender).send(any(org.springframework.mail.SimpleMailMessage.class));

        mockMvc.perform(post("/api/auth/email/request-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"fail@example.com"}
                        """))
                .andExpect(status().isBadGateway());
    }

    // ---- verify-code tests ----

    @Test
    void verifyCode_existingUser_returns200AuthenticatedWithCookieAndLinksUser() throws Exception {
        User user = existingUser();
        when(emailLoginCodeService.verify("existing@example.com", "123456")).thenReturn(true);
        when(userRepository.findByEmail("existing@example.com")).thenReturn(Optional.of(user));
        when(jwtService.issueToken(user)).thenReturn("test-jwt-token");

        mockMvc.perform(post("/api/auth/email/verify-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"existing@example.com","code":"123456"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("authenticated"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.containsString("jwt=test-jwt-token")));

        verify(userClientLinkService).linkIfPossible(user);
    }

    @Test
    void verifyCode_unknownEmail_returns200SignupRequiredWithTokenAndNoCookie() throws Exception {
        when(emailLoginCodeService.verify("new@example.com", "999999")).thenReturn(true);
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(jwtService.issueSignupToken("new@example.com")).thenReturn("signup.jwt.token");

        mockMvc.perform(post("/api/auth/email/verify-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"new@example.com","code":"999999"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("signup_required"))
                .andExpect(jsonPath("$.signupToken").value("signup.jwt.token"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));

        verify(userRepository, never()).save(any());
    }

    @Test
    void verifyCode_wrongCode_returns401() throws Exception {
        when(emailLoginCodeService.verify(anyString(), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/auth/email/verify-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"someone@example.com","code":"000000"}
                        """))
                .andExpect(status().isUnauthorized());
    }

    // ---- complete-signup tests ----

    @Test
    void completeSignup_validTokenAndName_creates201AndSetsCookieAndLinks() throws Exception {
        when(jwtService.validateSignupToken("valid.signup.token")).thenReturn("new@example.com");
        User savedUser = new User();
        savedUser.setId(99L); savedUser.setEmail("new@example.com");
        savedUser.setName("Alice Smith"); savedUser.setRole("USER");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.issueToken(savedUser)).thenReturn("session.jwt.token");

        mockMvc.perform(post("/api/auth/email/complete-signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"signupToken":"valid.signup.token","name":"Alice Smith"}
                        """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.containsString("jwt=session.jwt.token")));

        verify(userRepository).save(any(User.class));
        verify(userClientLinkService).linkIfPossible(savedUser);
    }

    @Test
    void completeSignup_blankName_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/email/complete-signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"signupToken":"valid.signup.token","name":""}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void completeSignup_invalidToken_returns401() throws Exception {
        when(jwtService.validateSignupToken("bad.token"))
                .thenThrow(new io.jsonwebtoken.JwtException("invalid"));

        mockMvc.perform(post("/api/auth/email/complete-signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"signupToken":"bad.token","name":"Alice"}
                        """))
                .andExpect(status().isUnauthorized());
    }
}
