"""
Feature Envy Detector for Java Source Code

Description:
    A script that detects Feature Envy code smell in Java source files.
    Feature Envy occurs when a method accesses data or calls methods of
    another class more than its own class. This script analyzes each method
    in every Java file inside a given folder and reports methods where
    external class accesses significantly outnumber internal accesses.

Usage:
    python feature_envy_detector.py <folder_path>

Output:
    Prints detected Feature Envy methods with file name, method name,
    line number, and access counts.
"""

import os
import re
import sys
import json


# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

# A method is flagged as Feature Envy if:
# 1. External accesses > EXTERNAL_THRESHOLD
# 2. External accesses > ENVY_RATIO * internal accesses
EXTERNAL_THRESHOLD = 3
ENVY_RATIO = 2.0

# Common Java standard library prefixes to ignore
# (We only care about project-level class accesses)
IGNORED_PREFIXES = {
    'System', 'Math', 'String', 'Integer', 'Float', 'Double',
    'Boolean', 'Long', 'Object', 'Arrays', 'Collections',
    'Log', 'Logger', 'Build', 'Color', 'Context', 'R',
    'super', 'this'
}


# ─────────────────────────────────────────────
# STEP 1: COLLECT JAVA FILES FROM FOLDER
# ─────────────────────────────────────────────

def collect_java_files(folder_path):
    """
    Recursively collects all .java files from the given folder.
    Returns a list of full file paths.
    """
    java_files = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith('.java'):
                java_files.append(os.path.join(root, file))
    return java_files


# ─────────────────────────────────────────────
# STEP 2: EXTRACT CLASS NAME FROM FILE
# ─────────────────────────────────────────────

def extract_class_name(source_code):
    """
    Extracts the primary class name from Java source code.
    Looks for: public class ClassName or class ClassName
    """
    match = re.search(r"^(?:public|private|protected|abstract|final|\s)*class\s+(\w+)", source_code, re.MULTILINE)
    if match:
        return match.group(1)
    return None


# ─────────────────────────────────────────────
# STEP 3: EXTRACT METHODS FROM SOURCE CODE
# ─────────────────────────────────────────────

def extract_methods(source_code):
    """
    Extracts methods from Java source code.
    Returns a list of tuples: (method_name, start_line, method_body)

    Strategy:
    - Find method signatures using regex
    - Extract the method body by counting curly braces
    """
    methods = []
    lines = source_code.split('\n')

    # Pattern to match Java method declarations
    # Matches: [modifiers] returnType methodName(params) {
    method_pattern = re.compile(
        r'^\s*(?:(?:public|private|protected|static|final|synchronized|abstract|native|'
        r'strictfp|default|transient|volatile)\s+)*'
        r'(?!if|for|while|switch|catch|try|else|return|new|throw)'
        r'[\w<>\[\],\s]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{'
    )

    i = 0
    while i < len(lines):
        line = lines[i]
        match = method_pattern.match(line)
        if match:
            method_name = match.group(1)
            start_line = i + 1  # 1-indexed

            # Extract method body by counting braces
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
            methods.append((method_name, start_line, method_body))

        i += 1

    return methods


# ─────────────────────────────────────────────
# STEP 4: COUNT EXTERNAL vs INTERNAL ACCESSES
# ─────────────────────────────────────────────

