package com.gwhaitech.accountingfirm.auth.handler;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final UserClientLinkService userClientLinkService;
    private final boolean cookieSecure;
    private final String redirectUri;
    private final long expirationMs;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            JwtService jwtService,
            UserClientLinkService userClientLinkService,
            @Value("${app.cookie.secure:true}") boolean cookieSecure,
            @Value("${app.oauth2.redirect-uri:http://localhost:4200/portal/dashboard}") String redirectUri,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.userClientLinkService = userClientLinkService;
        this.cookieSecure = cookieSecure;
        this.redirectUri = redirectUri;
        this.expirationMs = expirationMs;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = oauthToken.getPrincipal();

        String googleSub = oauthUser.getAttribute("sub");
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");

        User user = userRepository.findByGoogleSub(googleSub).orElseGet(User::new);
        user.setGoogleSub(googleSub);
        user.setEmail(email);
        user.setName(name);
        if (user.getRole() == null) {
            user.setRole("USER");
        }
        user = userRepository.save(user);
        userClientLinkService.linkIfPossible(user);

        String token = jwtService.issueToken(user);

        Cookie cookie = new Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setSecure(cookieSecure);
        cookie.setMaxAge((int) (expirationMs / 1000));
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);

        response.sendRedirect(redirectUri);
    }
}
