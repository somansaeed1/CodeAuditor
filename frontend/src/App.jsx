import React, { useState, useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';
import Dashboard from './components/Dashboard';
import FolderScanner from './components/FolderScanner';
import CodeSandbox from './components/CodeSandbox';
import RefactorGuide from './components/RefactorGuide';
import ProjectManager from './components/ProjectManager';
import ScanHistory from './components/ScanHistory';
import SmellyFilesView from './components/SmellyFilesView';
import { generateRefactoringSuggestion } from './utils/refactoring';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'projects' | 'dashboard' | 'scanner' | 'sandbox' | 'files'
  const [config, setConfig] = useState({ threshold: 3, ratio: 2.0 });
  const [scanResult, setScanResult] = useState(null);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [scanningOnLoad, setScanningOnLoad] = useState(false);

  // Auto-scan default path on load if backend is available
  useEffect(() => {
    setScanningOnLoad(true);
    fetch('http://localhost:5000/api/default-path')
      .then(res => {
        if (!res.ok) throw new Error('Offline');
        return res.json();
      })
      .then(data => {
        setWorkspaceInfo(data);
      })
      .catch(err => {
        console.log('Skipping auto-scan: Local backend is not running yet.');
      })
      .finally(() => {
        setScanningOnLoad(false);
      });
  }, []);

  const handleScanComplete = (results) => {
    results.projectName = 'Local Folder Scan';
    setScanResult(results);
    setActiveTab('dashboard'); // Redirect to dashboard to see results
  };

  const handleSelectProject = (projectReport) => {
    setScanResult(projectReport);
    setActiveTab('dashboard'); // Redirect to dashboard to see results
  };

  const handleSelectScan = async (scanData) => {
    // Fetch the full report from backend using project name
    try {
      const projectName = scanData.projectName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const res = await fetch(`http://localhost:5000/api/projects/${projectName}/report`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch report: ${res.statusText}`);
      }
      
      const fullReport = await res.json();
      setScanResult(fullReport);
      setSelectedDetection(null); // Clear previously selected detection
      setActiveTab('files'); // Show smelly files view
    } catch (err) {
      console.error('Error fetching full scan report:', err);
      // Fallback: use the basic scanData if report fetch fails
      setScanResult(scanData);
      setActiveTab('files');
    }
  };

  const handleSelectDetection = (detection) => {
    // If the detection has a local path and we can read the file, fetch it.
    if (detection.path) {
      fetch(`http://localhost:5000/api/read-file?path=${encodeURIComponent(detection.path)}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            const suggestion = generateRefactoringSuggestionWrapper(data.content, detection);
            setSelectedDetection(suggestion);
          }
        })
        .catch(() => {
          // Fallback suggestions constructed direct from detection without reading files
          const suggestion = generateRefactoringSuggestionWrapper('', detection);
          setSelectedDetection(suggestion);
        });
    } else {
      // Fallback sandbox scan
      const suggestion = generateRefactoringSuggestionWrapper('', detection);
      setSelectedDetection(suggestion);
    }
  };

  // Helper function to generate refactoring suggestion on the fly
  const generateRefactoringSuggestionWrapper = (content, detection) => {
    return generateRefactoringSuggestion(content, detection);
  };

  return (
    <div className="app-layout">
      {/* Navbar Header */}
      <header className="app-header glass-card">
        <div className="header-brand">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3"></circle>
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="18" cy="6" r="3"></circle>
              <line x1="6" y1="9" x2="6" y2="21"></line>
              <line x1="9" y1="18" x2="15" y2="18"></line>
              <line x1="18" y1="9" x2="18" y2="15"></line>
              <line x1="6" y1="6" x2="18" y2="6"></line>
            </svg>
          </div>
          <div>
            <h1 className="text-gradient">CodeAuditor</h1>
            <span className="subtitle">Professional Code Quality & Smell Detection Suite</span>
          </div>
        </div>

        <nav className="header-nav">
          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            title="View scan history and select previous scans"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            History
          </button>
          <button 
            className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
            title="Upload and manage projects"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Projects
          </button>
          <button 
            className={`nav-item ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            disabled={!scanResult}
            title="View smelly files from current scan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            Files
          </button>
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            disabled={!scanResult}
            title="View comprehensive scan dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20"></path>
              <path d="M2 12h20"></path>
            </svg>
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
            title="Scan a local directory"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Scanner
          </button>
          <button 
            className={`nav-item ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
            title="Test code in live sandbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            Sandbox
          </button>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {scanningOnLoad && (
          <div className="initial-scan-loader glass-card animate-fade-in">
            <span className="spinner large"></span>
            <p>Initializing CodeAuditor...</p>
          </div>
        )}

        {!scanningOnLoad && activeTab === 'history' && (
          <ScanHistory 
            onSelectScan={handleSelectScan}
          />
        )}

        {!scanningOnLoad && activeTab === 'projects' && (
          <ProjectManager 
            onSelectProject={handleSelectProject}
            activeProjectName={scanResult?.projectName}
          />
        )}

        {!scanningOnLoad && activeTab === 'files' && scanResult && (
          <SmellyFilesView 
            data={scanResult}
            onSelectDetection={handleSelectDetection}
          />
        )}

        {!scanningOnLoad && activeTab === 'dashboard' && scanResult && (
          <Dashboard 
            data={scanResult} 
            onSelectDetection={handleSelectDetection}
            config={config}
            setConfig={setConfig}
          />
        )}

        {!scanningOnLoad && activeTab === 'scanner' && (
          <FolderScanner 
            onScanComplete={handleScanComplete} 
            config={config}
          />
        )}

        {!scanningOnLoad && activeTab === 'sandbox' && (
          <CodeSandbox 
            config={config}
          />
        )}
      </main>

      {/* Refactor Suggestion Modal Overlay */}
      {selectedDetection && (
        <RefactorGuide 
          suggestion={selectedDetection} 
          onClose={() => setSelectedDetection(null)} 
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>&copy; 2026 CodeAuditor</p>
      </footer>
    </div>
  );
}