def count_accesses(method_body, class_name):
    """
    Counts external and internal field/method accesses in a method body.

    Internal accesses: references to 'this.something' or the class's own fields
    External accesses: references like 'someObject.method()' or 'SomeClass.field'

    Returns: (internal_count, external_count, external_objects)
    """

    # Remove string literals to avoid false positives
    cleaned = re.sub(r'"[^"]*"', '""', method_body)
    # Remove comments
    cleaned = re.sub(r'//[^\n]*', '', cleaned)
    cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)

    # Count internal accesses: this.something
    internal_pattern = re.compile(r'\bthis\s*\.\s*\w+')
    internal_matches = internal_pattern.findall(cleaned)
    internal_count = len(internal_matches)

    # Count external accesses: object.method() or object.field
    # Pattern: lowercase identifier followed by dot and another identifier
    external_pattern = re.compile(r'\b([a-z][a-zA-Z0-9_]*)\s*\.\s*([a-zA-Z_]\w*)\s*(?:\()?')
    external_matches = external_pattern.findall(cleaned)

    external_objects = {}
    external_count = 0

    for obj, member in external_matches:
        # Skip ignored prefixes and very short names
        if obj in IGNORED_PREFIXES:
            continue
        if obj in ('this', 'super'):
            continue
        # Skip if it looks like a local variable call chain (hard to distinguish perfectly)
        # We count unique object references
        if obj not in external_objects:
            external_objects[obj] = 0
        external_objects[obj] += 1
        external_count += 1

    # Find the most accessed external object
    most_envied = None
    max_access = 0
    for obj, count in external_objects.items():
        if count > max_access:
            max_access = count
            most_envied = obj

    return internal_count, external_count, most_envied, max_access


# ─────────────────────────────────────────────
# STEP 5: DETECT FEATURE ENVY IN ONE FILE
# ─────────────────────────────────────────────

def detect_feature_envy_in_file(file_path):
    """
    Analyzes a single Java file and returns a list of Feature Envy detections.
    Each detection is a dict with file, class, method, line, and access info.
    """
    detections = []

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            source_code = f.read()
    except Exception as e:
        print(f"  [ERROR] Could not read {file_path}: {e}")
        return detections

    class_name = extract_class_name(source_code)
    if not class_name:
        return detections

    methods = extract_methods(source_code)

    for method_name, start_line, method_body in methods:
        # Skip very short methods (getters/setters — not meaningful)
        if method_body.count('\n') < 3:
            continue

        # Skip constructors
        if method_name == class_name:
            continue

        internal_count, external_count, most_envied, envy_count = count_accesses(
            method_body, class_name
        )

        # Apply detection criteria
        if (external_count >= EXTERNAL_THRESHOLD and
                external_count >= ENVY_RATIO * (internal_count + 1)):

            detections.append({
                'file': file_path,
                'class': class_name,
                'method': method_name,
                'line': start_line,
                'internal_accesses': internal_count,
                'external_accesses': external_count,
                'most_envied_object': most_envied,
                'envy_count': envy_count
            })

    return detections


# ─────────────────────────────────────────────
# STEP 6: ANALYZE ENTIRE FOLDER
# ─────────────────────────────────────────────

