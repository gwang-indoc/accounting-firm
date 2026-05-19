package com.gwhaitech.accountingfirm.client.exception;

public class PortalNotLinkedException extends RuntimeException {
    public PortalNotLinkedException() {
        super("Your portal isn't set up yet.");
    }
}
