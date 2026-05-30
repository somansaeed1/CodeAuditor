package com.example.test;

/**
 * BRAIN METHOD TEST CASE
 * Heuristics violated:
 * - Method LOC >= 45
 * - Cyclomatic Complexity >= 8 (many branch decision points)
 * - Maximum Nesting level >= 3 (deep nested scopes)
 */
public class BrainMethodExample {

    private double baseSalary = 50000.0;
    private double bonusMultiplier = 1.25;

    public BrainMethodExample() {}

    /**
     * BRAIN METHOD: Violates design simplicity by putting complex logic inside one block.
     */
    public double calculateTax(int employeeAge, int yearsOfService, double bonusOverride, boolean isContractor, String department) {
        double calculatedTax = 0.0;
        
        // Nesting 1
        if (isContractor) {
            System.out.println("Contractor profile detected.");
            // Nesting 2
            if (employeeAge > 65) {
                calculatedTax = baseSalary * 0.05;
            } else {
                calculatedTax = baseSalary * 0.15;
            }
        } else {
            System.out.println("Full-time employee profile detected.");
            double totalSalary = baseSalary;
            
            // Nesting 2
            if (bonusOverride > 0.0) {
                totalSalary += bonusOverride;
            } else {
                totalSalary += (baseSalary * 0.1) * bonusMultiplier;
            }

            // Nesting 2
            if (yearsOfService > 10) {
                System.out.println("Veteran employee tax rates apply.");
                // Nesting 3
                if (department.equalsIgnoreCase("HR")) {
                    calculatedTax = totalSalary * 0.12;
                } else if (department.equalsIgnoreCase("RND")) {
                    calculatedTax = totalSalary * 0.08;
                } else {
                    calculatedTax = totalSalary * 0.10;
                }
            } else if (yearsOfService > 5) {
                System.out.println("Mid-career employee tax rates apply.");
                // Nesting 3
                if (employeeAge > 50) {
                    calculatedTax = totalSalary * 0.18;
                } else {
                    calculatedTax = totalSalary * 0.22;
                }
            } else {
                System.out.println("Junior employee tax rates apply.");
                // Nesting 3
                if (employeeAge > 30) {
                    calculatedTax = totalSalary * 0.25;
                } else {
                    calculatedTax = totalSalary * 0.30;
                }
            }

            // Nesting 2
            if (calculatedTax > 15000.0) {
                System.out.println("Luxury tax bracket reached.");
                calculatedTax += (calculatedTax - 15000.0) * 0.05;
            }
        }

        // Additional statements to increase method lines of code (LOC >= 45)
        System.out.println("Applied base rate of calculation.");
        System.out.println("Verified age parameters: " + employeeAge);
        System.out.println("Verified service parameter: " + yearsOfService);
        System.out.println("Verified department settings: " + department);
        
        try {
            System.out.println("Running validation checks...");
            if (calculatedTax < 0) {
                throw new IllegalArgumentException("Tax cannot be negative!");
            }
        } catch (IllegalArgumentException e) {
            System.err.println("Validation exception: " + e.getMessage());
            calculatedTax = 0.0;
        }

        System.out.println("Final calculated tax value: " + calculatedTax);
        return calculatedTax;
    }
}
