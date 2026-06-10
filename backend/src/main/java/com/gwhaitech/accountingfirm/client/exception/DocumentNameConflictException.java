package com.gwhaitech.accountingfirm.client.exception;

public class DocumentNameConflictException extends RuntimeException {
    private final String filename;
    private final int year;

    public DocumentNameConflictException(String filename, int year) {
        super("A file named \"" + filename + "\" already exists for " + year + ".");
        this.filename = filename;
        this.year = year;
    }

    public String getFilename() { return filename; }
    public int getYear() { return year; }
}
