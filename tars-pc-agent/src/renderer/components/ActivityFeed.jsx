import React from 'react';

const ActivityFeed = ({ logs }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📌';
    }
  };

  return (
    <div className="activity-feed">
      <h3>Live Activity</h3>
      <div className="feed-container">
        {logs.slice(-50).map((log, index) => (
          <div key={index} className={`feed-item ${log.level}`}>
            <span className="log-icon">{getLogIcon(log.level)}</span>
            <div className="log-content">
              <span className="log-message">{log.message}</span>
              <span className="log-time">{formatTime(log.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;