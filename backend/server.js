const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Directories
const PYTHON_SCRIPT_PATH = path.resolve(__dirname, '../python_script/aurascope_detector.py');
const SCANNING_FILES_PATH = path.resolve(__dirname, '../scanning_files');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const PROJECTS_DIR = path.resolve(__dirname, 'projects');

// Create directories if they don't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP archive uploads are allowed.'));
    }
  }
});

// Health Check Endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'CodeAuditor backend service is active.' });
});

// Get default scan path (the scanning_files directory in the workspace)
app.get('/api/default-path', (req, res) => {
  res.json({
    workspaceRoot: path.resolve(__dirname, '..'),
    defaultScanPath: SCANNING_FILES_PATH
  });
});

// API Endpoint to scan a folder on the local machine
app.post('/api/scan-folder', (req, res) => {
  const { folderPath, threshold, ratio } = req.body;

  if (!folderPath) {
    return res.status(400).json({ status: 'error', message: 'folderPath is required.' });
  }

  const targetFolder = path.resolve(folderPath);

  if (!fs.existsSync(targetFolder)) {
    return res.status(404).json({ status: 'error', message: `Folder not found: ${targetFolder}` });
  }

  const args = [PYTHON_SCRIPT_PATH, targetFolder, '--json'];
  if (threshold !== undefined) {
    args.push('--threshold', String(threshold));
  }
  if (ratio !== undefined) {
    args.push('--ratio', String(ratio));
  }

  execFile('python', args, (error, stdout, stderr) => {
    if (error) {
      console.error('Execution error:', error);
      console.error('stderr:', stderr);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to run python detection script.',
        details: stderr || error.message
      });
    }

    try {
      const results = JSON.parse(stdout);
      res.json(results);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Raw output:', stdout);
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse JSON output from python script.',
        rawOutput: stdout
      });
    }
  });
});

// API Endpoint to scan pasted code block (Live Sandbox)
app.post('/api/scan-code', (req, res) => {
  const { code, fileName, threshold, ratio } = req.body;

  if (!code) {
    return res.status(400).json({ status: 'error', message: 'code is required.' });
  }

  const name = fileName || 'TempClass.java';
  if (!name.endsWith('.java')) {
    return res.status(400).json({ status: 'error', message: 'fileName must end in .java' });
  }

  // Create temp directory for scanning
  const tempDir = path.resolve(__dirname, 'temp_scan');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, name);
  fs.writeFileSync(tempFilePath, code, 'utf8');

  const args = [PYTHON_SCRIPT_PATH, tempDir, '--json'];
  if (threshold !== undefined) {
    args.push('--threshold', String(threshold));
  }
  if (ratio !== undefined) {
    args.push('--ratio', String(ratio));
  }

  execFile('python', args, (error, stdout, stderr) => {
    // Always clean up the temporary file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to run python detection script on code block.',
        details: stderr || error.message
      });
    }

    try {
      const results = JSON.parse(stdout);
      res.json(results);
    } catch (parseError) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to parse JSON output from python script.',
        rawOutput: stdout
      });
    }
  });
});

// API Endpoint to upload a .zip file and create a project
app.post('/api/projects/upload', upload.single('zipFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No zip file uploaded.' });
  }

  const projectNameInput = req.body.projectName || path.basename(req.file.originalname, '.zip');
  // Sanitize project name
  const projectName = projectNameInput.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const projectDir = path.join(PROJECTS_DIR, projectName);

  if (fs.existsSync(projectDir)) {
    // Overwrite: clear existing files in projectDir
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  fs.mkdirSync(projectDir, { recursive: true });

  const zipFilePath = req.file.path;

  // Extract ZIP using Python zipfile command-line utility
  const extractArgs = ['-m', 'zipfile', '-e', zipFilePath, projectDir];
  
  execFile('python', extractArgs, (extractError, extractStdout, extractStderr) => {
    // Delete temporary uploaded zip file
    try {
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
    } catch (err) {
      console.error('Could not clean up uploaded zip:', err);
    }

    if (extractError) {
      console.error('Extraction error:', extractError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to extract ZIP archive. Make sure it is a valid zip file.',
        details: extractStderr || extractError.message
      });
    }

    // Now, scan the extracted folder using the detector script
    const scanArgs = [PYTHON_SCRIPT_PATH, projectDir, '--json'];
    execFile('python', scanArgs, (scanError, scanStdout, scanStderr) => {
      if (scanError) {
        console.error('Scan error after extraction:', scanError);
        return res.status(500).json({
          status: 'error',
          message: 'Extraction succeeded, but scanning failed.',
          details: scanStderr || scanError.message
        });
      }

      try {
        const report = JSON.parse(scanStdout);
        // Enrich report with project metadata
        report.projectName = projectName;
        report.scannedAt = new Date().toISOString();

        // Write report to the project folder
        const reportPath = path.join(projectDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

        res.json(report);
      } catch (parseError) {
        console.error('Error parsing scanner output:', parseError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to parse JSON report from scanning engine.',
          rawOutput: scanStdout
        });
      }
    });
  });
});

// API Endpoint to list all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = [];
    if (fs.existsSync(PROJECTS_DIR)) {
      const dirs = fs.readdirSync(PROJECTS_DIR);
      for (const dir of dirs) {
        const reportPath = path.join(PROJECTS_DIR, dir, 'report.json');
        if (fs.existsSync(reportPath)) {
          try {
            const reportContent = fs.readFileSync(reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            projects.push({
              name: report.projectName || dir,
              scannedAt: report.scannedAt,
              summary: report.summary,
              path: path.join(PROJECTS_DIR, dir)
            });
          } catch (e) {
            console.error(`Failed to read report for project ${dir}:`, e);
          }
        }
      }
    }
    // Sort projects by scannedAt desc
    projects.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
    res.json({ status: 'success', projects });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// API Endpoint to fetch a specific project's report
app.get('/api/projects/:name/report', (req, res) => {
  const projectName = req.params.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const reportPath = path.join(PROJECTS_DIR, projectName, 'report.json');

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ status: 'error', message: `Report not found for project: ${projectName}` });
  }

  try {
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    const report = JSON.parse(reportContent);
    res.json(report);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// API Endpoint to download project report.json file
app.get('/api/projects/:name/download', (req, res) => {
  const projectName = req.params.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const reportPath = path.join(PROJECTS_DIR, projectName, 'report.json');

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ status: 'error', message: `Report not found for project: ${projectName}` });
  }

  res.download(reportPath, `${projectName}-smell-report.json`);
});

// API Endpoint to read a file's content (for generating refactoring suggestions)
app.get('/api/read-file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ status: 'error', message: 'path query parameter is required.' });
  }

  const resolvedPath = path.resolve(filePath);

  // Security check: ensure the file resides in the workspace
  const workspaceRoot = path.resolve(__dirname, '..');
  if (!resolvedPath.startsWith(workspaceRoot)) {
    return res.status(403).json({ status: 'error', message: 'Access denied.' });
  }

  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ status: 'error', message: 'File not found.' });
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    res.json({ status: 'success', content });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`AuraScope backend running on http://localhost:${PORT}`);
});
