package com.gwhaitech.accountingfirm.messaging.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ThreadNotFoundException extends RuntimeException {
    public ThreadNotFoundException(Long id) { super("Thread not found: " + id); }
}
