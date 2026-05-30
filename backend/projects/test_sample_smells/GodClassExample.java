package com.example.test;

import java.util.*;

/**
 * GOD CLASS TEST CASE
 * Heuristics violated:
 * - Lines of Code > 250
 * - Attributes count (fields) >= 8
 * - Methods count >= 12
 * - Tight Class Cohesion (TCC) < 0.33 (methods manipulate unrelated subsets of fields)
 */
public class GodClassExample {

    // Group 1: Database fields
    private String dbUrl = "jdbc:postgresql://localhost:5432/testdb";
    private String dbUser = "admin";
    private String dbPassword = "password123";
    private boolean isConnected = false;

    // Group 2: User management fields
    private String currentUserId;
    private String currentUsername;
    private String currentUserRole;
    private List<String> sessionTokens = new ArrayList<>();

    // Group 3: Email notification fields
    private String smtpHost = "smtp.gmail.com";
    private int smtpPort = 587;
    private String senderEmail = "no-reply@example.com";

    // Group 4: Billing fields
    private double taxRate = 0.17;
    private double discountRate = 0.05;
    private List<Double> invoiceAmounts = new ArrayList<>();

    // Group 5: Logs and Analytics
    private List<String> auditLogs = new ArrayList<>();
    private int warningCount = 0;

    public GodClassExample() {
        this.currentUserId = UUID.randomUUID().toString();
    }

    // --- DB METHODS ---
    public void connectToDatabase() {
        System.out.println("Connecting to " + dbUrl + " using user " + dbUser);
        this.isConnected = true;
    }

    public void disconnectDatabase() {
        System.out.println("Disconnecting from database");
        this.isConnected = false;
    }

    public boolean checkConnectionStatus() {
        return this.isConnected;
    }

    // --- USER MANAGEMENT METHODS ---
    public void loginUser(String username, String role) {
        this.currentUsername = username;
        this.currentUserRole = role;
        String token = UUID.randomUUID().toString();
        this.sessionTokens.add(token);
        System.out.println("Logged in user " + username + " with role " + role);
    }

    public void logoutUser() {
        System.out.println("Logging out user " + this.currentUsername);
        this.currentUsername = null;
        this.currentUserRole = null;
        this.sessionTokens.clear();
    }

    public boolean isUserAdmin() {
        return "ADMIN".equalsIgnoreCase(this.currentUserRole);
    }

    public String getCurrentUserSessionToken() {
        if (!sessionTokens.isEmpty()) {
            return sessionTokens.get(sessionTokens.size() - 1);
        }
        return null;
    }

    // --- EMAIL METHODS ---
    public void configureSmtp(String host, int port) {
        this.smtpHost = host;
        this.smtpPort = port;
    }

    public void sendEmailNotification(String recipient, String subject, String body) {
        System.out.println("Sending email via " + smtpHost + ":" + smtpPort);
        System.out.println("From: " + senderEmail + " To: " + recipient);
        System.out.println("Subject: " + subject);
        System.out.println("Body: " + body);
    }

    // --- BILLING METHODS ---
    public double calculateInvoiceTotal(double subtotal) {
        double tax = subtotal * taxRate;
        double discount = subtotal * discountRate;
        double total = subtotal + tax - discount;
        this.invoiceAmounts.add(total);
        return total;
    }

    public double getAverageInvoiceAmount() {
        if (invoiceAmounts.isEmpty()) return 0.0;
        double sum = 0;
        for (double amt : invoiceAmounts) {
            sum += amt;
        }
        return sum / invoiceAmounts.size();
    }

    public void setTaxRate(double rate) {
        this.taxRate = rate;
    }

    // --- LOGS AND AUDIT METHODS ---
    public void logAction(String message) {
        String logEntry = new Date().toString() + " - " + message;
        this.auditLogs.add(logEntry);
        System.out.println("LOG: " + logEntry);
    }

    public void recordWarning(String warning) {
        this.warningCount++;
        this.auditLogs.add("WARNING: " + warning);
    }

    public int getWarningCount() {
        return this.warningCount;
    }

    public List<String> getAuditLogs() {
        return this.auditLogs;
    }

    // --- EXTRA FLUFF TO INCREASE LINES OF CODE TO TRIGGER GOD CLASS LOC THRESHOLD ---
    public void runMaintenanceChecks() {
        logAction("Running maintenance check 1");
        if (checkConnectionStatus()) {
            logAction("Database connection is healthy.");
        } else {
            recordWarning("Database connection is offline during maintenance check!");
        }
        
        logAction("Running maintenance check 2");
        if (smtpHost == null || smtpHost.isEmpty()) {
            recordWarning("SMTP Server not configured!");
        }
        
        logAction("Running maintenance check 3");
        if (currentUsername == null) {
            logAction("No active user sessions found.");
        }
        
        logAction("Running maintenance check 4");
        if (invoiceAmounts.size() > 100) {
            logAction("Invoice amounts size exceeds 100 entries. Cleanup recommended.");
        }
        
        logAction("Running maintenance check 5");
        if (taxRate < 0 || taxRate > 1) {
            recordWarning("Abnormal tax rate detected: " + taxRate);
        }
        
        logAction("Maintenance checklist run successfully.");
    }
}
