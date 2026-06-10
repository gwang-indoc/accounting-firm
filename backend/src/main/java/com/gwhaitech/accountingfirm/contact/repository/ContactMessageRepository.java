package com.gwhaitech.accountingfirm.contact.repository;

import com.gwhaitech.accountingfirm.contact.domain.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
}
