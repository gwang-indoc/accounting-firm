package com.gwhaitech.accountingfirm.messaging.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class ThreadForbiddenException extends RuntimeException {
    public ThreadForbiddenException() { super("Not authorized to access this thread"); }
}
