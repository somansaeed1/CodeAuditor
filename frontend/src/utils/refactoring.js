/**
 * Generates refactoring recommendations and code snippets for different code smells.
 * Maps detection object properties from backend to RefactorGuide component expectations.
 */
export function generateRefactoringSuggestion(sourceCode, detection) {
  if (!detection) return null;
  
  const { smellType } = detection;
  
  if (smellType === 'Feature Envy') {
    return generateFeatureEnvySuggestion(sourceCode, detection);
  } else if (smellType === 'God Class') {
    return generateGodClassSuggestion(sourceCode, detection);
  } else if (smellType === 'Brain Method') {
    return generateBrainMethodSuggestion(sourceCode, detection);
  } else if (smellType === 'Data Clump') {
    return generateDataClumpSuggestion(sourceCode, detection);
  }
  
  return null;
}

/**
 * Feature Envy Move Method Refactoring
 */
function generateFeatureEnvySuggestion(sourceCode, detection) {
  const className = detection.className;
  const methodName = detection.details?.methodName || 'method';
  const enviedObject = detection.details?.enviedObject || 'enviedObj';
  const targetClassName = detection.actualPlace?.className || 'TargetClass';
  const line = detection.details?.line || 1;
  
  const lines = sourceCode ? sourceCode.split('\n') : [];
  
  // Build suggestion with fallback for when source is unavailable
  const originalMethodCode = sourceCode 
    ? `// Method ${methodName} in class ${className} at line ${line}`
    : `// Method '${methodName}()' in '${className}' has high coupling to '${targetClassName}'`;
  
  const refactoredNewMethodCode = `// Move this method to class '${targetClassName}'\npublic <return-type> ${methodName}() {\n    // Refactored: Remove ${enviedObject} parameter\n    // Replace '${enviedObject}.' accesses with 'this.'\n    // ... method implementation ...\n}`;

  const delegationMethodCode = `// Delegation wrapper in ${className}.java\npublic <return-type> ${methodName}(<params-without-${enviedObject}>) {\n    return ${enviedObject}.${methodName}(<args>);\n}`;

  return {
    smellType: 'Feature Envy',
    originalClassName: className,
    targetClassName: targetClassName,
    enviedObject: enviedObject,
    originalCode: originalMethodCode,
    refactoredCode: refactoredNewMethodCode,
    delegationCode: delegationMethodCode,
    // Add refactoring steps from backend if available
    refactoringSteps: detection.refactoringSteps || [
      `Move the method '${methodName}()' from class '${className}' to class '${targetClassName}'`,
      `In class '${className}', replace the original method body with a delegation call`,
      `Update all call sites to call the method on '${targetClassName}' instances`
    ]
  };
}

/**
 * God Class extract suggestions
 */
function generateGodClassSuggestion(sourceCode, detection) {
  const className = detection.className;
  const targetClass = detection.actualPlace?.className || 'HelperClass';
  const details = detection.details || {};
  const lines = details.lines || 0;
  const fields = details.fields || 0;
  const methods = details.methods || 0;
  
  const helperClassCode = `/**
 * Extract Class Refactoring
 * Split off from ${className} to handle specialized concerns.
 */
public class ${targetClass.split(' ').pop()} {
    // TODO: Move relevant attributes here
    
    public ${targetClass.split(' ').pop()}() {
        // Constructor logic
    }
    
    // TODO: Move cohesive methods here and delegate calls from ${className}
}`;

  return {
    smellType: 'God Class',
    originalClassName: className,
    targetClassName: targetClass,
    originalCode: `// Class ${className} is currently a God Class.\n// It has too many responsibilities: ${lines} lines, ${fields} fields, ${methods} methods.`,
    refactoredCode: helperClassCode,
    delegationCode: `// In ${className}.java:\nprivate ${targetClass.split(' ').pop()} helper = new ${targetClass.split(' ').pop()}();\n\n// Delegate calls to the new class:\npublic void delegatingMethod() {\n    helper.delegatingMethod();\n}`,
    refactoringSteps: detection.refactoringSteps || [
      `Identify cohesive groups of fields and methods in '${className}'`,
      `Extract these groups into a new class '${targetClass}'`,
      `Update '${className}' to delegate to the new class instances`,
      `Test both original and refactored code thoroughly`
    ]
  };
}

