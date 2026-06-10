package com.gwhaitech.accountingfirm.client.service;

import com.gwhaitech.accountingfirm.auth.domain.User;
import com.gwhaitech.accountingfirm.client.domain.Client;
import com.gwhaitech.accountingfirm.client.domain.ClientRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserClientLinkService {

    private static final Logger log = LoggerFactory.getLogger(UserClientLinkService.class);

    private final ClientRepository clientRepository;

    public UserClientLinkService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    @Transactional
    public void linkIfPossible(User user) {
        if (user.getId() == null) {
            return;
        }
        if (clientRepository.findByUserId(user.getId()).isPresent()) {
            return; // already linked
        }
        String email = user.getEmail();
        if (email == null || email.isBlank()) {
            return;
        }

        List<Client> matches = clientRepository.findByEmailIgnoreCaseOrderById(email);
        if (matches.isEmpty()) {
            return;
        }

        Optional<Client> unlinked = matches.stream()
                .filter(c -> c.getUserId() == null)
                .findFirst();

        if (unlinked.isEmpty()) {
            log.warn("User id={} email={} matches {} client(s) but all are already linked to other users; not linking",
                    user.getId(), email, matches.size());
            return;
        }

        long unlinkedCount = matches.stream().filter(c -> c.getUserId() == null).count();
        if (unlinkedCount > 1) {
            log.warn("User id={} email={} matches {} unlinked client(s); linking to lowest id={}",
                    user.getId(), email, unlinkedCount, unlinked.get().getId());
        }

        Client target = unlinked.get();
        target.setUserId(user.getId());
        clientRepository.save(target);
    }
}
