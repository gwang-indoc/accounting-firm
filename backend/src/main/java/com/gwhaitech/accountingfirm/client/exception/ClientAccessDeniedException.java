package com.gwhaitech.accountingfirm.client.exception;

public class ClientAccessDeniedException extends RuntimeException {
    public ClientAccessDeniedException(Long clientId) {
        super("Access denied to client: " + clientId);
    }
}
