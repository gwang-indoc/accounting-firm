package com.gwhaitech.accountingfirm.common.exception;

import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsDocumentNameConflictTo409WithFilenameAndYear() {
        ResponseEntity<?> response = handler.handleNameConflict(
                new DocumentNameConflictException("T4.pdf", 2024));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().toString())
                .contains("T4.pdf")
                .contains("2024");
    }

    @Test
    void mapsPortalNotLinkedTo403() {
        ResponseEntity<?> response = handler.handlePortalNotLinked(
                new PortalNotLinkedException());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().toString())
                .contains("portal isn't set up");
    }
}
