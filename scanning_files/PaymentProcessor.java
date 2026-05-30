package com.example.shop;

/**
 * PaymentProcessor handles payment operations for the shop system.
 * This class processes payments, generates receipts, and manages refunds.
 */
public class PaymentProcessor {

    private String processorId;
    private int transactionCount;
    private boolean isActive;

    public PaymentProcessor(String processorId) {
        this.processorId = processorId;
        this.transactionCount = 0;
        this.isActive = true;
    }

    /**
     * FEATURE ENVY: This method accesses BankAccount fields and methods
     * far more than its own class fields. It belongs in BankAccount.
     */
    public boolean processPayment(BankAccount account, double amount) {
        double currentBalance = account.getBalance();
        String accountNumber = account.getAccountNumber();
        String accountHolder = account.getAccountHolder();
        boolean isFrozen = account.isFrozen();
        double overdraftLimit = account.getOverdraftLimit();

        if (isFrozen) {
            account.logFailedTransaction(amount);
            return false;
        }

        if (currentBalance + overdraftLimit < amount) {
            account.logFailedTransaction(amount);
            return false;
        }

        account.deductBalance(amount);
        account.incrementTransactionCount();
        account.logSuccessfulTransaction(amount);
        return true;
    }

    /**
     * Normal method: uses own class fields only.
     */
    public void activate() {
        this.isActive = true;
        this.transactionCount = 0;
        this.processorId = this.processorId + "_ACTIVE";
    }

    /**
     * FEATURE ENVY: This method accesses Receipt fields more than its own.
     * It belongs in the Receipt class.
     */
    public String formatReceipt(Receipt receipt) {
        String receiptId = receipt.getReceiptId();
        String merchantName = receipt.getMerchantName();
        double totalAmount = receipt.getTotalAmount();
        double taxAmount = receipt.getTaxAmount();
        double discountAmount = receipt.getDiscountAmount();
        String paymentMethod = receipt.getPaymentMethod();
        String transactionDate = receipt.getTransactionDate();

        return "Receipt: " + receiptId +
               "\nMerchant: " + merchantName +
               "\nDate: " + transactionDate +
               "\nPayment: " + paymentMethod +
               "\nDiscount: " + discountAmount +
               "\nTax: " + taxAmount +
               "\nTotal: " + totalAmount;
    }

    /**
     * Normal method: increments own counter.
     */
    public void recordTransaction() {
        this.transactionCount++;
    }

    public String getProcessorId() {
        return this.processorId;
    }

    public int getTransactionCount() {
        return this.transactionCount;
    }

    public boolean isActive() {
        return this.isActive;
    }
}
