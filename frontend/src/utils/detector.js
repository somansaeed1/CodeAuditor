const IGNORED_PREFIXES = new Set([
  'System', 'Math', 'String', 'Integer', 'Float', 'Double',
  'Boolean', 'Long', 'Object', 'Arrays', 'Collections',
  'Log', 'Logger', 'Build', 'Color', 'Context', 'R',
  'super', 'this'
]);

/**
 * Clean comments and string literals
 */
export function cleanSourceCode(code) {
  let cleaned = code.replace(/"[^"]*"/g, '""');
  cleaned = cleaned.replace(/\/\/[^\n]*/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  return cleaned;
}

/**
 * Extracts class name from Java source code.
 */
export function extractClassName(sourceCode) {
  const match = sourceCode.match(/^(?:public|private|protected|abstract|final|\s)*class\s+(\w+)/m);
  return match ? match[1] : null;
}

/**
 * Extracts fields from Java source code.
 */
export function extractFields(sourceCode, methodsCodeBlocks) {
  let remainingCode = sourceCode;
  for (const block of methodsCodeBlocks) {
    remainingCode = remainingCode.replace(block, '');
  }

  const cleaned = cleanSourceCode(remainingCode);
  const fieldRegex = /(?:public|private|protected|static|final|transient|volatile|\s)*\b([\w<>\[\]]+)\s+(\w+)\s*(?:=\s*[^;]+)?\s*;/g;
  
  const fields = [];
  let match;
  while ((match = fieldRegex.exec(cleaned)) !== null) {
    const fieldType = match[1];
    const fieldName = match[2];
    if (!['class', 'return', 'package', 'import'].includes(fieldName)) {
      fields.push({ type: fieldType, name: fieldName });
    }
  }
  return fields;
}

/**
 * Extracts methods from Java source code.
 * Returns array of { methodName, startLine, methodBody, params, paramStr }
 */
export function extractMethods(sourceCode) {
  const methods = [];
  const lines = sourceCode.split('\n');

  // Regex to match Java method declarations
  const methodRegex = /^\s*(?:(?:public|private|protected|static|final|synchronized|abstract|native|strictfp|default|transient|volatile)\s+)*(?!if|for|while|switch|catch|try|else|return|new|throw)[\w<>\[\],\s]+\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(methodRegex);
    if (match) {
      const methodName = match[1];
      const paramStr = match[2].trim();
      const startLine = i + 1; // 1-indexed

      const bodyLines = [];
      let braceCount = 0;
      let foundOpen = false;

      for (let j = i; j < lines.length; j++) {
        const current = lines[j];
        bodyLines.push(current);

        for (let char of current) {
          if (char === '{') {
            braceCount++;
            foundOpen = true;
          } else if (char === '}') {
            braceCount--;
          }
        }

        if (foundOpen && braceCount === 0) {
          break;
        }
      }

      const methodBody = bodyLines.join('\n');
      
      // Parse parameters
      const params = [];
      if (paramStr) {
        const parts = paramStr.split(',');
        for (let p of parts) {
          p = p.trim();
          if (p) {
            const tokens = p.split(/\s+/);
            if (tokens.length >= 2) {
              const pName = tokens[tokens.length - 1];
              const pType = tokens.slice(0, tokens.length - 1).join(' ');
              params.push({ type: pType, name: pName });
            }
          }
        }
      }

      methods.push({ methodName, startLine, methodBody, params, paramStr });
    }
    i++;
  }

  return methods;
}

/**
 * Counts internal and external accesses in a method body.
 */
