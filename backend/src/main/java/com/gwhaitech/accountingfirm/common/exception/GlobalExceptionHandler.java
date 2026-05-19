package com.gwhaitech.accountingfirm.common.exception;

import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNameConflictException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import com.gwhaitech.accountingfirm.client.exception.PortalNotLinkedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ClientNotFoundException.class)
    public ResponseEntity<Void> handleClientNotFound(ClientNotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Void> handleDocumentNotFound(DocumentNotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(FileValidationException.class)
    public ResponseEntity<String> handleFileValidation(FileValidationException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body("File exceeds the maximum allowed upload size");
    }

    @ExceptionHandler(DocumentNameConflictException.class)
    public ResponseEntity<Map<String, Object>> handleNameConflict(DocumentNameConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", ex.getMessage(),
                "filename", ex.getFilename(),
                "year", ex.getYear()
        ));
    }

    @ExceptionHandler(PortalNotLinkedException.class)
    public ResponseEntity<Map<String, String>> handlePortalNotLinked(PortalNotLinkedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", ex.getMessage()
        ));
    }
}
