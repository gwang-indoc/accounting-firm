package com.gwhaitech.accountingfirm.client.exception;

public class ClientEmailAlreadyExistsException extends RuntimeException {
    public ClientEmailAlreadyExistsException(String email) {
        super("Client with email already exists: " + email);
    }
}
