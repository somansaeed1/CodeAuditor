"""
AuraScope - Advanced Multi-Smell Code Quality Analyzer & Refactoring Engine

Description:
    Analyzes Java source code files for 4 code smells:
    1. Feature Envy
    2. God Class (Large Class / Low Cohesion)
    3. Brain Method (Complex/Long Method)
    4. Data Clumps (Repeated Parameter Groups)
"""

import os
import re
import sys
import json

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

# Thresholds
EXTERNAL_THRESHOLD = 3
ENVY_RATIO = 2.0

GOD_CLASS_LOC_THRESHOLD = 250
GOD_CLASS_FIELDS_THRESHOLD = 8
GOD_CLASS_METHODS_THRESHOLD = 12
GOD_CLASS_TCC_THRESHOLD = 0.33

BRAIN_METHOD_LOC_THRESHOLD = 45
BRAIN_METHOD_COMPLEXITY_THRESHOLD = 8
BRAIN_METHOD_NESTING_THRESHOLD = 3

DATA_CLUMP_SIZE_THRESHOLD = 3

# Ignored prefixes for Feature Envy
IGNORED_PREFIXES = {
    'System', 'Math', 'String', 'Integer', 'Float', 'Double',
    'Boolean', 'Long', 'Object', 'Arrays', 'Collections',
    'Log', 'Logger', 'Build', 'Color', 'Context', 'R',
    'super', 'this'
}

# ─────────────────────────────────────────────
# STEP 1: PARSING HELPERS
# ─────────────────────────────────────────────

def collect_java_files(folder_path):
    java_files = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith('.java'):
                java_files.append(os.path.join(root, file))
    return java_files

def extract_class_name(source_code):
    match = re.search(r"^(?:public|private|protected|abstract|final|\s)*class\s+(\w+)", source_code, re.MULTILINE)
    return match.group(1) if match else None

def clean_source_code(code):
    # Remove string literals to avoid false positives
    cleaned = re.sub(r'"[^"]*"', '""', code)
    # Remove comments
    cleaned = re.sub(r'//[^\n]*', '', cleaned)
    cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
    return cleaned

def extract_fields(source_code, methods_code_blocks):
    """
    Finds class-level field declarations.
    We remove method body blocks to avoid matching local variables.
    """
    remaining_code = source_code
    for block in methods_code_blocks:
        remaining_code = remaining_code.replace(block, "")

    # Clean the remaining code (comments, strings)
    cleaned = clean_source_code(remaining_code)

    # Regex for Java fields: type name [= value];
    # Matches words followed by name and semicolon, ignoring methods (which should be removed)
    field_pattern = re.compile(
        r'(?:public|private|protected|static|final|transient|volatile|\s)*'
        r'\b([\w<>\[\]]+)\s+(\w+)\s*(?:=\s*[^;]+)?\s*;',
        re.MULTILINE
    )
    
    fields = []
    for match in field_pattern.finditer(cleaned):
        field_type, field_name = match.groups()
        # Avoid common false matches
        if field_name not in ('class', 'return', 'package', 'import'):
            fields.append({"type": field_type, "name": field_name})
    return fields

def extract_methods(source_code):
    """
    Extracts methods and returns list of dicts:
    { name, start_line, body, params, param_str }
    """
    methods = []
    lines = source_code.split('\n')

    # Regex to match Java method declarations
    method_pattern = re.compile(
        r'^\s*(?:(?:public|private|protected|static|final|synchronized|abstract|native|'
        r'strictfp|default|transient|volatile)\s+)*'
        r'(?!if|for|while|switch|catch|try|else|return|new|throw)'
        r'([\w<>\[\],\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{'
    )

    i = 0
    while i < len(lines):
        line = lines[i]
        match = method_pattern.match(line)
        if match:
            ret_type_or_mods = match.group(1).strip()
            method_name = match.group(2).strip()
            param_str = match.group(3).strip()
            start_line = i + 1

            # Extract body by brace counting
            body_lines = []
            brace_count = 0
            found_open = False

            for j in range(i, len(lines)):
                current = lines[j]
                body_lines.append(current)

                for char in current:
                    if char == '{':
                        brace_count += 1
                        found_open = True
                    elif char == '}':
                        brace_count -= 1

                if found_open and brace_count == 0:
                    break

            method_body = '\n'.join(body_lines)
            
            # Parse parameters
            params = []
            if param_str:
                parts = param_str.split(',')
                for p in parts:
                    p = p.strip()
                    if p:
                        tokens = p.split()
                        if len(tokens) >= 2:
                            p_name = tokens[-1]
                            p_type = ' '.join(tokens[:-1])
                            params.append({"type": p_type, "name": p_name})

            methods.append({
                "name": method_name,
                "start_line": start_line,
                "body": method_body,
                "params": params,
                "param_str": param_str,
                "ret_type": ret_type_or_mods
            })
        i += 1

    return methods

