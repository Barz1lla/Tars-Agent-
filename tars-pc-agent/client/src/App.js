import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import TarsMain from './components/TarsMain';
import SideScreen from './components/SideScreen';
import NotificationSystem from './components/NotificationSystem';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [sideScreenOpen, setSideScreenOpen] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState({
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    background: '#f8f9fa'
  });

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(serverUrl);
    setSocket(newSocket);

    // Listen for system events
    newSocket.on('system_status', (data) => {
      setSystemStatus(data);
      addNotification('success', 'System Status Updated');
    });

    newSocket.on('task_started', (data) => {
      addNotification('info', `Task Started: ${data.task}`);
    });

    newSocket.on('task_completed', (data) => {
      addNotification('success', `Task Completed: ${data.task} (${data.result})`);
    });

    newSocket.on('error_alert', (data) => {
      addNotification('error', `Error: ${data.error}`);
    });

    newSocket.on('provider_status', (data) => {
      setSystemStatus(prev => ({
        ...prev,
        providers: data
      }));
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [serverUrl]);

  const addNotification = (type, message) => {
    const notification = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 latest

    // Auto-remove after 5 seconds for non-error notifications
    if (type !== 'error') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  };

  const toggleSideScreen = () => {
    setSideScreenOpen(!sideScreenOpen);
  };

  const handleThemeChange = (newTheme) => {
    setTheme({ ...theme, ...newTheme });
  };

  return (
    <div className="app" style={{ '--primary-color': theme.primary }}>
      {/* Main Content Area */}
      <div className={`main-content ${sideScreenOpen ? 'side-screen-open' : ''}`}>
        <TarsMain 
          socket={socket}
          systemStatus={systemStatus}
          addNotification={addNotification}
          theme={theme}
          serverUrl={serverUrl}
        />
      </div>

      {/* Side Screen Panel */}
      <SideScreen
        isOpen={sideScreenOpen}
        onToggle={toggleSideScreen}
        socket={socket}
        systemStatus={systemStatus}
        addNotification={addNotification}
        theme={theme}
        onThemeChange={handleThemeChange}
        serverUrl={serverUrl}
      />

      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications}
        onRemoveNotification={(id) => 
          setNotifications(prev => prev.filter(n => n.id !== id))
        }
        theme={theme}
      />

      {/* Side Screen Toggle Button */}
      <button
        className="side-screen-toggle"
        onClick={toggleSideScreen}
        title={sideScreenOpen ? "Close Side Panel" : "Open Side Panel"}
        style={{
          position: 'fixed',
          right: sideScreenOpen ? '360px' : '20px',
          top: '20px',
          zIndex: 1001,
          background: theme.primary,
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          fontSize: '20px'
        }}
      >
        {sideScreenOpen ? '✕' : '☰'}
      </button>
    </div>
  );
}

export default App;