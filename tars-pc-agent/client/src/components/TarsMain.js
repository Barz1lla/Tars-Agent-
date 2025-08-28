import React, { useState, useEffect } from 'react';
import ReedsyEditor from './ReedsyEditor';
import PietarienArchivist from './PietarienArchivist';
import BookQASystem from './BookQASystem';
import PublishingAssistant from './PublishingAssistant';
import ChatAutoFiler from './ChatAutoFiler';

const TarsMain = ({ socket, systemStatus, addNotification, theme, serverUrl }) => {
  const [activeModule, setActiveModule] = useState('reedsy');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setConnectionStatus('connected');
        addNotification('success', 'Connected to TARS system');
      });

      socket.on('disconnect', () => {
        setConnectionStatus('disconnected');
        addNotification('warning', 'Disconnected from TARS system');
      });
    }
  }, [socket, addNotification]);

  const modules = [
    {
      id: 'reedsy',
      name: 'Reedsy Repair',
      icon: '📝',
      description: 'Fix formatting issues in Reedsy chapters'
    },
    {
      id: 'pietarien',
      name: 'Pietarien Archivist',
      icon: '📂',
      description: 'Organize files into Pietarien categories'
    },
    {
      id: 'bookqa',
      name: 'Book Q&A',
      icon: '📚',
      description: 'Ask questions about uploaded books'
    },
    {
      id: 'publishing',
      name: 'Publishing Assistant',
      icon: '📤',
      description: 'Generate marketing materials and query letters'
    },
    {
      id: 'chatfiler',
      name: 'Chat Auto-Filer',
      icon: '💬',
      description: 'Automatically categorize and file chat transcripts'
    }
  ];

  const renderActiveModule = () => {
    const moduleProps = {
      socket,
      systemStatus,
      addNotification,
      theme,
      serverUrl
    };

    switch (activeModule) {
      case 'reedsy':
        return <ReedsyEditor {...moduleProps} />;
      case 'pietarien':
        return <PietarienArchivist {...moduleProps} />;
      case 'bookqa':
        return <BookQASystem {...moduleProps} />;
      case 'publishing':
        return <PublishingAssistant {...moduleProps} />;
      case 'chatfiler':
        return <ChatAutoFiler {...moduleProps} />;
      default:
        return <ReedsyEditor {...moduleProps} />;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ 
        marginBottom: '30px', 
        textAlign: 'center',
        background: `linear-gradient(135deg, ${theme.primary} 0%, #0056b3 100%)`,
        color: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '2.5rem',
          fontWeight: '600'
        }}>
          🤖 TARS PC Agent
        </h1>
        <p style={{ 
          margin: '0 0 20px 0', 
          fontSize: '1.1rem', 
          opacity: 0.9 
        }}>
          Advanced AI-Powered Automation System v2.0
        </p>
        
        {/* Connection Status */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          background: 'rgba(255,255,255,0.1)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%',
            background: connectionStatus === 'connected' ? '#28a745' : 
                       connectionStatus === 'disconnected' ? '#dc3545' : '#ffc107'
          }}></span>
          {connectionStatus === 'connected' ? 'Connected' : 
           connectionStatus === 'disconnected' ? 'Disconnected' : 'Connecting...'}
        </div>
      </header>

      {/* Module Navigation */}
      <nav style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              style={{
                background: activeModule === module.id ? theme.primary : 'white',
                color: activeModule === module.id ? 'white' : '#333',
                border: `2px solid ${activeModule === module.id ? theme.primary : '#e9ecef'}`,
                padding: '20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                boxShadow: activeModule === module.id ? 
                  `0 4px 15px ${theme.primary}33` : '0 2px 8px rgba(0,0,0,0.1)',
                transform: activeModule === module.id ? 'translateY(-2px)' : 'none'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                {module.icon}
              </div>
              <div style={{ 
                fontWeight: '600', 
                marginBottom: '4px',
                fontSize: '16px'
              }}>
                {module.name}
              </div>
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.8,
                lineHeight: 1.4
              }}>
                {module.description}
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Active Module Content */}
      <main style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
        minHeight: '600px'
      }}>
        {renderActiveModule()}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        marginTop: '30px',
        padding: '20px',
        color: '#6c757d',
        fontSize: '14px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          🔗 Server: <a 
            href={`${serverUrl}/api/health`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: theme.primary, textDecoration: 'none' }}
          >
            {serverUrl}
          </a>
        </div>
        <div>
          © {new Date().getFullYear()} TARS PC Agent. Powered by Multi-Provider AI.
        </div>
      </footer>
    </div>
  );
};

export default TarsMain;