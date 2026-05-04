package com.gwhaitech.accountingfirm.auth.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UserEntityTest {

    @Autowired
    private TestEntityManager em;

    @Test
    void persistAndRetrieveUser() {
        User user = new User();
        user.setEmail("test@example.com");
        user.setName("Test User");
        user.setGoogleSub("google-sub-123");
        user.setRole("USER");

        User saved = em.persistFlushFind(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("test@example.com");
        assertThat(saved.getGoogleSub()).isEqualTo("google-sub-123");
        assertThat(saved.getCreatedAt()).isNotNull();
    }
}
