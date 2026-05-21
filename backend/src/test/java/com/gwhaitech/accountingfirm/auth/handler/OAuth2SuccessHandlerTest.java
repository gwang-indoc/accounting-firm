package com.gwhaitech.accountingfirm.auth.handler;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
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
    private UserClientLinkService mockLinkService;
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
        mockLinkService = mock(UserClientLinkService.class);
        mockRequest = mock(HttpServletRequest.class);
        mockResponse = mock(HttpServletResponse.class);

        handler = new OAuth2SuccessHandler(
            mockUserRepo,
            mockJwtService,
            mockLinkService,
            false,
            "http://localhost:4200/admin/clients",
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
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
        assertThat(cookie.getMaxAge()).isGreaterThan(0);

        verify(mockResponse).sendRedirect("http://localhost:4200/portal/dashboard");
        verify(mockLinkService).linkIfPossible(any(User.class));
    }

    @Test
    void linkIfPossibleIsCalledAfterSave() throws Exception {
        when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());

        User savedUser = new User();
        savedUser.setId(42L);
        savedUser.setEmail("test@example.com");
        savedUser.setName("Test User");
        savedUser.setGoogleSub("google-sub-123");
        savedUser.setRole("USER");
        when(mockUserRepo.save(any(User.class))).thenReturn(savedUser);
        when(mockJwtService.issueToken(any(User.class))).thenReturn("test.jwt.token");

        handler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

        org.mockito.InOrder inOrder = org.mockito.Mockito.inOrder(mockUserRepo, mockLinkService);
        inOrder.verify(mockUserRepo).save(any(User.class));
        inOrder.verify(mockLinkService).linkIfPossible(any(User.class));
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

    @Test
    void adminUser_redirectsToAdminClients() throws Exception {
        OAuth2SuccessHandler adminHandler = new OAuth2SuccessHandler(
            mockUserRepo, mockJwtService, mockLinkService,
            false,
            "http://localhost:4200/admin/clients",
            "http://localhost:4200/portal/dashboard",
            86400000L
        );

        User adminUser = new User();
        adminUser.setId(1L); adminUser.setGoogleSub("google-sub-123");
        adminUser.setEmail("admin@firm.com"); adminUser.setName("Admin");
        adminUser.setRole("ADMIN");
        when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());
        when(mockUserRepo.save(any(User.class))).thenReturn(adminUser);
        when(mockJwtService.issueToken(any(User.class))).thenReturn("jwt.token");

        adminHandler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

        verify(mockResponse).sendRedirect("http://localhost:4200/admin/clients");
    }

    @Test
    void userRole_redirectsToPortalDashboard() throws Exception {
        OAuth2SuccessHandler userHandler = new OAuth2SuccessHandler(
            mockUserRepo, mockJwtService, mockLinkService,
            false,
            "http://localhost:4200/admin/clients",
            "http://localhost:4200/portal/dashboard",
            86400000L
        );

        User normalUser = new User();
        normalUser.setId(2L); normalUser.setGoogleSub("google-sub-123");
        normalUser.setEmail("test@example.com"); normalUser.setName("Test User");
        normalUser.setRole("USER");
        when(mockUserRepo.findByGoogleSub("google-sub-123")).thenReturn(Optional.empty());
        when(mockUserRepo.save(any(User.class))).thenReturn(normalUser);
        when(mockJwtService.issueToken(any(User.class))).thenReturn("jwt.token");

        userHandler.onAuthenticationSuccess(mockRequest, mockResponse, buildAuth());

        verify(mockResponse).sendRedirect("http://localhost:4200/portal/dashboard");
    }
}
