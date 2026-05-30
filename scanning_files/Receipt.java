package com.example.shop;

/**
 * Receipt represents a payment receipt in the shop system.
 */
public class Receipt {

    private String receiptId;
    private String merchantName;
    private double totalAmount;
    private double taxAmount;
    private double discountAmount;
    private String paymentMethod;
    private String transactionDate;

    public Receipt(String receiptId, String merchantName, double totalAmount) {
        this.receiptId = receiptId;
        this.merchantName = merchantName;
        this.totalAmount = totalAmount;
        this.taxAmount = totalAmount * 0.17;
        this.discountAmount = 0.0;
        this.paymentMethod = "CASH";
        this.transactionDate = "2026-05-23";
    }

    public String getReceiptId() {
        return this.receiptId;
    }

    public String getMerchantName() {
        return this.merchantName;
    }

    public double getTotalAmount() {
        return this.totalAmount;
    }

    public double getTaxAmount() {
        return this.taxAmount;
    }

    public double getDiscountAmount() {
        return this.discountAmount;
    }

    public String getPaymentMethod() {
        return this.paymentMethod;
    }

    public String getTransactionDate() {
        return this.transactionDate;
    }

    public void applyDiscount(double discount) {
        this.discountAmount = discount;
        this.totalAmount -= discount;
    }

    public void setPaymentMethod(String method) {
        this.paymentMethod = method;
    }
}