export function countAccesses(methodBody, className, fields = []) {
  const cleaned = cleanSourceCode(methodBody);

  // Count internal accesses: this.something
  const thisMatches = cleaned.match(/\bthis\s*\.\s*\w+/g) || [];
  let internalCount = thisMatches.length;

  // Direct accesses to class field names
  const fieldNames = new Set(fields.map(f => f.name));
  for (const field of fieldNames) {
    const regex = new RegExp(`\\b${field}\\b`, 'g');
    let m;
    while ((m = regex.exec(cleaned)) !== null) {
      const start = m.index;
      let precededByDot = false;
      let idx = start - 1;
      while (idx >= 0 && /\s/.test(cleaned[idx])) {
        idx--;
      }
      if (idx >= 0 && cleaned[idx] === '.') {
        // Check if "this."
        let thisIdx = idx - 1;
        while (thisIdx >= 0 && /\s/.test(cleaned[thisIdx])) {
          thisIdx--;
        }
        if (thisIdx >= 3 && cleaned.substring(thisIdx - 3, thisIdx + 1) === 'this') {
          precededByDot = false;
        } else {
          precededByDot = true;
        }
      }
      if (!precededByDot) {
        internalCount++;
      }
    }
  }

  // Count external accesses: object.method() or object.field
  const externalRegex = /\b([a-z][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_]\w*)\s*(\()?/g;
  let match;
  const externalObjects = {};
  let externalCount = 0;

  while ((match = externalRegex.exec(cleaned)) !== null) {
    const obj = match[1];
    if (IGNORED_PREFIXES.has(obj) || obj === 'this' || obj === 'super') {
      continue;
    }

    if (!externalObjects[obj]) {
      externalObjects[obj] = 0;
    }
    externalObjects[obj]++;
    externalCount++;
  }

  let mostEnvied = null;
  let maxAccess = 0;
  for (const [obj, count] of Object.entries(externalObjects)) {
    if (count > maxAccess) {
      maxAccess = count;
      mostEnvied = obj;
    }
  }

  return {
    internalCount,
    externalCount,
    mostEnvied,
    envyCount: maxAccess,
    externalObjects
  };
}

/**
 * Computes Cyclomatic Complexity based on decision statements.
 */
function calculateComplexity(methodBody) {
  const cleaned = cleanSourceCode(methodBody);
  const keywords = cleaned.match(/\b(if|for|while|catch|case)\b/g) || [];
  const operators = cleaned.match(/(&&|\|\|)/g) || [];
  return 1 + keywords.length + operators.length;
}

/**
 * Computes maximum nested brace level.
 */
function calculateNesting(methodBody) {
  let maxDepth = 0;
  let currentDepth = 0;
  for (let char of methodBody) {
    if (char === '{') {
      currentDepth++;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
    } else if (char === '}') {
      currentDepth--;
    }
  }
  return maxDepth;
}

/**
 * Computes Tight Class Cohesion (TCC).
 */
function calculateTcc(methods, fields) {
  if (methods.length <= 1 || fields.length === 0) {
    return 1.0;
  }

  const fieldNames = new Set(fields.map(f => f.name));
  const methodAccessedFields = methods.map(m => {
    const accessed = new Set();
    const mCleaned = cleanSourceCode(m.methodBody);
    for (const f of fieldNames) {
      if (new RegExp(`\\b${f}\\b`).test(mCleaned)) {
        accessed.add(f);
      }
    }
    return accessed;
  });

  let cohesivePairs = 0;
  let totalPairs = 0;
  const n = methods.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalPairs++;
      // Check if they share at least one field
      let intersectionSize = 0;
      for (const f of methodAccessedFields[i]) {
        if (methodAccessedFields[j].has(f)) {
          intersectionSize++;
          break; // found one common field
        }
      }
      if (intersectionSize > 0) {
        cohesivePairs++;
      }
    }
  }

  return totalPairs > 0 ? cohesivePairs / totalPairs : 1.0;
}

function countLines(code) {
  const cleaned = cleanSourceCode(code);
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length;
}

/**
 * Scans a Java source string for all 4 code smells.
 */
