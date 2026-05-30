package com.example.test;

/**
 * FEATURE ENVY HELPER CLASS (Target Class)
 */
public class CustomerProfile {

    private String firstName;
    private String lastName;
    private String street;
    private String city;
    private String zipCode;
    private String email;
    private String phoneNumber;

    public CustomerProfile(String firstName, String lastName, String street, String city, String zipCode, String email, String phoneNumber) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.street = street;
        this.city = city;
        this.zipCode = zipCode;
        this.email = email;
        this.phoneNumber = phoneNumber;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getStreet() {
        return street;
    }

    public String getCity() {
        return city;
    }

    public String getZipCode() {
        return zipCode;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }
}
