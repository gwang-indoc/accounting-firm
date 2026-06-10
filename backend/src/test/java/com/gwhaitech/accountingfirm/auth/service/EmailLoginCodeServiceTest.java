package com.gwhaitech.accountingfirm.auth.service;

import com.gwhaitech.accountingfirm.auth.domain.EmailLoginCode;
import com.gwhaitech.accountingfirm.auth.domain.EmailLoginCodeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailLoginCodeServiceTest {

    @Mock
    private EmailLoginCodeRepository repo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private EmailLoginCodeService service;

    // ---- generateAndStore tests ----

    @Test
    void generateAndStore_returnsSixDigitZeroPaddedCode() {
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String code = service.generateAndStore("a@test.com");

        assertThat(code).matches("\\d{6}");
    }

    @Test
    void generateAndStore_storesHashNotPlaintext() {
        when(passwordEncoder.encode(anyString())).thenReturn("bcrypt-hash");
        ArgumentCaptor<EmailLoginCode> captor = ArgumentCaptor.forClass(EmailLoginCode.class);
        when(repo.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        String code = service.generateAndStore("b@test.com");

        EmailLoginCode saved = captor.getValue();
        assertThat(saved.getCodeHash()).isEqualTo("bcrypt-hash");
        assertThat(saved.getCodeHash()).isNotEqualTo(code);
    }

    @Test
    void generateAndStore_setsExpiryTenMinutesFromNow() {
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        ArgumentCaptor<EmailLoginCode> captor = ArgumentCaptor.forClass(EmailLoginCode.class);
        when(repo.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        service.generateAndStore("c@test.com");

        LocalDateTime expiry = captor.getValue().getExpiresAt();
        assertThat(expiry).isBetween(
            LocalDateTime.now().plusMinutes(9),
            LocalDateTime.now().plusMinutes(11)
        );
    }

    // ---- verify tests ----

    @Test
    void verify_returnsTrueAndMarksConsumedOnCorrectCode() {
        EmailLoginCode row = activeRow("d@test.com", "hash");
        when(repo.findLatestActive(eq("d@test.com"), any())).thenReturn(Optional.of(row));
        when(passwordEncoder.matches("123456", "hash")).thenReturn(true);

        boolean result = service.verify("d@test.com", "123456");

        assertThat(result).isTrue();
        assertThat(row.getConsumedAt()).isNotNull();
        verify(repo).save(row);
    }

    @Test
    void verify_returnsFalseAndIncrementsAttemptsOnWrongCode() {
        EmailLoginCode row = activeRow("e@test.com", "hash");
        when(repo.findLatestActive(eq("e@test.com"), any())).thenReturn(Optional.of(row));
        when(passwordEncoder.matches("000000", "hash")).thenReturn(false);

        boolean result = service.verify("e@test.com", "000000");

        assertThat(result).isFalse();
        assertThat(row.getAttempts()).isEqualTo(1);
        verify(repo).save(row);
    }

    @Test
    void verify_returnsFalseWhenNoActiveRowExists() {
        when(repo.findLatestActive(eq("f@test.com"), any())).thenReturn(Optional.empty());

        boolean result = service.verify("f@test.com", "123456");

        assertThat(result).isFalse();
    }

    @Test
    void verify_returnsFalseAndDoesNotConsumeWhenAttemptsReachFive() {
        EmailLoginCode row = activeRow("g@test.com", "hash");
        row.setAttempts(5);
        when(repo.findLatestActive(eq("g@test.com"), any())).thenReturn(Optional.of(row));

        boolean result = service.verify("g@test.com", "123456");

        assertThat(result).isFalse();
        // even with correct code, row is dead — no save
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    // helper
    private EmailLoginCode activeRow(String email, String hash) {
        EmailLoginCode row = new EmailLoginCode();
        row.setEmail(email);
        row.setCodeHash(hash);
        row.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        return row;
    }
}
