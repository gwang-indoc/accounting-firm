package com.gwhaitech.accountingfirm.common.exception;

import com.gwhaitech.accountingfirm.client.exception.ClientNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.DocumentNotFoundException;
import com.gwhaitech.accountingfirm.client.exception.FileValidationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

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
        return ResponseEntity.badRequest().body("File exceeds the maximum allowed upload size");
    }
}
