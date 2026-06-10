package com.gwhaitech.accountingfirm.messaging.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class NoLinkedClientException extends RuntimeException {
    public NoLinkedClientException() { super("No client record linked to your account."); }
}
