import React, { useState, useEffect } from 'react';
import { scanJavaSource } from '../utils/detector';
import { generateRefactoringSuggestion } from '../utils/refactoring';
import RefactorGuide from './RefactorGuide';
import './CodeSandbox.css';

// Preset templates for testing
const TEMPLATES = {
  OrderSystem: `package com.example.shop;

import java.util.*;

/**
 * GOD CLASS: Large class that handles orders, shipping, DB writes, and notifications.
 */
public class OrderSystem {

    private String orderId;
    private double orderAmount;
    private String customerName;
    private String customerEmail;
    private String street;
    private String city;
    private String zipCode;
    private boolean isShipped;
    private boolean isPaid;
    private List<String> items = new ArrayList<>();
    private String dbConnectionString = "jdbc:mysql://localhost:3306/shop";
    private String smtpServer = "smtp.mail.com";

    public OrderSystem(String orderId, double amount, String customerName) {
        this.orderId = orderId;
        this.orderAmount = amount;
        this.customerName = customerName;
        this.isShipped = false;
        this.isPaid = false;
    }

    /**
     * DATA CLUMP: street, city, zipCode parameters passed together
     */
    public void setShippingAddress(String street, String city, String zipCode) {
        this.street = street;
        this.city = city;
        this.zipCode = zipCode;
    }

    /**
     * DATA CLUMP: same parameters passed together again
     */
    public void shipOrder(String street, String city, String zipCode) {
        this.isShipped = true;
        System.out.println("Shipping order " + orderId + " to " + street + ", " + city + " " + zipCode);
    }

    /**
     * BRAIN METHOD: Extremely long, complex, nested method checking payment status,
     * connecting to db, and sending emails.
     */
    public boolean processComplexOrder(String paymentType, double promoDiscount, boolean isFirstTimeCustomer) {
        System.out.println("Beginning processing...");
        
        if (orderId == null || orderId.isEmpty()) {
            return false;
        }
        
        if (orderAmount <= 0) {
            System.out.println("Amount must be positive");
            return false;
        }

        double finalAmount = orderAmount;
        if (promoDiscount > 0 && promoDiscount < 100) {
            double discount = orderAmount * (promoDiscount / 100);
            finalAmount = orderAmount - discount;
            System.out.println("Promo discount applied: " + discount);
        }

        if (isFirstTimeCustomer) {
            finalAmount = finalAmount * 0.95;
            System.out.println("First-time customer discount applied");
        }

        if (paymentType.equalsIgnoreCase("CREDIT")) {
            System.out.println("Processing credit payment...");
            for (int i = 0; i < 3; i++) {
                System.out.println("Attempting gateway connect " + i);
                if (i == 2) {
                    this.isPaid = true;
                    break;
                }
            }
        } else if (paymentType.equalsIgnoreCase("PAYPAL")) {
            System.out.println("Redirecting to PayPal...");
            this.isPaid = true;
        } else {
            System.out.println("Cash on delivery");
            this.isPaid = false;
        }

        if (isPaid) {
            System.out.println("Payment verified.");
            if (street != null && !street.isEmpty()) {
                System.out.println("Valid address. Creating shipping label...");
                try {
                    System.out.println("Connecting to " + dbConnectionString);
                    System.out.println("Saving order invoice...");
                    System.out.println("Sending email notification to " + customerEmail + " via " + smtpServer);
                    return true;
                } catch (Exception e) {
                    System.out.println("Database write error: " + e.getMessage());
                    return false;
                }
            } else {
                System.out.println("Shipping address is empty, label hold.");
                return false;
            }
        }
        return false;
    }
}`,

  PaymentProcessor: `package com.example.shop;

/**
 * FEATURE ENVY: PaymentProcessor handles payment operations for the shop system.
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
               "\\nMerchant: " + merchantName +
               "\\nDate: " + transactionDate +
               "\\nPayment: " + paymentMethod +
               "\\nDiscount: " + discountAmount +
               "\\nTax: " + taxAmount +
               "\\nTotal: " + totalAmount;
    }

    public void recordTransaction() {
        this.transactionCount++;
    }
}`,

  BankAccount: `package com.example.shop;

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

    public double getBalance() {
        return this.balance;
    }

    public boolean isFrozen() {
        return this.frozen;
    }

    public void deductBalance(double amount) {
        this.balance -= amount;
    }

    public void logSuccessfulTransaction(double amount) {
        System.out.println("Transaction successful: " + amount);
        this.transactionCount++;
    }

    public void logFailedTransaction(double amount) {
        System.out.println("Transaction failed: " + amount);
    }
}`
};

