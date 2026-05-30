import React, { useState } from 'react';
import './RefactorGuide.css';

export default function RefactorGuide({ suggestion, onClose }) {
  const [activeTab, setActiveTab] = useState('refactored'); // 'refactored' | 'delegation' | 'compare'

  if (!suggestion) return null;

  const {
    smellType,
    originalClassName,
    targetClassName,
    enviedObject,
    originalCode,
    refactoredCode,
    delegationCode
  } = suggestion;

  // Dynamic values depending on smell type
  let guideTitle = "Refactoring Guide";
  let whyInfo = "";
  let tab1Label = "1. Refactored Code";
  let tab2Label = "2. Delegation Code";
  let compareLeftLabel = "Before Code";
  let compareRightLabel = "Refactored Code";

  if (smellType === 'Feature Envy') {
    guideTitle = "Refactoring Guide: Move Method";
    whyInfo = `Why move this? The method accesses members of '${targetClassName}' (via '${enviedObject}') more than its own host class. Relocating it improves cohesion, reduces coupling, and aligns with the Information Expert design pattern.`;
    tab1Label = `1. Refactored Method (in ${targetClassName}.java)`;
    tab2Label = `2. Delegation Wrapper (in ${originalClassName}.java)`;
    compareLeftLabel = `Before (in ${originalClassName}.java)`;
    compareRightLabel = `After (Moved to ${targetClassName}.java)`;
  } else if (smellType === 'God Class') {
    guideTitle = "Refactoring Guide: Extract Class";
    whyInfo = `Why split this? The class '${originalClassName}' is acting as a God Class. It has grown too large and has too many responsibilities, violating the Single Responsibility Principle. Splitting off clusters of attributes and methods into separate classes improves modularity and testability.`;
    tab1Label = `1. New Extracted Class (${targetClassName}.java)`;
    tab2Label = `2. Delegated Hooks (in ${originalClassName}.java)`;
    compareLeftLabel = `Before (God Class ${originalClassName})`;
    compareRightLabel = `After (Extracted Helper ${targetClassName})`;
  } else if (smellType === 'Brain Method') {
    guideTitle = "Refactoring Guide: Extract Method";
    whyInfo = `Why refactor this? The method has high complexity, excessive lines of code, or deep nesting. Extracting cohesive blocks into small private helper methods makes the code readable, self-documenting, and dramatically simplifies testing.`;
    tab1Label = "1. Refactored & Extracted Methods";
    tab2Label = "2. Refactoring Summary";
    compareLeftLabel = `Before Method (Complex)`;
    compareRightLabel = `After Method (Modularized)`;
  } else if (smellType === 'Data Clump') {
    guideTitle = "Refactoring Guide: Introduce Parameter Object";
    whyInfo = `Why encapsulate this? The parameters are constantly passed together across different parts of the code. Grouping them into a single Parameter Object '${targetClassName}' simplifies method signatures, improves code readability, and exposes potential places to group domain behavior.`;
    tab1Label = `1. Parameter Object Class (${targetClassName}.java)`;
    tab2Label = `2. Updated Signature (in ${originalClassName}.java)`;
    compareLeftLabel = `Before (Individual parameters)`;
    compareRightLabel = `After (Parameter Object argument)`;
  }

  return (
    <div className="refactor-modal-overlay">
      <div className="refactor-modal glass-card animate-fade-in">
        <div className="refactor-modal-header">
          <div>
            <h3>{guideTitle}</h3>
            <p className="subtitle">
              Refactoring recipe for smell detected in <strong>{originalClassName}</strong>
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="refactor-info-banner">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div>
            <strong>Why refactor?</strong> {whyInfo}
          </div>
        </div>

        <div className="refactor-tabs">
          <button 
            className={`tab-btn ${activeTab === 'refactored' ? 'active' : ''}`}
            onClick={() => setActiveTab('refactored')}
          >
            {tab1Label}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'delegation' ? 'active' : ''}`}
            onClick={() => setActiveTab('delegation')}
          >
            {tab2Label}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            Before vs After Comparison
          </button>
        </div>

        <div className="refactor-code-container">
          {activeTab === 'refactored' && (
            <div className="code-block-wrapper">
              <div className="code-header">
                <span>{smellType === 'Feature Envy' ? `Add to ${targetClassName}.java` : `Created ${targetClassName}.java`}</span>
                <span className="badge badge-success">Refactored Code</span>
              </div>
              <pre className="code-display">
                <code>{refactoredCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'delegation' && (
            <div className="code-block-wrapper">
              <div className="code-header">
                <span>{smellType === 'Feature Envy' ? `Replace in ${originalClassName}.java` : `Update in ${originalClassName}.java`}</span>
                <span className="badge badge-primary">Integration Code</span>
              </div>
              <pre className="code-display">
                <code>{delegationCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="compare-grid">
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>{compareLeftLabel}</span>
                  <span className="badge badge-danger">Smelly Code</span>
                </div>
                <pre className="code-display">
                  <code>{originalCode}</code>
                </pre>
              </div>
              
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>{compareRightLabel}</span>
                  <span className="badge badge-success">Clean Code</span>
                </div>
                <pre className="code-display">
                  <code>{refactoredCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="refactor-modal-footer">
          <p>Adhering to these refactoring structures helps resolve complexity and improves long-term project maintainability.</p>
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
