import React from 'react';

const NotificationSystem = ({ notifications, onRemoveNotification, theme }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification ${notification.type}`}
          onClick={() => onRemoveNotification(notification.id)}
          title="Click to dismiss"
        >
          <div className="notification-content">
            <div className="notification-icon">
              {getNotificationIcon(notification.type)}
            </div>
            <div>
              <div className="notification-text">
                {notification.message}
              </div>
              <div className="notification-time">
                {formatTime(notification.timestamp)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
    