/**
 * Brain Method extract suggestions
 */
function generateBrainMethodSuggestion(sourceCode, detection) {
  const className = detection.className;
  const methodName = detection.details?.methodName || 'method';
  const line = detection.details?.line || 1;
  const complexity = detection.details?.complexity || 'high';
  const loc = detection.details?.lines || 0;
  const nesting = detection.details?.nestingDepth || 0;

  const originalCode = sourceCode 
    ? `// Method '${methodName}()' in '${className}' at line ${line}`
    : `// Method '${methodName}()' has complexity=${complexity}, LOC=${loc}, nesting=${nesting}`;

  const helperMethodCode = `// Refactored by Extract Method:\npublic void ${methodName}() {\n    // 1. Call extracted validation helper\n    validateInputs();\n    \n    // 2. Call extracted core computation\n    performCoreComputation();\n    \n    // 3. Call extracted output/logging\n    logTransactionResults();\n}\n\nprivate void validateInputs() {\n    // Extracted validation logic\n}\n\nprivate void performCoreComputation() {\n    // Extracted calculation logic\n}\n\nprivate void logTransactionResults() {\n    // Extracted logging logic\n}`;

  return {
    smellType: 'Brain Method',
    originalClassName: className,
    targetClassName: `${className} Helpers`,
    originalCode: originalCode,
    refactoredCode: helperMethodCode,
    delegationCode: `// Refactored method calls helper methods to distribute complexity.`,
    refactoringSteps: detection.refactoringSteps || [
      `Identify independent blocks or responsibilities within method '${methodName}()'`,
      `Extract each block into a private helper method with a clear, descriptive name`,
      `Replace the original logic with calls to the extracted helper methods`,
      `Test the refactored method to ensure it maintains original behavior`
    ]
  };
}

/**
 * Data Clump Introduce Parameter Object
 */
function generateDataClumpSuggestion(sourceCode, detection) {
  const className = detection.className;
  const methodName = detection.details?.methodName || 'method';
  const targetClass = detection.actualPlace?.className || 'ParameterObject';
  const params = detection.details?.clumpedParameters || [];
  
  const fieldsCode = params.length > 0
    ? params.map(p => `    private String ${p}; // TODO: Update type`).join('\n')
    : '    // TODO: Add clumped parameters as fields';
  
  const constructorParams = params.length > 0 ? params.join(', ') : 'String param1, String param2';
  const assignments = params.length > 0
    ? params.map(p => `        this.${p} = ${p};`).join('\n')
    : '        // TODO: Assign parameters';
  
  const gettersSetters = params.length > 0
    ? params.map(p => {
        const capName = p.charAt(0).toUpperCase() + p.slice(1);
        return `    public String get${capName}() { return this.${p}; }\n    public void set${capName}(String ${p}) { this.${p} = ${p}; }`;
      }).join('\n\n')
    : '    // TODO: Add getters and setters';

  const parameterObjectClass = `/**
 * Introduce Parameter Object
 * Groups data clump: ${params.join(', ') || 'clumped parameters'}
 */
public class ${targetClass} {
${fieldsCode}

    public ${targetClass}(${constructorParams}) {
${assignments}
    }

${gettersSetters}
}`;

  return {
    smellType: 'Data Clump',
    originalClassName: className,
    targetClassName: targetClass,
    originalCode: `// Method signature containing clump:\npublic void ${methodName}(${constructorParams}) { ... }`,
    refactoredCode: parameterObjectClass,
    delegationCode: `// Refactored method signature in ${className}.java:\npublic void ${methodName}(${targetClass} info) {\n    // Access variables through parameter object:\n    // info.get${params.length > 0 ? params[0].charAt(0).toUpperCase() + params[0].slice(1) : 'Param1'}();\n}`,
    refactoringSteps: detection.refactoringSteps || [
      `Create a new Parameter Object class '${targetClass}' with the clumped parameters`,
      `Update method signatures to accept the Parameter Object instead of individual parameters`,
      `Update all call sites to create and pass Parameter Object instances`,
      `Test the refactored methods to ensure they still work correctly`
    ]
  };
}
