package com.gwhaitech.accountingfirm.auth.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class UserEntityTest {

    @Autowired
    private TestEntityManager em;

    @Autowired
    private UserRepository userRepository;

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

    @Test
    void savesUserWithNullGoogleSub() {
        User user = new User();
        user.setEmail("nooauth@test.com");
        user.setName("No OAuth");
        user.setGoogleSub(null);
        // Should persist without error
        User saved = userRepository.save(user);
        assertThat(saved.getId()).isNotNull();
    }

}
