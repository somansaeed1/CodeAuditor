import React, { useState, useEffect } from 'react';
import './ScanHistory.css';

export default function ScanHistory({ onSelectScan }) {
  const [scans, setScans] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'high', 'medium', 'low'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/projects');
      const data = await res.json();
      if (data.status === 'success') {
        setScans(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const getHealthRating = (summary) => {
    if (!summary) return 'unknown';
    const totalDeduction = 
      ((summary.smellsByType?.["God Class"] || 0) * 25) + 
      ((summary.smellsByType?.["Brain Method"] || 0) * 15) + 
      ((summary.smellsByType?.["Feature Envy"] || 0) * 15) + 
      ((summary.smellsByType?.["Data Clump"] || 0) * 10);
    const healthScore = Math.max(10, 100 - totalDeduction);
    
    if (healthScore >= 80) return 'excellent';
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'fair';
    return 'poor';
  };

  const filteredScans = scans.filter(scan => {
    const matchesSearch = scan.name.toLowerCase().includes(searchQuery.toLowerCase());
    const rating = getHealthRating(scan.summary);
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'high') return matchesSearch && rating === 'excellent';
    if (filter === 'medium') return matchesSearch && (rating === 'good' || rating === 'fair');
    if (filter === 'low') return matchesSearch && rating === 'poor';
    return matchesSearch;
  });

  const sortedScans = [...filteredScans].sort((a, b) => 
    new Date(b.scannedAt) - new Date(a.scannedAt)
  );

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleScanClick = (scan) => {
    onSelectScan({
      projectName: scan.name,
      summary: scan.summary,
      scannedAt: scan.scannedAt
    });
  };

  return (
    <div className="scan-history-container animate-fade-in">
      <div className="history-header">
        <div className="header-content">
          <h2>Scan History</h2>
          <p>Browse and manage all completed code quality scans</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchScans}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2-8.83"></path>
          </svg>
          Refresh
        </button>
      </div>

      <div className="history-controls glass-card">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search scans by project name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({scans.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >
            Excellent
          </button>
          <button 
            className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
            onClick={() => setFilter('medium')}
          >
            Good
          </button>
          <button 
            className={`filter-btn ${filter === 'low' ? 'active' : ''}`}
            onClick={() => setFilter('low')}
          >
            Needs Work
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card loading-state">
          <span className="spinner"></span>
          <p>Loading scan history...</p>
        </div>
      ) : sortedScans.length === 0 ? (
        <div className="glass-card empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p>No scans found matching your criteria</p>
        </div>
      ) : (
        <div className="scans-list">
          {sortedScans.map((scan, idx) => {
            const rating = getHealthRating(scan.summary);
            const smells = scan.summary?.totalDetections || 0;
            
            return (
              <div 
                key={idx} 
                className={`scan-item glass-card ${rating}`}
                onClick={() => handleScanClick(scan)}
              >
                <div className="scan-item-left">
                  <div className={`rating-badge ${rating}`}>
                    <span className="rating-icon">
                      {rating === 'excellent' && '✓'}
                      {rating === 'good' && '◐'}
                      {rating === 'fair' && '◑'}
                      {rating === 'poor' && '✕'}
                    </span>
                  </div>
                  <div className="scan-info">
                    <h3 className="scan-name">{scan.name}</h3>
                    <div className="scan-meta">
                      <span className="meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {formatDate(scan.scannedAt)}
                      </span>
                      <span className="meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12a8 8 0 0 1 8-8v8h8a8 8 0 1 1-16 0"></path>
                        </svg>
                        {scan.summary?.filesAnalyzed || 0} files
                      </span>
                    </div>
                  </div>
                </div>

                <div className="scan-item-stats">
                  <div className="stat-block">
                    <span className="stat-value">{smells}</span>
                    <span className="stat-label">Smells</span>
                  </div>
                  <div className="stat-block">
                    <span className="stat-value">{scan.summary?.filesWithSmell || 0}</span>
                    <span className="stat-label">Smelly Files</span>
                  </div>
                  <div className="stat-block">
                    <span className="stat-value">{Math.max(0, (scan.summary?.filesAnalyzed || 0) - (scan.summary?.filesWithSmell || 0))}</span>
                    <span className="stat-label">Clean</span>
                  </div>
                </div>

                <div className="scan-item-action">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
