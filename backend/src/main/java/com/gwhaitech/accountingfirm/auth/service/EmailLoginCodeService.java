package com.gwhaitech.accountingfirm.auth.service;

import com.gwhaitech.accountingfirm.auth.domain.EmailLoginCode;
import com.gwhaitech.accountingfirm.auth.domain.EmailLoginCodeRepository;
import com.gwhaitech.accountingfirm.auth.exception.RateLimitException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class EmailLoginCodeService {

    private final EmailLoginCodeRepository repo;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public EmailLoginCodeService(EmailLoginCodeRepository repo, PasswordEncoder passwordEncoder) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public String generateAndStore(String email) {
        LocalDateTime now = LocalDateTime.now();
        if (repo.existsByEmailAndCreatedAtAfter(email, now.minusSeconds(60))) {
            throw new RateLimitException("cooldown");
        }
        if (repo.countByEmailAndCreatedAtAfter(email, now.minusHours(1)) >= 5) {
            throw new RateLimitException("hourly cap");
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        EmailLoginCode record = new EmailLoginCode();
        record.setEmail(email);
        record.setCodeHash(passwordEncoder.encode(code));
        record.setExpiresAt(now.plusMinutes(10));
        repo.save(record);
        return code;
    }

    @Transactional
    public boolean verify(String email, String code) {
        LocalDateTime now = LocalDateTime.now();
        Optional<EmailLoginCode> opt = repo.findLatestActive(email, now);
        if (opt.isEmpty()) return false;

        EmailLoginCode row = opt.get();
        if (row.getAttempts() >= 5) return false;

        if (!passwordEncoder.matches(code, row.getCodeHash())) {
            row.setAttempts(row.getAttempts() + 1);
            repo.save(row);
            return false;
        }

        row.setConsumedAt(now);
        repo.save(row);
        return true;
    }
}