# ─────────────────────────────────────────────
# STEP 2: SMELL DETECTION RULES
# ─────────────────────────────────────────────

def count_accesses(method_body, fields):
    """
    Counts internal accesses (to class fields or 'this') and external accesses.
    """
    cleaned = clean_source_code(method_body)

    # Count internal accesses: this.something or direct access to class field names
    internal_count = len(re.findall(r'\bthis\s*\.\s*\w+', cleaned))
    
    # Also add direct class field accesses (if they appear as whole words)
    field_names = {f["name"] for f in fields}
    for field in field_names:
        # Match field names not preceded by a dot (which would make it an external access or this.field)
        # We search for field name as word, but ensure it's not obj.field (unless obj is this)
        matches = re.finditer(rf'\b{field}\b', cleaned)
        for m in matches:
            start = m.start()
            # check if preceded by a dot
            preceded_by_dot = False
            # Look backwards for non-whitespace
            idx = start - 1
            while idx >= 0 and cleaned[idx].isspace():
                idx -= 1
            if idx >= 0 and cleaned[idx] == '.':
                # Check if it is "this."
                # Look backwards from dot for "this"
                this_idx = idx - 1
                while this_idx >= 0 and cleaned[this_idx].isspace():
                    this_idx -= 1
                if this_idx >= 3 and cleaned[this_idx-3:this_idx+1] == 'this':
                    preceded_by_dot = False # this.field is internal
                else:
                    preceded_by_dot = True # obj.field is external
            
            if not preceded_by_dot:
                internal_count += 1

    # Count external accesses: object.method() or object.field
    external_pattern = re.compile(r'\b([a-z][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_]\w*)\s*(?:\()?')
    external_matches = external_pattern.findall(cleaned)

    external_objects = {}
    external_count = 0

    for obj, member in external_matches:
        if obj in IGNORED_PREFIXES:
            continue
        if obj in ('this', 'super'):
            continue
        if obj not in external_objects:
            external_objects[obj] = 0
        external_objects[obj] += 1
        external_count += 1

    most_envied = None
    max_access = 0
    for obj, count in external_objects.items():
        if count > max_access:
            max_access = count
            most_envied = obj

    return internal_count, external_count, most_envied, max_access

def calculate_complexity(method_body):
    """
    Computes Cyclomatic Complexity based on decision statements.
    """
    cleaned = clean_source_code(method_body)
    keywords = re.findall(r'\b(if|for|while|catch|case)\b', cleaned)
    operators = re.findall(r'(&&|\|\|)', cleaned)
    return 1 + len(keywords) + len(operators)

def calculate_nesting(method_body):
    """
    Computes maximum nested brace level.
    """
    max_depth = 0
    current_depth = 0
    for char in method_body:
        if char == '{':
            current_depth += 1
            if current_depth > max_depth:
                max_depth = current_depth
        elif char == '}':
            current_depth -= 1
    return max_depth

def calculate_tcc(methods, fields, cleaned_code):
    """
    Computes Tight Class Cohesion (TCC).
    TCC = Cohesive Pairs / Total Pairs
    """
    if len(methods) <= 1 or not fields:
        return 1.0

    field_names = {f["name"] for f in fields}
    method_accessed_fields = []

    for m in methods:
        accessed = set()
        m_cleaned = clean_source_code(m["body"])
        for f in field_names:
            if re.search(rf'\b{f}\b', m_cleaned):
                accessed.add(f)
        method_accessed_fields.append(accessed)

    # Count pairs of methods that share at least one field
    cohesive_pairs = 0
    total_pairs = 0
    n = len(methods)

    for i in range(n):
        for j in range(i + 1, n):
            total_pairs += 1
            shared = method_accessed_fields[i].intersection(method_accessed_fields[j])
            if shared:
                cohesive_pairs += 1

    return cohesive_pairs / total_pairs if total_pairs > 0 else 1.0

