import React, { useState, useEffect } from 'react';
import './FolderScanner.css';

export default function FolderScanner({ onScanComplete, config }) {
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendActive, setBackendActive] = useState(false);
  const [apiStatusMessage, setApiStatusMessage] = useState('Checking backend server connection...');

  useEffect(() => {
    // Check if backend is available and fetch default scan path
    fetch('http://localhost:5000/api/default-path')
      .then(res => {
        if (!res.ok) throw new Error('Backend not responding');
        return res.json();
      })
      .then(data => {
        setFolderPath(data.defaultScanPath);
        setBackendActive(true);
        setApiStatusMessage('Backend server connected: OK');
      })
      .catch(err => {
        console.warn('Backend server is offline. Standard scanning requires backend. Sandbox remains available client-side.');
        setBackendActive(false);
        setApiStatusMessage('Backend server offline. Run the backend/server.js or run.bat to enable directory scanning.');
      });
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!folderPath.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/scan-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folderPath.trim(),
          threshold: config.threshold,
          ratio: config.ratio
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        onScanComplete(result);
      } else {
        setError(result.message || 'An error occurred during scanning.');
      }
    } catch (err) {
      setError('Could not connect to the scanning service. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="folder-scanner-card glass-card animate-fade-in">
      <div className="scanner-header">
        <h3>Local Directory Scanner</h3>
        <p className="subtitle">Perform deep recursive code quality scan across local directories to detect all code smells.</p>
      </div>

      <div className={`backend-status-badge ${backendActive ? 'active' : 'offline'}`}>
        <span className="dot"></span>
        <span className="message">{apiStatusMessage}</span>
      </div>

      <form onSubmit={handleScan} className="scan-form">
        <div className="input-group">
          <label htmlFor="folder-path-input">Folder Path (Absolute Directory)</label>
          <div className="input-with-button">
            <input 
              id="folder-path-input"
              type="text" 
              placeholder="e.g. C:\projects\my-java-project\src" 
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              disabled={loading || !backendActive}
            />
            <button 
              type="submit" 
              className="btn btn-primary scan-btn"
              disabled={loading || !folderPath.trim() || !backendActive}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Scanning...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  Scan Folder
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="scan-error-banner animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Scan Failed:</strong> {error}
          </div>
        </div>
      )}

      {!backendActive && (
        <div className="offline-tip">
          <strong>Pro-Tip:</strong> Use the <strong>Code Sandbox</strong> tab above to analyze Java code instantly directly in your browser without requiring the local server!
        </div>
      )}
    </div>
  );
}
