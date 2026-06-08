package com.gwhaitech.accountingfirm.auth.handler;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.JwtCookieHelper;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.UserClientLinkService;
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
    private final JwtCookieHelper jwtCookieHelper;
    private final UserClientLinkService userClientLinkService;
    private final String adminRedirectUri;
    private final String userRedirectUri;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            JwtService jwtService,
            JwtCookieHelper jwtCookieHelper,
            UserClientLinkService userClientLinkService,
            @Value("${app.oauth2.redirect-uri.admin:http://localhost:4200/admin/clients}") String adminRedirectUri,
            @Value("${app.oauth2.redirect-uri.user:http://localhost:4200/portal/dashboard}") String userRedirectUri) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.jwtCookieHelper = jwtCookieHelper;
        this.userClientLinkService = userClientLinkService;
        this.adminRedirectUri = adminRedirectUri;
        this.userRedirectUri = userRedirectUri;
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
        response.addCookie(jwtCookieHelper.buildJwtCookie(token));

        String target = "ADMIN".equals(user.getRole()) ? adminRedirectUri : userRedirectUri;
        response.sendRedirect(target);
    }
}
