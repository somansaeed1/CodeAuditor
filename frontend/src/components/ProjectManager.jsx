import React, { useState, useEffect } from 'react';
import './ProjectManager.css';

export default function ProjectManager({ onSelectProject, activeProjectName }) {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch projects list
  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/projects');
      const data = await res.json();
      if (data.status === 'success') {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to load projects list:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
      setError(null);
    } else {
      setZipFile(null);
      setError('Please select a valid .zip file.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!zipFile) {
      setError('Please select a ZIP file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('zipFile', zipFile);
    if (projectName.trim()) {
      formData.append('projectName', projectName.trim());
    }

    try {
      const response = await fetch('http://localhost:5000/api/projects/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.status !== 'error') {
        setSuccess(`Project '${result.projectName}' successfully created and scanned!`);
        setProjectName('');
        setZipFile(null);
        // Reset file input
        document.getElementById('zip-file-input').value = '';
        
        // Reload projects list
        await fetchProjects();
        
        // Automatically select the uploaded project and load it
        onSelectProject(result);
      } else {
        setError(result.message || 'Failed to upload and scan project.');
      }
    } catch (err) {
      setError('Could not connect to the upload service. Verify the backend server is running.');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectProject = async (name) => {
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${name}/report`);
      const data = await res.json();
      if (data.status !== 'error') {
        onSelectProject(data);
      } else {
        setError(`Failed to fetch report for project ${name}`);
      }
    } catch (err) {
      setError('Could not fetch project details.');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="project-manager-container animate-fade-in">
      <div className="project-grid">
        {/* Upload ZIP Form */}
        <div className="glass-card upload-card">
          <div className="card-header">
            <h3>Create & Scan Project</h3>
            <p className="subtitle">Upload a Java project packaged as .zip to analyze it for all code smells including Feature Envy, God Class, Brain Methods, and Data Clumps.</p>
          </div>

          <form onSubmit={handleUpload} className="upload-form">
            <div className="form-group">
              <label htmlFor="project-name-input">Project Name (Optional)</label>
              <input 
                id="project-name-input"
                type="text" 
                placeholder="e.g. MyJavaApp (auto-detected if blank)" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="zip-file-input">Select ZIP Archive (.zip)</label>
              <div className="file-drop-zone">
                <input 
                  id="zip-file-input"
                  type="file" 
                  accept=".zip"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <div className="drop-zone-content">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  {zipFile ? (
                    <span className="file-selected-name">{zipFile.name} ({(zipFile.size / 1024).toFixed(1)} KB)</span>
                  ) : (
                    <span>Click or drag your zip file here</span>
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary upload-btn" 
              disabled={uploading || !zipFile}
            >
              {uploading ? (
                <>
                  <span className="spinner"></span>
                  Processing ZIP & Scanning...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  Create & Scan Project
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="alert alert-danger animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Saved Projects Directory */}
        <div className="glass-card projects-list-card">
          <div className="card-header">
            <h3>Analyzed Projects</h3>
            <p className="subtitle">Select a project to explore detailed code smells or download its JSON report.</p>
          </div>

          {projects.length === 0 ? (
            <div className="empty-projects-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <p>No projects scanned yet. Upload a ZIP file to get started!</p>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map((p) => {
                const isActive = p.name === activeProjectName;
                const smellsCount = p.summary?.totalDetections || 0;
                
                return (
                  <div 
                    key={p.name} 
                    className={`project-list-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectProject(p.name)}
                  >
                    <div className="project-item-meta">
                      <div className="project-title-row">
                        <strong className="project-name">{p.name}</strong>
                        {isActive && <span className="active-indicator">Loaded</span>}
                      </div>
                      <span className="project-date">Scanned: {formatDate(p.scannedAt)}</span>
                    </div>

                    <div className="project-item-stats">
                      <div className="stat-badge files">
                        <span>{p.summary?.filesAnalyzed || 0} Files</span>
                      </div>
                      <div className={`stat-badge smells ${smellsCount > 0 ? 'smelly' : 'clean'}`}>
                        <span>{smellsCount} Smell{smellsCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="project-item-actions" onClick={(e) => e.stopPropagation()}>
                      <a 
                        href={`http://localhost:5000/api/projects/${p.name}/download`}
                        className="btn btn-secondary btn-xs download-report-btn"
                        title="Download JSON Report"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        JSON Report
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
