package com.example.test;

/**
 * FEATURE ENVY TEST CASE
 * Heuristics violated:
 * - Method accesses members of CustomerProfile (external class) heavily.
 * - External accesses >= 3
 * - External accesses >= 2.0 * (internal accesses + 1)
 */
public class FeatureEnvyExample {

    private String formatterId = "AGENT-100";

    public FeatureEnvyExample() {}

    /**
     * FEATURE ENVY: accesses customer details far more than formatterId.
     * Belongs in CustomerProfile.java.
     */
    public String formatShippingLabel(CustomerProfile customer) {
        String title = customer.getFirstName() + " " + customer.getLastName();
        String address = customer.getStreet() + ", " + customer.getCity() + " " + customer.getZipCode();
        String contact = customer.getEmail() + " / " + customer.getPhoneNumber();

        return "--- SHIPPING TO ---\n" +
               "Customer: " + title + "\n" +
               "Address : " + address + "\n" +
               "Contact : " + contact + "\n" +
               "-------------------";
    }

    public String getFormatterId() {
        return this.formatterId;
    }
}
