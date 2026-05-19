package com.gwhaitech.accountingfirm.auth.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.dto.LoginRequest;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private UserClientLinkService linkService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        linkService = mock(UserClientLinkService.class);
        authService = new AuthService(userRepository, passwordEncoder, linkService);
    }

    @Test
    void login_invokesLinkIfPossibleAfterSuccessfulPasswordMatch() {
        User user = new User();
        user.setId(11L);
        user.setEmail("a@b.com");
        user.setPasswordHash(passwordEncoder.encode("pw"));
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));

        authService.login(new LoginRequest("a@b.com", "pw"));

        verify(linkService).linkIfPossible(user);
    }

    @Test
    void login_doesNotInvokeLinkIfPossibleWhenPasswordWrong() {
        User user = new User();
        user.setId(11L);
        user.setEmail("a@b.com");
        user.setPasswordHash(passwordEncoder.encode("correct"));
        when(userRepository.findByEmail("a@b.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("a@b.com", "wrong")))
            .isInstanceOf(ResponseStatusException.class);

        verify(linkService, never()).linkIfPossible(any());
    }

    @Test
    void login_doesNotInvokeLinkIfPossibleWhenUserMissing() {
        when(userRepository.findByEmail("nobody@x.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@x.com", "pw")))
            .isInstanceOf(ResponseStatusException.class);

        verify(linkService, never()).linkIfPossible(any());
    }
}
