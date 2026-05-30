package com.example.shop;

/**
 * BankAccount represents a customer bank account.
 */
public class BankAccount {

    private String accountNumber;
    private String accountHolder;
    private double balance;
    private boolean frozen;
    private double overdraftLimit;
    private int transactionCount;

    public BankAccount(String accountNumber, String accountHolder, double balance) {
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.balance = balance;
        this.frozen = false;
        this.overdraftLimit = 500.0;
        this.transactionCount = 0;
    }

    public String getAccountNumber() {
        return this.accountNumber;
    }

    public String getAccountHolder() {
        return this.accountHolder;
    }

    public double getBalance() {
        return this.balance;
    }

    public boolean isFrozen() {
        return this.frozen;
    }

    public double getOverdraftLimit() {
        return this.overdraftLimit;
    }

    public void deductBalance(double amount) {
        this.balance -= amount;
    }

    public void incrementTransactionCount() {
        this.transactionCount++;
    }

    public void logSuccessfulTransaction(double amount) {
        System.out.println("Transaction successful: " + amount);
        this.transactionCount++;
    }

    public void logFailedTransaction(double amount) {
        System.out.println("Transaction failed: " + amount);
    }

    public void freeze() {
        this.frozen = true;
    }

    public void unfreeze() {
        this.frozen = false;
    }
}
