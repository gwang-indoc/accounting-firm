package com.gwhaitech.accountingfirm.auth.filter;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import com.gwhaitech.accountingfirm.auth.service.AuthService;
import com.gwhaitech.accountingfirm.auth.service.JwtService;
import com.gwhaitech.accountingfirm.client.service.ClientService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.impl.DefaultClaims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@Import({JwtAuthFilterTest.TestSecurityConfig.class, JwtAuthFilter.class, JwtAuthFilterTest.TestController.class})
class JwtAuthFilterTest {

    @RestController
    static class TestController {
        @GetMapping("/test/protected")
        public String protectedEndpoint() {
            return "ok";
        }
    }

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
            http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, e) ->
                        res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    // satisfies AuthController constructor wiring in the WebMvcTest context
    @MockitoBean
    private AuthService authService;

    // satisfies ClientController constructor wiring in the WebMvcTest context
    @MockitoBean
    private ClientService clientService;

    @Test
    void validJwtCookie_setsAuthenticatedPrincipal() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setRole("USER");

        Claims claims = new DefaultClaims(Map.of("sub", "1", "role", "USER"));

        when(jwtService.validateToken(anyString())).thenReturn(claims);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/test/protected")
                .cookie(new Cookie("jwt", "valid-token")))
                .andExpect(status().isOk());
    }

    @Test
    void noCookie_returns401() throws Exception {
        mockMvc.perform(get("/test/protected"))
                .andExpect(status().isUnauthorized());
    }
}
