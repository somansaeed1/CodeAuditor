import React from 'react';
import './Dashboard.css';

export default function Dashboard({ data, onSelectDetection, config, setConfig }) {
  const { summary, detections, projectName, scannedAt } = data || {
    summary: { 
      filesAnalyzed: 0, 
      filesWithSmell: 0, 
      totalDetections: 0,
      smellsByType: { "Feature Envy": 0, "God Class": 0, "Brain Method": 0, "Data Clump": 0 }
    },
    detections: [],
    projectName: 'Default Scan',
    scannedAt: null
  };

  // Safe mapping of smellsByType (ensure keys exist)
  const smellsByType = summary.smellsByType || {
    "Feature Envy": detections.filter(d => d.smellType === "Feature Envy").length,
    "God Class": detections.filter(d => d.smellType === "God Class").length,
    "Brain Method": detections.filter(d => d.smellType === "Brain Method").length,
    "Data Clump": detections.filter(d => d.smellType === "Data Clump").length
  };

  // Calculate Code Health Score:
  // Starts at 100%, drops depending on smell types:
  // God Class: -25%, Brain Method: -15%, Feature Envy: -15%, Data Clump: -10%
  const totalDeduction = 
    (smellsByType["God Class"] * 25) + 
    (smellsByType["Brain Method"] * 15) + 
    (smellsByType["Feature Envy"] * 15) + 
    (smellsByType["Data Clump"] * 10);
  const healthScore = Math.max(10, 100 - totalDeduction);

  // SVG Gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const handleDownloadReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}-smell-report.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Project Meta Info Header */}
      {projectName && (
        <div className="project-meta-header glass-card">
          <div className="meta-left">
            <span className="lbl">Currently Viewing Project:</span>
            <h2>{projectName}</h2>
            {scannedAt && <span className="scanned-time">Scanned on: {new Date(scannedAt).toLocaleString()}</span>}
          </div>
          <div className="meta-right">
            <button 
              className="btn btn-secondary btn-sm download-btn" 
              onClick={handleDownloadReport}
              disabled={!data || detections.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export JSON Report
            </button>
          </div>
        </div>
      )}

      {/* Configuration & Thresholds Panel */}
      <div className="glass-card config-panel">
        <div className="panel-title">
          <h4>Scan Thresholds</h4>
          <span className="subtitle">Tune detection sensitivity (Applied on folder/sandbox scans)</span>
        </div>
        <div className="config-grid">
          <div className="config-item">
            <label htmlFor="ext-threshold">Min External Accesses ({config.threshold})</label>
            <input 
              id="ext-threshold"
              type="range" 
              min="1" 
              max="10" 
              value={config.threshold} 
              onChange={(e) => setConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
            />
            <span className="slider-hint">Minimum references to external classes to flag envy.</span>
          </div>
          <div className="config-item">
            <label htmlFor="envy-ratio">Envy Ratio ({config.ratio}x)</label>
            <input 
              id="envy-ratio"
              type="range" 
              min="1" 
              max="5" 
              step="0.5"
              value={config.ratio} 
              onChange={(e) => setConfig(prev => ({ ...prev, ratio: parseFloat(e.target.value) }))}
            />
            <span className="slider-hint">External accesses must exceed internal by this ratio.</span>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="metrics-grid">
        {/* Health Index Card */}
        <div className="glass-card metric-card health-card">
          <div className="gauge-wrapper">
            <svg width="150" height="150" className="gauge-svg">
              <circle cx="75" cy="75" r={radius} className="gauge-bg" />
              <circle 
                cx="75" 
                cy="75" 
                r={radius} 
                className="gauge-fill"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  stroke: healthScore > 80 ? 'var(--success-color)' : healthScore > 50 ? 'var(--accent-color)' : 'var(--danger-color)'
                }}
              />
            </svg>
            <div className="gauge-value">
              <h2>{healthScore}%</h2>
              <span>Health</span>
            </div>
          </div>
          <div className="metric-info">
            <h3>Code Health Index</h3>
            <p>Overall rating based on smell density and severities.</p>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="stats-subgrid">
          <div className="glass-card stat-item-card">
            <span className="stat-label">Files Scanned</span>
            <h2>{summary.filesAnalyzed}</h2>
          </div>
          <div className="glass-card stat-item-card warning">
            <span className="stat-label">Smelly Files</span>
            <h2>{summary.filesWithSmell || 0}</h2>
          </div>
          <div className="glass-card stat-item-card danger animate-glow">
            <span className="stat-label">Smells Detected</span>
            <h2>{summary.totalDetections}</h2>
          </div>
          <div className="glass-card stat-item-card success">
            <span className="stat-label">Clean Files</span>
            <h2>{Math.max(0, summary.filesAnalyzed - (summary.filesWithSmell || 0))}</h2>
          </div>
        </div>
      </div>

      {/* Breakdown by Smell Type Row */}
      <div className="smell-breakdown-row">
        {Object.entries(smellsByType).map(([type, count]) => (
          <div 
            key={type} 
            className="glass-card breakdown-card"
          >
            <div className="breakdown-icon">
              {type === 'Feature Envy' && <span className="icon-envy">✦</span>}
              {type === 'God Class' && <span className="icon-god">♚</span>}
              {type === 'Brain Method' && <span className="icon-brain">⚙</span>}
              {type === 'Data Clump' && <span className="icon-clump">⚱</span>}
            </div>
            <div className="breakdown-meta">
              <h4>{type}</h4>
              <span className="count-badge">{count} detected</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

