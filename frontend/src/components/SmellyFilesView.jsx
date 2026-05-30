import React, { useState } from 'react';
import './SmellyFilesView.css';

export default function SmellyFilesView({ data, onSelectDetection }) {
  const [expandedFile, setExpandedFile] = useState(null);
  const [sortBy, setSortBy] = useState('smell-count'); // 'smell-count' | 'name' | 'type'
  
  const { detections, projectName } = data || { detections: [], projectName: 'Project' };

  // Group detections by file
  const fileGroups = {};
  detections.forEach(detection => {
    if (!fileGroups[detection.file]) {
      fileGroups[detection.file] = [];
    }
    fileGroups[detection.file].push(detection);
  });

  // Sort files based on sortBy
  const sortedFiles = Object.entries(fileGroups).sort((a, b) => {
    if (sortBy === 'smell-count') {
      return b[1].length - a[1].length;
    }
    if (sortBy === 'name') {
      return a[0].localeCompare(b[0]);
    }
    return 0;
  });

  const getSmellColor = (smellType) => {
    const colors = {
      'Feature Envy': 'envy',
      'God Class': 'god',
      'Brain Method': 'brain',
      'Data Clump': 'clump'
    };
    return colors[smellType] || 'default';
  };

  const getSmellIcon = (smellType) => {
    const icons = {
      'Feature Envy': '✦',
      'God Class': '♚',
      'Brain Method': '⚙',
      'Data Clump': '⚱'
    };
    return icons[smellType] || '○';
  };

  return (
    <div className="smelly-files-view animate-fade-in">
      <div className="files-view-header">
        <div className="header-content">
          <h2>Smelly Files Analysis</h2>
          <p>{sortedFiles.length} file(s) with code smells • {detections.length} total detections</p>
        </div>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="smell-count">Smell Count (High to Low)</option>
            <option value="name">File Name (A to Z)</option>
          </select>
        </div>
      </div>

      {sortedFiles.length === 0 ? (
        <div className="empty-smells glass-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p>No smelly files detected in this project!</p>
        </div>
      ) : (
        <div className="files-list">
          {sortedFiles.map(([filePath, fileDetections]) => {
            const isExpanded = expandedFile === filePath;
            const smellCounts = {};
            
            fileDetections.forEach(d => {
              smellCounts[d.smellType] = (smellCounts[d.smellType] || 0) + 1;
            });

            return (
              <div key={filePath} className={`file-item glass-card ${isExpanded ? 'expanded' : ''}`}>
                <div 
                  className="file-item-header"
                  onClick={() => setExpandedFile(isExpanded ? null : filePath)}
                >
                  <div className="file-header-left">
                    <div className="file-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                    </div>
                    <div className="file-info">
                      <h3 className="file-name">{filePath}</h3>
                      <span className="file-stat">{fileDetections.length} smell{fileDetections.length !== 1 ? 's' : ''} detected</span>
                    </div>
                  </div>

                  <div className="file-header-right">
                    <div className="smell-badges-inline">
                      {Object.entries(smellCounts).map(([type, count]) => (
                        <span key={type} className={`smell-badge-small ${getSmellColor(type)}`}>
                          {getSmellIcon(type)} {type}: {count}
                        </span>
                      ))}
                    </div>
                    <div className={`expand-icon ${isExpanded ? 'open' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="file-item-details">
                    <div className="detections-in-file">
                      {fileDetections.map((detection, idx) => (
                        <div 
                          key={idx} 
                          className="detection-in-file"
                          onClick={() => onSelectDetection(detection)}
                        >
                          <div className="detection-marker">
                            <span className={`smell-icon ${getSmellColor(detection.smellType)}`}>
                              {getSmellIcon(detection.smellType)}
                            </span>
                          </div>
                          <div className="detection-content">
                            <div className="detection-title">
                              <strong>
                                {detection.smellType === 'Feature Envy' || detection.smellType === 'Brain Method' || detection.smellType === 'Data Clump'
                                  ? `${detection.className}.${detection.details?.methodName}()`
                                  : detection.className}
                              </strong>
                              <span className={`smell-pill ${getSmellColor(detection.smellType)}`}>
                                {detection.smellType}
                              </span>
                            </div>
                            {detection.details?.line && (
                              <span className="line-info">Line {detection.details.line}</span>
                            )}
                            {(detection.reason || detection.details?.reason) && (
                              <p className="detection-reason">{detection.reason || detection.details?.reason}</p>
                            )}
                          </div>
                          <div className="detection-action">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
