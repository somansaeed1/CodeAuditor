package com.example.test;

/**
 * DATA CLUMP TEST CASE
 * Heuristics violated:
 * - Repeats parameter group (String title, String author, String isbn, String publisher) in multiple methods.
 * - Clump size >= 3
 */
public class DataClumpExample {

    private int recordsCount = 0;

    public DataClumpExample() {}

    // Methods below share the exact same parameter clump: (String title, String author, String isbn, String publisher)
    
    public void createBookRecord(String title, String author, String isbn, String publisher) {
        System.out.println("Saving book to catalog database...");
        System.out.println("Title: " + title);
        System.out.println("Author: " + author);
        System.out.println("ISBN: " + isbn);
        System.out.println("Publisher: " + publisher);
        this.recordsCount++;
    }

    public void updateBookRecord(String title, String author, String isbn, String publisher) {
        System.out.println("Locating book with ISBN " + isbn + " in database...");
        System.out.println("Updating record: " + title + " by " + author + " published by " + publisher);
    }

    public boolean verifyBookRecord(String title, String author, String isbn, String publisher) {
        System.out.println("Verifying book details against authority registry...");
        if (isbn == null || isbn.length() < 10) {
            return false;
        }
        return title != null && author != null && publisher != null;
    }

    public int getRecordsCount() {
        return this.recordsCount;
    }
}
