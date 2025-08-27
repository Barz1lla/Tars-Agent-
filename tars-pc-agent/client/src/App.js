import React from 'react';
import ReedsyEditor from './components/ReedsyEditor';

function App() {
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'; // Use environment variable or default to localhost

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1
        style={{
          textAlign: 'center',
          color: '#007bff',
          marginBottom: '30px',
          fontSize: '28px',
        }}
      >
        🤖 TARS PC Agent - Reedsy Editor
      </h1>

      {/* Reedsy Editor Component */}
      <ReedsyEditor />

      {/* Server and Files Info */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <p>
          🔗 Server Status:{' '}
          <a
            href={`${serverUrl}/api/status`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#007bff', textDecoration: 'none' }}
          >
            Check API
          </a>
        </p>
        <p>
          📁 Files Location:{' '}
          <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '4px' }}>
            C:\TARS\tars-pc-agent\uploads\
          </code>
        </p>
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          marginTop: '30px',
          fontSize: '0.9rem',
          color: '#888',
        }}
      >
        <small>© {new Date().getFullYear()} TARS PC Agent. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default App;