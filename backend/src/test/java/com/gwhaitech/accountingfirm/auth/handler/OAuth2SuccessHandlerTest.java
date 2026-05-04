package com.gwhaitech.accountingfirm.auth.handler;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OAuth2SuccessHandlerTest {

    private UserRepository mockUserRepo;
    private JwtService mockJwtService;
    private HttpServletRequest mockRequest;
    private HttpServletResponse mockResponse;
    private OAuth2SuccessHandler handler;

    private OAuth2AuthenticationToken buildAuth() {
        Map<String, Object> attributes = Map.of(
            "sub", "google-sub-123",
            "email", "test@example.com",
            "name", "Test User"
        );
        OAuth2User oauthUser = new DefaultOAuth2User(
            List.of(new SimpleGrantedAuthority("ROLE_USER")),
            attributes,
            "sub"
        );
        return new OAuth2AuthenticationToken(oauthUser, oauthUser.getAuthorities(), "google");
    }

    @BeforeEach
    void setUp() {
        mockUserRepo = mock(UserRepository.class);
        mockJwtService = mock(JwtService.class);
        mockRequest = mock(HttpServletRequest.class);
        mockResponse = mock(HttpServletResponse.class);

        handler = new OAuth2SuccessHandler(
            mockUserRepo,
            mockJwtService,
            false,
            "http://localhost:4200/portal/dashboard",
            86400000L
        );
    }

    @Test
    void firstLogin_createsUserAndSetsCookie() throws Exception {
        when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setEmail("test@example.com");
        savedUser.setName("Test User");
        savedUser.setGoogleSub("google-sub-123");
        savedUser.setRole("USER");
        when(mockUserRepo.save(any(User.class))).thenReturn(savedUser);
        when(mockJwtService.issueToken(any(User.class))).thenReturn("test.jwt.token");

        handler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

        verify(mockUserRepo).save(any(User.class));

        ArgumentCaptor<Cookie> cookieCaptor = ArgumentCaptor.forClass(Cookie.class);
        verify(mockResponse).addCookie(cookieCaptor.capture());
        Cookie cookie = cookieCaptor.getValue();
        assertThat(cookie.getName()).isEqualTo("jwt");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/");

        verify(mockResponse).sendRedirect("http://localhost:4200/portal/dashboard");
    }

    @Test
    void returningUser_updatesAndSetsCookie() throws Exception {
        User existingUser = new User();
        existingUser.setId(1L);
        existingUser.setEmail("old@example.com");
        existingUser.setName("Old Name");
        existingUser.setGoogleSub("google-sub-123");
        existingUser.setRole("USER");

        when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.of(existingUser));

        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setEmail("test@example.com");
        savedUser.setName("Test User");
        savedUser.setGoogleSub("google-sub-123");
        savedUser.setRole("USER");
        when(mockUserRepo.save(any(User.class))).thenReturn(savedUser);
        when(mockJwtService.issueToken(any(User.class))).thenReturn("test.jwt.token");

        handler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(mockUserRepo).save(userCaptor.capture());
        User captured = userCaptor.getValue();
        assertThat(captured.getName()).isEqualTo("Test User");
        assertThat(captured.getEmail()).isEqualTo("test@example.com");
    }
}
