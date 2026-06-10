package com.gwhaitech.accountingfirm.client.domain;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.auth.domain.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/accounting_firm",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class ClientDocumentEntityTest {

    @Autowired
    private ClientDocumentRepository clientDocumentRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void persistAndRetrieveClientDocument() {
        User user = new User();
        user.setEmail("uploader@example.com");
        user.setName("Uploader");
        user.setRole("USER");
        User savedUser = userRepository.save(user);

        Client client = new Client();
        client.setName("Test Corp");
        client.setEmail("testcorp@example.com");
        client.setAdminId(savedUser.getId());
        Client savedClient = clientRepository.save(client);

        ClientDocument doc = new ClientDocument();
        doc.setClientId(savedClient.getId());
        doc.setYear((short) 2025);
        doc.setFilename("tax.pdf");
        doc.setFilePath("clients/1/2025/tax.pdf");
        doc.setMimeType("application/pdf");
        doc.setSizeBytes(1024L);
        doc.setUploadedBy(savedUser.getId());

        ClientDocument saved = clientDocumentRepository.saveAndFlush(doc);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getClientId()).isEqualTo(savedClient.getId());
        assertThat(saved.getYear()).isEqualTo((short) 2025);
        assertThat(saved.getFilename()).isEqualTo("tax.pdf");
        assertThat(saved.getFilePath()).isEqualTo("clients/1/2025/tax.pdf");
        assertThat(saved.getMimeType()).isEqualTo("application/pdf");
        assertThat(saved.getSizeBytes()).isEqualTo(1024L);
        assertThat(saved.getUploadedBy()).isEqualTo(savedUser.getId());
        assertThat(saved.getUploadedAt()).isNotNull();
    }

    @Test
    void duplicateFilenameForSameClientAndYear_throwsConstraintViolation() {
        User user = new User();
        user.setEmail("uploader2@example.com");
        user.setName("Uploader2");
        user.setRole("USER");
        User savedUser = userRepository.save(user);

        Client client = new Client();
        client.setName("Dupe Corp");
        client.setEmail("dupecorp@example.com");
        client.setAdminId(savedUser.getId());
        Client savedClient = clientRepository.save(client);

        ClientDocument doc1 = new ClientDocument();
        doc1.setClientId(savedClient.getId());
        doc1.setYear((short) 2025);
        doc1.setFilename("tax.pdf");
        doc1.setFilePath("clients/1/2025/tax.pdf");
        doc1.setUploadedBy(savedUser.getId());
        clientDocumentRepository.saveAndFlush(doc1);

        ClientDocument doc2 = new ClientDocument();
        doc2.setClientId(savedClient.getId());
        doc2.setYear((short) 2025);
        doc2.setFilename("tax.pdf");
        doc2.setFilePath("clients/1/2025/tax_copy.pdf");
        doc2.setUploadedBy(savedUser.getId());

        assertThatThrownBy(() -> clientDocumentRepository.saveAndFlush(doc2))
                .isInstanceOfAny(DataIntegrityViolationException.class,
                        jakarta.persistence.PersistenceException.class);
    }
}
