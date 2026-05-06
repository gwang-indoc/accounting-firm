package com.gwhaitech.accountingfirm.client.exception;

public class ClientNotFoundException extends RuntimeException {
    public ClientNotFoundException(Long id) {
        super("Client not found: " + id);
    }
}
