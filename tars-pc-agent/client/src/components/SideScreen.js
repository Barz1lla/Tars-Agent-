import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SideScreen = ({ 
  isOpen, 
  onToggle, 
  socket, 
  systemStatus, 
  addNotification, 
  theme, 
  onThemeChange,
  serverUrl 
}) => {
  const [collapsedSections, setCollapsedSections] = useState({});
  const [activityFeed, setActivityFeed] = useState([]);
  const [systemStats, setSystemStats] = useState({
    uptime: 0,
    totalRequests: 0,
    activeConnections: 1
  });

  useEffect(() => {
    if (socket) {
      // Listen for real-time events
      socket.on('task_started', (data) => {
        addActivity('info', `Started: ${data.task}`, data.timestamp);
      });

      socket.on('task_completed', (data) => {
        addActivity('success', `Completed: ${data.task}`, data.timestamp);
      });

      socket.on('error_alert', (data) => {
        addActivity('error', `Error: ${data.error}`, data.timestamp);
      });

      socket.on('system_stats', (data) => {
        setSystemStats(data);
      });
    }
  }, [socket]);

  useEffect(() => {
    // Update uptime every second
    const interval = setInterval(() => {
      if (systemStatus?.uptime) {
        setSystemStats(prev => ({
          ...prev,
          uptime: prev.uptime + 1
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [systemStatus]);

  const addActivity = (type, message, timestamp) => {
    const activity = {
      id: Date.now(),
      type,
      message,
      timestamp: timestamp || new Date().toISOString()
    };
    setActivityFeed(prev => [activity, ...prev.slice(0, 19)]); // Keep only 20 latest
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const testConnection = async () => {
    try {
      addNotification('info', 'Testing connection...');
      const response = await axios.post(`${serverUrl}/api/test-connection`);
      if (response.data.success) {
        addNotification('success', `Connection test passed via ${response.data.provider}`);
      } else {
        addNotification('error', 'Connection test failed');
      }
    } catch (error) {
      addNotification('error', `Connection test failed: ${error.message}`);
    }
  };

  const refreshProviderStatus = () => {
    if (socket) {
      socket.emit('get_provider_status');
      addNotification('info', 'Refreshing provider status...');
    }
  };

  const getProviderIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  return (
    <div className={`side-screen ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="side-screen-header">
        <h2>
          🤖 TARS Control Panel
        </h2>
      </div>

      {/* Body */}
      <div className="side-screen-body">
        
        {/* System Status Section */}
        <div className="side-screen-section">
          <div 
            className={`section-header ${collapsedSections.status ? 'collapsed' : ''}`}
            onClick={() => toggleSection('status')}
          >
            <span>⚡ System Status</span>
            <span>{collapsedSections.status ? '▶' : '▼'}</span>
          </div>
          <div className={`section-content ${collapsedSections.status ? 'collapsed' : ''}`}>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{formatUptime(systemStats.uptime)}</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: socket?.connected ? theme.success : theme.error }}>
                  {socket?.connected ? 'Online' : 'Offline'}
                </div>
                <div className="stat-label">Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Status Section */}
        <div className="side-screen-section">
          <div 
            className={`section-header ${collapsedSections.providers ? 'collapsed' : ''}`}
            onClick={() => toggleSection('providers')}
          >
            <span>🧠 AI Providers</span>
            <span>{collapsedSections.providers ? '▶' : '▼'}</span>
          </div>
          <div className={`section-content ${collapsedSections.providers ? 'collapsed' : ''}`}>
            <div style={{ marginBottom: '15px' }}>
              <button 
                onClick={refreshProviderStatus}
                className="quick-action-btn"
                style={{ width: '100%', fontSize: '12px' }}
              >
                🔄 Refresh Status
              </button>
            </div>
            
            <div className="provider-grid">
              {systemStatus?.providers ? Object.entries(systemStatus.providers).map(([key, provider]) => (
                <div key={key} className={`provider-card ${provider.status}`}>
                  <div className="provider-name">
                    {getProviderIcon(provider.status)} {provider.name}
                  </div>
                  <div className={`provider-status ${provider.status}`}>
                    {provider.status}
                  </div>
                  <div className="provider-details">
                    {provider.responseTime && (
                      <div>Response: {provider.responseTime}ms</div>
                    )}
                    {provider.errorCount > 0 && (
                      <div>Errors: {provider.errorCount}</div>
                    )}
                    <div>Cost: ${provider.costPerToken}/token</div>
                  </div>
                </div>
              )) : (
                <div style={{ color: '#6c757d', fontSize: '12px', textAlign: 'center' }}>
                  No provider status available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed Section */}
        <div className="side-screen-section">
          <div 
            className={`section-header ${collapsedSections.activity ? 'collapsed' : ''}`}
            onClick={() => toggleSection('activity')}
          >
            <span>📊 Activity Feed</span>
            <span>{collapsedSections.activity ? '▶' : '▼'}</span>
          </div>
          <div className={`section-content ${collapsedSections.activity ? 'collapsed' : ''}`}>
            <div className="activity-feed">
              {activityFeed.length > 0 ? activityFeed.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="activity-message">
                    {getActivityIcon(activity.type)} {activity.message}
                  </div>
                </div>
              )) : (
                <div style={{ color: '#6c757d', fontSize: '12px', textAlign: 'center' }}>
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Module Controls Section */}
        <div className="side-screen-section">
          <div 
            className={`section-header ${collapsedSections.modules ? 'collapsed' : ''}`}
            onClick={() => toggleSection('modules')}
          >
            <span>🔧 Module Controls</span>
            <span>{collapsedSections.modules ? '▶' : '▼'}</span>
          </div>
          <div className={`section-content ${collapsedSections.modules ? 'collapsed' : ''}`}>
            <div className="module-grid">
              {[
                { id: 'reedsy', name: 'Reedsy Repair', icon: '📝' },
                { id: 'pietarien', name: 'Pietarien Archivist', icon: '📂' },
                { id: 'bookqa', name: 'Book Q&A', icon: '📚' },
                { id: 'publishing', name: 'Publishing Assistant', icon: '📤' },
                { id: 'chatfiler', name: 'Chat Auto-Filer', icon: '💬' }
              ].map(module => (
                <div key={module.id} className="module-item">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{module.icon}</span>
                    <span>{module.name}</span>
                  </span>
                  <div className="module-toggle active"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="side-screen-section">
          <div 
            className={`section-header ${collapsedSections.actions ? 'collapsed' : ''}`}
            onClick={() => toggleSection('actions')}
          >
            <span>⚡ Quick Actions</span>
            <span>{collapsedSections.actions ? '▶' : '▼'}</span>
          </div>
          <div className={`section-content ${collapsedSections.actions ? 'collapsed' : ''}`}>
            <div className="quick-actions">
              <button 
                onClick={testConnection}
                className="quick-action-btn"
                disabled={!socket?.connected}
              >
                🔧 Test Connection
              </button>
              
              <button 
                onClick={refreshProviderStatus}
                className="quick-action-btn"
                disabled={!socket?.connected}
              >
                🔄 Refresh Providers
              </button>
              
              <button 
                onClick={() => {
                  setActivityFeed([]);
                  addNotification('info', 'Activity feed cleared');
                }}
                className="quick-action-btn"
              >
                🗑️ Clear Activity
              </button>
              
              <button 
                onClick={() => window.open(`${serverUrl}/api/health`, '_blank')}
                className="quick-action-btn"
              >
                📊 System Health
              </button>
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="side-screen-section">
          <div 
            className={`section-header ${collapsedSections.theme ? 'collapsed' : ''}`}
            onClick={() => toggleSection('theme')}
          >
            <span>🎨 Appearance</span>
            <span>{collapsedSections.theme ? '▶' : '▼'}</span>
          </div>
          <div className={`section-content ${collapsedSections.theme ? 'collapsed' : ''}`}>
            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                { name: 'Blue', primary: '#007bff' },
                { name: 'Green', primary: '#28a745' },
                { name: 'Purple', primary: '#6f42c1' },
                { name: 'Orange', primary: '#fd7e14' },
                { name: 'Red', primary: '#dc3545' }
              ].map(themeOption => (
                <button
                  key={themeOption.name}
                  onClick={() => onThemeChange({ primary: themeOption.primary })}
                  style={{
                    background: theme.primary === themeOption.primary ? themeOption.primary : 'white',
                    color: theme.primary === themeOption.primary ? 'white' : '#333',
                    border: `2px solid ${themeOption.primary}`,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {themeOption.name}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SideScreen;