def analyze_folder(folder_path, json_output=False):
    """
    Main analysis function. Collects all Java files,
    runs detection on each, and prints results.
    """
    global EXTERNAL_THRESHOLD, ENVY_RATIO

    java_files = collect_java_files(folder_path)

    all_detections = []
    files_analyzed = 0
    files_with_smell = set()

    for file_path in java_files:
        detections = detect_feature_envy_in_file(file_path)
        all_detections.extend(detections)
        files_analyzed += 1
        if detections:
            files_with_smell.add(file_path)

    if json_output:
        output_data = {
            "status": "success",
            "thresholds": {
                "externalThreshold": EXTERNAL_THRESHOLD,
                "envyRatio": ENVY_RATIO
            },
            "summary": {
                "filesAnalyzed": files_analyzed,
                "filesWithSmell": len(files_with_smell),
                "totalDetections": len(all_detections)
            },
            "detections": []
        }
        for d in all_detections:
            output_data["detections"].append({
                "file": os.path.basename(d['file']),
                "path": os.path.abspath(d['file']),
                "class": d['class'],
                "method": d['method'],
                "line": d['line'],
                "internalAccesses": d['internal_accesses'],
                "externalAccesses": d['external_accesses'],
                "mostEnviedObject": d['most_envied_object'],
                "envyCount": d['envy_count'],
                "reason": f"Method accesses '{d['most_envied_object']}' more than its own class. It may belong in a different class."
            })
        print(json.dumps(output_data, indent=2))
        return

    # Standard Text Print Output
    print("=" * 70)
    print("  FEATURE ENVY DETECTOR")
    print("  Course: Software Re-Engineering (CSC327)")
    print("=" * 70)
    print(f"\n  Scanning folder: {folder_path}")
    print(f"  Detection threshold: {EXTERNAL_THRESHOLD} external accesses")
    print(f"  Envy ratio: {ENVY_RATIO}x more external than internal\n")
    print("=" * 70)

    if not java_files:
        print("\n  [ERROR] No Java files found in the specified folder.")
        return

    print(f"\n  Found {len(java_files)} Java file(s). Analyzing...\n")

    # ── PRINT RESULTS ──
    if not all_detections:
        print("  No Feature Envy detected in the analyzed files.")
    else:
        print(f"  DETECTION RESULTS")
        print(f"  Total Feature Envy instances found: {len(all_detections)}")
        print(f"  Files affected: {len(files_with_smell)}")
        print("=" * 70)

        current_file = None

        for d in all_detections:
            file_name = os.path.basename(d['file'])

            if d['file'] != current_file:
                current_file = d['file']
                print(f"\n  FILE: {file_name}")
                print(f"  PATH: {d['file']}")
                print(f"  CLASS: {d['class']}")
                print()

            print(f"    [FEATURE ENVY DETECTED]")
            print(f"    Smell Type  : Feature Envy")
            print(f"    Method      : {d['method']}()")
            print(f"    Line Number : {d['line']}")
            print(f"    Internal    : {d['internal_accesses']} access(es) to own class")
            print(f"    External    : {d['external_accesses']} access(es) to other classes")
            print(f"    Most Envied : '{d['most_envied_object']}' ({d['envy_count']} accesses)")
            print(f"    Reason      : Method accesses '{d['most_envied_object']}' more than")
            print(f"                  its own class. It may belong in a different class.")
            print()

    # ── PRINT SUMMARY ──
    print("=" * 70)
    print(f"\n  SUMMARY")
    print(f"  Files analyzed      : {files_analyzed}")
    print(f"  Files with smell    : {len(files_with_smell)}")
    print(f"  Total detections    : {len(all_detections)}")
    print()

    if all_detections:
        print("  FILES WITH FEATURE ENVY:")
        for f in files_with_smell:
            count = sum(1 for d in all_detections if d['file'] == f)
            print(f"    - {os.path.basename(f)}: {count} method(s) affected")

    print("\n" + "=" * 70)
    print("  Analysis complete.")
    print("=" * 70)


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == '__main__':
    args = sys.argv[1:]
    json_output = False
    if "--json" in args:
        json_output = True
        args.remove("--json")

    if "--threshold" in args:
        idx = args.index("--threshold")
        if idx + 1 < len(args):
            try:
                EXTERNAL_THRESHOLD = int(args[idx + 1])
            except ValueError:
                pass
            args.pop(idx + 1)
            args.pop(idx)

    if "--ratio" in args:
        idx = args.index("--ratio")
        if idx + 1 < len(args):
            try:
                ENVY_RATIO = float(args[idx + 1])
            except ValueError:
                pass
            args.pop(idx + 1)
            args.pop(idx)

    if len(args) < 1:
        if json_output:
            print(json.dumps({"status": "error", "message": "Usage: python feature_envy_detector.py <folder_path> [--json] [--threshold <int>] [--ratio <float>]"}))
        else:
            print("Usage: python feature_envy_detector.py <folder_path> [--json] [--threshold <int>] [--ratio <float>]")
            print("Example: python feature_envy_detector.py C:\\lottie-android\\lottie\\src\\main\\java")
        sys.exit(1)

    folder = args[0]

    if not os.path.isdir(folder):
        if json_output:
            print(json.dumps({"status": "error", "message": f"Folder not found: {folder}"}))
        else:
            print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)

    analyze_folder(folder, json_output=json_output)
