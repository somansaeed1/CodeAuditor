# CodeAuditor

A full-stack web application for detecting and analyzing code smells in Java source code. Built with React + Vite (frontend), Express.js (backend), and Python (static analysis engine).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version: 2.0.0](https://img.shields.io/badge/Version-2.0.0-blue.svg)]()
[![Node.js: 18+](https://img.shields.io/badge/Node.js-18+-green.svg)]()
[![Python: 3.x](https://img.shields.io/badge/Python-3.x-green.svg)]()

## 🔍 Detected Code Smells

CodeAuditor detects 4 major code smells:

- **Feature Envy** – Methods overly dependent on external objects
- **God Class** – Classes with excessive responsibilities  
- **Brain Method** – Complex methods with high cyclomatic complexity
- **Data Clumps** – Repeated parameter groups indicating missing abstractions

## ✨ Features

- **Multi-mode scanning** – Folder, ZIP archive, or code snippet analysis
- **Interactive dashboard** – Health score gauge and smell distribution cards
- **Real-time metrics** – LOC, complexity, cohesion, and severity tracking
- **Refactoring guide** – Step-by-step improvement suggestions
- **Dark/Light themes** – User preference support
- **Export reports** – JSON format for documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.7+

### Installation

```bash
# Clone the repository
git clone https://github.com/somansaeed1/CodeAuditor.git
cd CodeAuditor

# Install dependencies
npm run install-all

# Start the application
npm start
```

**Access the application:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

## 📖 Usage

### 1. Code Sandbox (Recommended for Testing)
Paste Java code directly in the web interface:

```java
// Example: God Class
public class DataProcessor {
    private String name, email, phone, address, city, zipCode, country, state;
    
    public void processData() { /* logic */ }
    public void validateData() { /* logic */ }
    public void saveData() { /* logic */ }
}
```

Click "Analyze" to see detected smells and metrics.

### 2. Folder Scanner
Scan a local directory of Java files with optional threshold customization.

### 3. Project Manager
Upload ZIP archives containing Java projects for batch analysis.

## 📁 Project Structure

```
CodeAuditor/
├── frontend/              # React + Vite UI
│   ├── src/
│   │   ├── components/   # Dashboard, Scanner, Sandbox, Guide
│   │   ├── utils/        # Detection and refactoring logic
│   │   └── App.jsx
│   └── vite.config.js
│
├── backend/              # Express.js API
│   ├── server.js         # API endpoints
│   ├── projects/         # Sample projects and reports
│   └── uploads/          # Temporary files
│
├── python_script/        # Analysis engine
│   ├── aurascope_detector.py      # Main detector
│   └── feature_envy_detector.py   # Legacy detector
│
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Health check |
| POST | `/api/scan-folder` | Analyze Java directory |
| POST | `/api/scan-code` | Analyze code snippet |
| POST | `/api/projects/upload` | Upload and analyze ZIP |
| GET | `/api/projects` | List all projects |

### Example Request

```bash
curl -X POST http://localhost:5000/api/scan-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class Test { }",
    "fileName": "Test.java"
  }'
```

## ⚙️ Configuration

Default detection thresholds in `python_script/aurascope_detector.py`:

```python
EXTERNAL_THRESHOLD = 3           # Feature Envy
ENVY_RATIO = 2.0                 # Feature Envy ratio
GOD_CLASS_LOC_THRESHOLD = 250    # God Class LOC
GOD_CLASS_FIELDS_THRESHOLD = 8   # God Class fields
GOD_CLASS_METHODS_THRESHOLD = 12 # God Class methods
BRAIN_METHOD_LOC_THRESHOLD = 45  # Brain Method LOC
BRAIN_METHOD_COMPLEXITY_THRESHOLD = 8  # Brain Method complexity
```

## 💻 Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19 + Vite 8 + CSS3 |
| Backend | Express.js 4 + Node.js 18+ |
| Analysis | Python 3 + AST/Regex |
| Build | npm + Concurrently |

## 🛠️ Development

```bash
# Backend only
npm run backend

# Frontend only  
npm run frontend

# Build frontend for production
npm run build --prefix frontend
```

## 📊 Sample Output

```json
{
  "status": "success",
  "summary": {
    "filesAnalyzed": 5,
    "filesWithSmell": 3,
    "totalDetections": 7,
    "smellsByType": {
      "Feature Envy": 3,
      "God Class": 0,
      "Brain Method": 1,
      "Data Clump": 3
    }
  },
  "detections": [
    {
      "smellType": "Feature Envy",
      "file": "PaymentProcessor.java",
      "className": "PaymentProcessor",
      "methodName": "processPayment",
      "line": 45,
      "severity": "HIGH"
    }
  ]
}
```

## 🎯 Code Smell Details

### Feature Envy
Occurs when a method accesses another object's data more than its own. 

**Detection:** Counts external vs. internal accesses.  
**Refactoring:** Move method to the envied class.

### God Class
A class with too many responsibilities, fields, and methods with low cohesion.

**Detection:** LOC ≥ 250, Fields ≥ 8, Methods ≥ 12, TCC < 0.33.  
**Refactoring:** Extract classes for separate concerns.

### Brain Method
A complex method with multiple nested structures and high cyclomatic complexity.

**Detection:** LOC ≥ 45, Complexity ≥ 8, Nesting Depth ≥ 3.  
**Refactoring:** Extract smaller helper methods.

### Data Clump
Variables consistently passed together across methods indicate missing abstraction.

**Detection:** ≥ 3 parameters appear together in multiple methods.  
**Refactoring:** Create a domain object to group them.

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not starting | Verify Python 3.x is installed and in PATH |
| Frontend blank | Clear browser cache, check console for errors |
| Scans failing | Ensure Java files have valid syntax |
| ZIP upload error | Verify file is valid ZIP, under 50 MB |

## 📝 License

MIT License – See LICENSE file for details.

## 📚 Course Information

**Course:** Software Re-Engineering (CSC327)  
**Version:** 2.0.0  
**Last Updated:** May 30, 2026

## 🔗 Repository

[https://github.com/somansaeed1/CodeAuditor](https://github.com/somansaeed1/CodeAuditor)

---

For questions or issues, please visit the GitHub repository.