export default function CodeSandbox({ config }) {
  const [code, setCode] = useState(TEMPLATES.OrderSystem);
  const [scanResult, setScanResult] = useState(null);
  const [activeRefactor, setActiveRefactor] = useState(null);

  // Scan the code block automatically when code or config thresholds change
  useEffect(() => {
    if (code.trim()) {
      const result = scanJavaSource(code, config.threshold, config.ratio);
      setScanResult(result);
    } else {
      setScanResult(null);
    }
  }, [code, config.threshold, config.ratio]);

  const loadTemplate = (key) => {
    if (TEMPLATES[key]) {
      setCode(TEMPLATES[key]);
    }
  };

  const handleRefactorClick = (detection) => {
    const suggestion = generateRefactoringSuggestion(code, detection);
    setActiveRefactor(suggestion);
  };

  const numDetections = scanResult?.detections?.length || 0;
  const methodsCount = scanResult?.summary?.methodsAnalyzed || 0;

  return (
    <div className="sandbox-container animate-fade-in">
      <div className="sandbox-presets glass-card">
        <span className="presets-label">Load Preset Java Templates:</span>
        <div className="preset-buttons">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => loadTemplate('OrderSystem')}
            title="Contains God Class, Brain Method, Data Clump smells"
          >
            OrderSystem.java (Multi-Smell ⚠️)
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => loadTemplate('PaymentProcessor')}
            title="Contains Feature Envy smells"
          >
            PaymentProcessor.java (Envy ⚠️)
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => loadTemplate('BankAccount')}
            title="Clean class"
          >
            BankAccount.java (Clean ✓)
          </button>
        </div>
      </div>

      <div className="sandbox-workspace">
        {/* Code Input Card */}
        <div className="glass-card editor-card">
          <div className="card-header-actions">
            <h4>Java Code Editor</h4>
            <button className="btn btn-secondary btn-xs" onClick={() => setCode('')}>Clear Editor</button>
          </div>
          <textarea
            className="code-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your Java source code here to analyze..."
          />
        </div>

        {/* Real-time Detections Output Card */}
        <div className="glass-card result-card">
          <div className="result-header">
            <h4>Live Smell Analysis</h4>
            <span className="subtitle">Real-time parser results</span>
          </div>

          {!code.trim() ? (
            <div className="empty-sandbox-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="9" x2="20" y2="9"></line>
                <line x1="4" y1="15" x2="20" y2="15"></line>
                <line x1="10" y1="3" x2="8" y2="21"></line>
                <line x1="16" y1="3" x2="14" y2="21"></line>
              </svg>
              <p>Type or paste Java source code to start scanning instantly.</p>
            </div>
          ) : scanResult?.status === 'error' ? (
            <div className="sandbox-error-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>{scanResult.message}</p>
            </div>
          ) : (
            <div className="sandbox-results">
              <div className="results-summary-banner">
                <div className="summary-banner-item">
                  <span className="lbl">Methods Analyzed</span>
                  <strong>{methodsCount}</strong>
                </div>
                <div className="summary-banner-item">
                  <span className="lbl">Detections</span>
                  <strong className={numDetections > 0 ? 'text-danger' : 'text-success'}>
                    {numDetections}
                  </strong>
                </div>
              </div>

              {numDetections === 0 ? (
                <div className="clean-sandbox-state">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <p>No code smells detected. The pasted code matches thresholds!</p>
                </div>
              ) : (
                <div className="sandbox-detections-list">
                  {scanResult.detections.map((d, index) => (
                    <div key={index} className="sandbox-detection-item animate-fade-in">
                      <div className="sd-header">
                        <div>
                          <strong className="sd-method-name">
                            {d.smellType === 'God Class' ? d.class : `${d.class}.${d.method}()`}
                          </strong>
                          <span className={`sd-pill ${d.smellType.toLowerCase().replace(' ', '-')}`}>
                            {d.smellType}
                          </span>
                        </div>
                        <span className="sd-line">
                          {d.smellType === 'God Class' ? 'Class Level' : `Line ${d.line}`}
                        </span>
                      </div>
                      
                      <div className="sd-body">
                        <p className="sd-reason">{d.reason}</p>
                        
                        {d.smellType === 'Feature Envy' && (
                          <div className="sd-stats-summary">
                            <span>Internal: <strong>{d.internalAccesses}</strong> accesses</span>
                            <span>External: <strong>{d.externalAccesses}</strong> accesses</span>
                            <div className="sd-envy-target">Envied: <code>'{d.mostEnviedObject}' ({d.actualPlace.className})</code></div>
                          </div>
                        )}

                        {d.smellType === 'God Class' && (
                          <div className="sd-stats-summary">
                            <span>LOC: <strong>{d.details.lines}</strong></span>
                            <span>Fields: <strong>{d.details.fields}</strong></span>
                            <span>Methods: <strong>{d.details.methods}</strong></span>
                            <span>Cohesion (TCC): <strong className="text-danger">{d.details.tcc}</strong></span>
                          </div>
                        )}

                        {d.smellType === 'Brain Method' && (
                          <div className="sd-stats-summary">
                            <span>LOC: <strong>{d.details.lines}</strong></span>
                            <span>Complexity: <strong className="text-danger">{d.details.complexity}</strong></span>
                            <span>Max Nesting: <strong>{d.details.nestingDepth}</strong></span>
                          </div>
                        )}

                        {d.smellType === 'Data Clump' && (
                          <div className="sd-clump-params">
                            <span>Clumped:</span>
                            <div className="sd-clump-tokens">
                              {d.details.clumpedParameters.map((p, idx) => (
                                <code key={idx} className="sd-clump-token">{p}</code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        className="btn btn-primary btn-sm refactor-btn"
                        onClick={() => handleRefactorClick(d)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        Refactor Suggestion
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeRefactor && (
        <RefactorGuide 
          suggestion={activeRefactor} 
          onClose={() => setActiveRefactor(null)} 
        />
      )}
    </div>
  );
}
