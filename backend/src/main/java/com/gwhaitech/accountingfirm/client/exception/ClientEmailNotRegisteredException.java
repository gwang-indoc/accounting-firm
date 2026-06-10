package com.gwhaitech.accountingfirm.client.exception;

public class ClientEmailNotRegisteredException extends RuntimeException {
    public ClientEmailNotRegisteredException(String email) {
        super("Email not registered: " + email);
    }
}
