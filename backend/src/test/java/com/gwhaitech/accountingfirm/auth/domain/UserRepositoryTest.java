package com.gwhaitech.accountingfirm.auth.domain;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class UserRepositoryTest {

    @Autowired
    private TestEntityManager em;

    @Test
    void rejectsUserWithNullName() {
        User user = new User();
        user.setEmail("nonullname@example.com");
        user.setName(null);

        assertThatThrownBy(() -> { em.persist(user); em.flush(); })
                .isInstanceOf(Exception.class);
    }
}