def count_lines(code):
    cleaned = clean_source_code(code)
    lines = [l.strip() for l in cleaned.split('\n')]
    non_empty = [l for l in lines if l]
    return len(non_empty)

# ─────────────────────────────────────────────
# STEP 3: MAIN DETECTOR ENGINE
# ─────────────────────────────────────────────

def analyze_java_project(folder_path):
    java_files = collect_java_files(folder_path)
    
    all_detections = []
    files_analyzed = 0
    smelly_files = set()
    
    # Store parameter signatures for Data Clump detection
    # Format: { tuple(types): [ {class, method, file, line, names} ] }
    param_groups = {}
    
    file_classes_map = {}

    for file_path in java_files:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                source_code = f.read()
        except Exception as e:
            continue
            
        class_name = extract_class_name(source_code)
        if not class_name:
            continue
            
        files_analyzed += 1
        file_classes_map[class_name] = file_path
        
        methods = extract_methods(source_code)
        method_bodies = [m["body"] for m in methods]
        fields = extract_fields(source_code, method_bodies)
        
        class_loc = count_lines(source_code)
        
        # 1. GOD CLASS DETECTION
        tcc = calculate_tcc(methods, fields, source_code)
        is_god_class = (
            class_loc >= GOD_CLASS_LOC_THRESHOLD and
            len(fields) >= GOD_CLASS_FIELDS_THRESHOLD and
            len(methods) >= GOD_CLASS_METHODS_THRESHOLD and
            tcc < GOD_CLASS_TCC_THRESHOLD
        )
        
        if is_god_class:
            smelly_files.add(file_path)
            all_detections.append({
                "smellType": "God Class",
                "file": os.path.basename(file_path),
                "path": os.path.abspath(file_path),
                "className": class_name,
                "details": {
                    "lines": class_loc,
                    "fields": len(fields),
                    "methods": len(methods),
                    "tcc": round(tcc, 2)
                },
                "actualPlace": {
                    "file": "Split class file",
                    "className": f"Extract details of {class_name} into cohesive helper classes"
                },
                "refactoringSteps": [
                    "Identify groups of methods and attributes that form logical sub-modules (low cohesion clusters).",
                    "Create a new class for each cohesive group (e.g., extracting database, printing, or configuration logic).",
                    "Use 'Extract Class' refactoring to move the sub-module attributes and methods to the new class.",
                    "If the class has subclasses that only use a subset of features, consider 'Extract Subclass' or 'Extract Interface'."
                ],
                "reason": f"Class '{class_name}' is too large ({class_loc} lines, {len(fields)} fields, {len(methods)} methods) and has very low cohesion (TCC = {round(tcc, 2)}). It has too many responsibilities."
            })
            
        # Analyze methods
        for m in methods:
            m_loc = count_lines(m["body"])
            m_complexity = calculate_complexity(m["body"])
            m_nesting = calculate_nesting(m["body"])
            
            # Record params for Data Clump check
            if len(m["params"]) >= DATA_CLUMP_SIZE_THRESHOLD:
                # Get type sequence
                types_tuple = tuple(p["type"] for p in m["params"])
                names_list = [p["name"] for p in m["params"]]
                
                if types_tuple not in param_groups:
                    param_groups[types_tuple] = []
                param_groups[types_tuple].append({
                    "class": class_name,
                    "method": m["name"],
                    "file": os.path.basename(file_path),
                    "path": os.path.abspath(file_path),
                    "line": m["start_line"],
                    "names": names_list
                })
            
            # 2. FEATURE ENVY DETECTION
            # Skip constructor
            if m["name"] != class_name and m_loc >= 3:
                internal, external, envied_obj, envy_count = count_accesses(m["body"], fields)
                if external >= EXTERNAL_THRESHOLD and external >= ENVY_RATIO * (internal + 1):
                    # Try to infer envied class type from method parameters
                    envied_class = "TargetClass"
                    for p in m["params"]:
                        if p["name"] == envied_obj:
                            envied_class = p["type"]
                            break
                    
                    smelly_files.add(file_path)
                    
                    # Compute actual place where this belongs (the envied class)
                    target_file = "Unknown (External Class)"
                    # See if we have this class in our scanned files
                    for c_name, c_path in file_classes_map.items():
                        if c_name == envied_class:
                            target_file = os.path.basename(c_path)
                            break

                    all_detections.append({
                        "smellType": "Feature Envy",
                        "file": os.path.basename(file_path),
                        "path": os.path.abspath(file_path),
                        "className": class_name,
                        "details": {
                            "methodName": m["name"],
                            "line": m["start_line"],
                            "internalAccesses": internal,
                            "externalAccesses": external,
                            "enviedObject": envied_obj,
                            "enviedClass": envied_class
                        },
                        "actualPlace": {
                            "file": target_file,
                            "className": envied_class
                        },
                        "refactoringSteps": [
                            f"Move the envied method '{m['name']}' to class '{envied_class}' using the 'Move Method' pattern.",
                            f"In class '{class_name}', replace the original method body with a delegation call (e.g., `return {envied_obj}.{m['name']}(...);`) or update all call sites to call '{envied_class}' directly.",
                            f"Remove the '{envied_class}' parameter from the method signature inside '{envied_class}' and replace references to `{envied_obj}.` with `this.`."
                        ],
                        "reason": f"Method '{m['name']}()' accesses fields/methods of object '{envied_obj}' of type '{envied_class}' ({external} times) much more than its own class '{class_name}' ({internal} times)."
                    })
                    
            # 3. BRAIN METHOD DETECTION
            is_brain_method = (
                m_loc >= BRAIN_METHOD_LOC_THRESHOLD and
                m_complexity >= BRAIN_METHOD_COMPLEXITY_THRESHOLD and
                m_nesting >= BRAIN_METHOD_NESTING_THRESHOLD
            )
            
            if is_brain_method:
                smelly_files.add(file_path)
                all_detections.append({
                    "smellType": "Brain Method",
                    "file": os.path.basename(file_path),
                    "path": os.path.abspath(file_path),
                    "className": class_name,
                    "details": {
                        "methodName": m["name"],
                        "line": m["start_line"],
                        "lines": m_loc,
                        "complexity": m_complexity,
                        "nestingDepth": m_nesting
                    },
                    "actualPlace": {
                        "file": os.path.basename(file_path),
                        "className": f"{class_name} (needs split into smaller helper methods)"
                    },
                    "refactoringSteps": [
                        "Identify independent sub-tasks or logical blocks in the method body (e.g. input validation, calculation steps, result formatting).",
                        "Extract these logical blocks into small, well-named private helper methods inside the class using the 'Extract Method' pattern.",
                        "If the method is bloated due to holding too many local variables, consider refactoring it using the 'Replace Method with Method Object' pattern."
                    ],
                    "reason": f"Method '{m['name']}()' has high complexity (Complexity = {m_complexity}, LOC = {m_loc}, Max Nesting Depth = {m_nesting}). It does too much and is hard to test and maintain."
                })

    # 4. DATA CLUMPS DETECTION
    # We find parameter signatures of size >= 3 that appear in 2 or more methods
    for types_tuple, occurrences in param_groups.items():
        if len(occurrences) >= 2:
            # We found a Data Clump!
            # Formulate class suggestions: e.g. if types are (int, int, int, int) and names contain (x, y, w, h), recommend "Rectangle" or "Bounds"
            # If street, city, zip -> Address.
            clump_types = list(types_tuple)
            representative = occurrences[0]
            rep_names = representative["names"]
            
            # Simple heuristic for suggesting a class name
            suggested_class = "NewParameterObject"
            names_lower = [n.lower() for n in rep_names]
            if any("street" in n or "city" in n or "zip" in n for n in names_lower):
                suggested_class = "Address"
            elif any("latitude" in n or "longitude" in n or "coordinate" in n for n in names_lower):
                suggested_class = "Coordinates"
            elif any("width" in n or "height" in n or "size" in n for n in names_lower):
                suggested_class = "Dimensions"
            elif any("x" in n and "y" in n for n in names_lower):
                suggested_class = "Point"
            elif any("start" in n and "end" in n or "date" in n for n in names_lower):
                suggested_class = "DateRange"
            else:
                # Capitalize first parameter type + "Group"
                suggested_class = f"{clump_types[0].capitalize()}Group"

            for occ in occurrences:
                smelly_files.add(occ["path"])
                all_detections.append({
                    "smellType": "Data Clump",
                    "file": occ["file"],
                    "path": occ["path"],
                    "className": occ["class"],
                    "details": {
                        "methodName": occ["method"],
                        "line": occ["line"],
                        "clumpedParameters": [f"{t} {n}" for t, n in zip(clump_types, occ["names"])],
                        "occurrencesCount": len(occurrences)
                    },
                    "actualPlace": {
                        "file": f"{suggested_class}.java",
                        "className": suggested_class
                    },
                    "refactoringSteps": [
                        f"Create a new class '{suggested_class}' containing fields for each of the parameters: {', '.join(clump_types)}.",
                        "Add a constructor, getters, and setters to the new class.",
                        f"Replace the parameter clump in method '{occ['method']}()' with a single parameter of type '{suggested_class}'.",
                        "Update the calls to this method by instantiating and passing the new parameter object."
                    ],
                    "reason": f"Method '{occ['method']}()' parameters ({', '.join(occ['names'])}) form a Data Clump of size {len(clump_types)}. This same parameter group appears in {len(occurrences)} methods across the codebase."
                })

    # Prepare final output structure
    output_data = {
        "status": "success",
        "thresholds": {
            "externalThreshold": EXTERNAL_THRESHOLD,
            "envyRatio": ENVY_RATIO,
            "godClassLoc": GOD_CLASS_LOC_THRESHOLD,
            "godClassFields": GOD_CLASS_FIELDS_THRESHOLD,
            "godClassMethods": GOD_CLASS_METHODS_THRESHOLD,
            "godClassTcc": GOD_CLASS_TCC_THRESHOLD,
            "brainMethodLoc": BRAIN_METHOD_LOC_THRESHOLD,
            "brainMethodComplexity": BRAIN_METHOD_COMPLEXITY_THRESHOLD,
            "brainMethodNesting": BRAIN_METHOD_NESTING_THRESHOLD
        },
        "summary": {
            "filesAnalyzed": files_analyzed,
            "filesWithSmell": len(smelly_files),
            "totalDetections": len(all_detections),
            "smellsByType": {
                "Feature Envy": sum(1 for d in all_detections if d["smellType"] == "Feature Envy"),
                "God Class": sum(1 for d in all_detections if d["smellType"] == "God Class"),
                "Brain Method": sum(1 for d in all_detections if d["smellType"] == "Brain Method"),
                "Data Clump": sum(1 for d in all_detections if d["smellType"] == "Data Clump")
            }
        },
        "detections": all_detections
    }
    
    return output_data