export function scanJavaSource(sourceCode, threshold = 3, ratio = 2.0) {
  const className = extractClassName(sourceCode);
  if (!className) {
    return {
      status: 'error',
      message: 'Could not detect any class declaration in the Java code.'
    };
  }

  const methods = extractMethods(sourceCode);
  const fields = extractFields(sourceCode, methods.map(m => m.methodBody));
  const classLoc = countLines(sourceCode);

  const detections = [];
  const smellyFiles = new Set();

  // Thresholds values aligned with Python engine
  const GOD_CLASS_LOC = 250;
  const GOD_CLASS_FIELDS = 8;
  const GOD_CLASS_METHODS = 12;
  const GOD_CLASS_TCC = 0.33;

  const BRAIN_METHOD_LOC = 45;
  const BRAIN_METHOD_COMPLEXITY = 8;
  const BRAIN_METHOD_NESTING = 3;

  // 1. God Class Smell
  const tcc = calculateTcc(methods, fields);
  const isGodClass = (
    classLoc >= GOD_CLASS_LOC &&
    fields.length >= GOD_CLASS_FIELDS &&
    methods.length >= GOD_CLASS_METHODS &&
    tcc < GOD_CLASS_TCC
  );

  if (isGodClass) {
    detections.push({
      smellType: "God Class",
      file: "SandboxInput.java",
      class: className,
      details: {
        lines: classLoc,
        fields: fields.length,
        methods: methods.length,
        tcc: parseFloat(tcc.toFixed(2))
      },
      actualPlace: {
        file: "Split class file",
        className: `Extract details of ${className} into cohesive helper classes`
      },
      refactoringSteps: [
        "Identify groups of methods and attributes that form logical sub-modules (low cohesion clusters).",
        "Create a new class for each cohesive group (e.g. database, printing, or logic wrappers).",
        "Use 'Extract Class' to move cohesive variables and methods to the new class.",
        "Consider 'Extract Subclass' or 'Extract Interface' if features only apply in certain states."
      ],
      reason: `Class '${className}' is too large (${classLoc} lines, ${fields.length} fields, ${methods.length} methods) and has very low cohesion (TCC = ${tcc.toFixed(2)}).`
    });
  }

  // Parameter signatures storage for Data Clump
  const paramGroups = {};

  for (const m of methods) {
    const mLoc = countLines(m.methodBody);
    const mComplexity = calculateComplexity(m.methodBody);
    const mNesting = calculateNesting(m.methodBody);

    // Track parameter groups
    if (m.params.length >= 3) {
      const typesKey = m.params.map(p => p.type).join(',');
      if (!paramGroups[typesKey]) {
        paramGroups[typesKey] = [];
      }
      paramGroups[typesKey].push({
        methodName: m.methodName,
        names: m.params.map(p => p.name),
        startLine: m.startLine
      });
    }

    // 2. Feature Envy Smell
    if (m.methodName !== className && mLoc >= 3) {
      const { internalCount, externalCount, mostEnvied, envyCount } = countAccesses(m.methodBody, className, fields);
      if (externalCount >= threshold && externalCount >= ratio * (internalCount + 1)) {
        let enviedClass = "TargetClass";
        for (const p of m.params) {
          if (p.name === mostEnvied) {
            enviedClass = p.type;
            break;
          }
        }

        detections.push({
          smellType: "Feature Envy",
          file: "SandboxInput.java",
          class: className,
          method: m.methodName,
          line: m.startLine,
          internalAccesses: internalCount,
          externalAccesses: externalCount,
          mostEnviedObject: mostEnvied,
          envyCount: envyCount,
          actualPlace: {
            file: `${enviedClass}.java`,
            className: enviedClass
          },
          refactoringSteps: [
            `Move the envied method '${m.methodName}' to class '${enviedClass}' using the 'Move Method' pattern.`,
            `In class '${className}', replace the original method body with a delegation call (e.g., \`return ${mostEnvied}.${m.methodName}(...);\`) or update all call sites to call '${enviedClass}' directly.`,
            `Remove the '${enviedClass}' parameter from the method signature inside '${enviedClass}' and replace references to \`${mostEnvied}.\` with \`this.\`.`
          ],
          reason: `Method '${m.methodName}()' accesses fields/methods of object '${mostEnvied}' of type '${enviedClass}' (${externalCount} times) more than its own class '${className}' (${internalCount} times).`
        });
      }
    }

    // 3. Brain Method Smell
    const isBrainMethod = (
      mLoc >= BRAIN_METHOD_LOC &&
      mComplexity >= BRAIN_METHOD_COMPLEXITY &&
      mNesting >= BRAIN_METHOD_NESTING
    );

    if (isBrainMethod) {
      detections.push({
        smellType: "Brain Method",
        file: "SandboxInput.java",
        class: className,
        method: m.methodName,
        line: m.startLine,
        details: {
          lines: mLoc,
          complexity: mComplexity,
          nestingDepth: mNesting
        },
        actualPlace: {
          file: "SandboxInput.java",
          className: `${className} (needs split into smaller helper methods)`
        },
        refactoringSteps: [
          "Identify independent sub-tasks or logical blocks in the method body (e.g. input validation, calculation steps).",
          "Extract these logical blocks into small, well-named private helper methods inside the class using the 'Extract Method' pattern.",
          "If the method is bloated due to holding too many local variables, consider refactoring it using the 'Replace Method with Method Object' pattern."
        ],
        reason: `Method '${m.methodName}()' has high complexity (Complexity = ${mComplexity}, LOC = ${mLoc}, Max Nesting Depth = ${mNesting}).`
      });
    }
  }

  // 4. Data Clumps Smell
  for (const [typesKey, occurrences] of Object.entries(paramGroups)) {
    if (occurrences.length >= 2) {
      const clumpTypes = typesKey.split(',');
      
      // Heuristic for class suggestion
      let suggestedClass = "NewParameterObject";
      const namesLower = occurrences[0].names.map(n => n.toLowerCase());
      if (namesLower.some(n => n.includes('street') || n.includes('city') || n.includes('zip'))) {
        suggestedClass = "Address";
      } else if (namesLower.some(n => n.includes('latitude') || n.includes('longitude') || n.includes('coordinate'))) {
        suggestedClass = "Coordinates";
      } else if (namesLower.some(n => n.includes('width') || n.includes('height') || n.includes('size'))) {
        suggestedClass = "Dimensions";
      } else if (namesLower.some(n => n.includes('x') && n.includes('y'))) {
        suggestedClass = "Point";
      } else {
        suggestedClass = `${clumpTypes[0].charAt(0).toUpperCase() + clumpTypes[0].slice(1)}Group`;
      }

      for (const occ of occurrences) {
        detections.push({
          smellType: "Data Clump",
          file: "SandboxInput.java",
          class: className,
          method: occ.methodName,
          line: occ.startLine,
          details: {
            clumpedParameters: clumpTypes.map((t, index) => `${t} ${occ.names[index]}`),
            occurrencesCount: occurrences.length
          },
          actualPlace: {
            file: `${suggestedClass}.java`,
            className: suggestedClass
          },
          refactoringSteps: [
            `Create a new class '${suggestedClass}' containing fields for each of the parameters: ${clumpTypes.join(', ')}.`,
            "Add a constructor, getters, and setters to the new class.",
            `Replace the parameter clump in method '${occ.methodName}()' with a single parameter of type '${suggestedClass}'.`,
            "Update callers to instantiate and pass the new parameter object."
          ],
          reason: `Method '${occ.methodName}()' parameters (${occ.names.join(', ')}) form a Data Clump of size ${clumpTypes.length}. This same parameter group appears in ${occurrences.length} methods.`
        });
      }
    }
  }

  return {
    status: 'success',
    thresholds: {
      externalThreshold: threshold,
      envyRatio: ratio,
      godClassLoc: GOD_CLASS_LOC,
      godClassFields: GOD_CLASS_FIELDS,
      godClassMethods: GOD_CLASS_METHODS,
      godClassTcc: GOD_CLASS_TCC,
      brainMethodLoc: BRAIN_METHOD_LOC,
      brainMethodComplexity: BRAIN_METHOD_COMPLEXITY,
      brainMethodNesting: BRAIN_METHOD_NESTING
    },
    summary: {
      methodsAnalyzed: methods.length,
      totalDetections: detections.length,
      smellsByType: {
        "Feature Envy": detections.filter(d => d.smellType === "Feature Envy").length,
        "God Class": detections.filter(d => d.smellType === "God Class").length,
        "Brain Method": detections.filter(d => d.smellType === "Brain Method").length,
        "Data Clump": detections.filter(d => d.smellType === "Data Clump").length
      }
    },
    detections
  };
}