if __name__ == '__main__':
    args = sys.argv[1:]
    json_output = False
    
    # Process --json argument
    if "--json" in args:
        json_output = True
        args.remove("--json")
        
    # Standard overrides if parameters provided
    if "--threshold" in args:
        idx = args.index("--threshold")
        if idx + 1 < len(args):
            try:
                EXTERNAL_THRESHOLD = int(args[idx + 1])
            except ValueError: pass
            args.pop(idx + 1)
            args.pop(idx)
            
    if "--ratio" in args:
        idx = args.index("--ratio")
        if idx + 1 < len(args):
            try:
                ENVY_RATIO = float(args[idx + 1])
            except ValueError: pass
            args.pop(idx + 1)
            args.pop(idx)

    if len(args) < 1:
        if json_output:
            print(json.dumps({"status": "error", "message": "Usage: python aurascope_detector.py <folder_path> [--json]"}))
        else:
            print("Usage: python aurascope_detector.py <folder_path> [--json]")
        sys.exit(1)

    folder = args[0]
    if not os.path.isdir(folder):
        if json_output:
            print(json.dumps({"status": "error", "message": f"Folder not found: {folder}"}))
        else:
            print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)

    result = analyze_java_project(folder)
    
    if json_output:
        print(json.dumps(result, indent=2))
    else:
        # Beautiful console print summary
        print("=" * 80)
        print("  AURASCOPE CODE QUALITY DETECTOR")
        print("=" * 80)
        print(f"  Scanning directory: {folder}\n")
        print(f"  Files analyzed: {result['summary']['filesAnalyzed']}")
        print(f"  Smelly files:   {result['summary']['filesWithSmell']}")
        print(f"  Total smells:   {result['summary']['totalDetections']}")
        print("-" * 80)
        print("  SMELLS BY TYPE:")
        for k, v in result["summary"]["smellsByType"].items():
            print(f"    - {k}: {v}")
        print("=" * 80)
        
        for d in result["detections"]:
            print(f"\n[{d['smellType'].upper()}] in file {d['file']} (Class: {d['className']})")
            print(f"  Reason: {d['reason']}")
            print("  Refactoring Steps:")
            for idx, step in enumerate(d["refactoringSteps"]):
                print(f"    {idx+1}. {step}")
        print("=" * 80)
