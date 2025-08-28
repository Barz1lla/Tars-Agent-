import React, { useState } from 'react';
import axios from 'axios';

const PietarienArchivist = ({ socket, systemStatus, addNotification, theme, serverUrl }) => {
  const [organizing, setOrganizing] = useState(false);
  const [results, setResults] = useState(null);

  const categories = [
    'Justice Acceleration',
    'Innovation Enablement', 
    'Environmental Intelligence',
    'Sport Equity',
    'Education Reform'
  ];

  const handleOrganize = async () => {
    setOrganizing(true);
    try {
      addNotification('info', 'Starting Pietarien organization...');
      
      const response = await axios.post(`${serverUrl}/api/organize`);
      
      if (response.data.success) {
        setResults(response.data.result);
        addNotification('success', `Organization complete: ${response.data.result.processed}/${response.data.result.totalFiles} files processed`);
      }
    } catch (error) {
      addNotification('error', `Organization failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setOrganizing(false);
    }
  };

  return (
    <div>
      {/* Module Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          color: theme.primary, 
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          📂 Pietarien Archivist
        </h2>
        <p style={{ 
          color: '#6c757d', 
          margin: 0,
          fontSize: '16px',
          lineHeight: 1.5
        }}>
          Automatically organize and categorize files into the five Pietarien ideological categories.
        </p>
      </div>

      {/* Categories Overview */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>📋 Pietarien Categories</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {categories.map((category, index) => (
            <div key={index} style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                {['⚖️', '💡', '🌍', '⚽', '🎓'][index]}
              </div>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                {category}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div style={{
        background: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px'
      }}>
        <h3 style={{ color: '#333', marginBottom: '20px' }}>🚀 Organization Control</h3>
        
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleOrganize}
            disabled={organizing}
            style={{
              padding: '15px 30px',
              backgroundColor: organizing ? '#6c757d' : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: organizing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: organizing ? 'none' : `0 2px 8px ${theme.primary}33`
            }}
          >
            {organizing ? '🔄 Organizing...' : '📂 Start Organization'}
          </button>
        </div>

        <div style={{ 
          marginTop: '20px', 
          fontSize: '14px', 
          color: '#6c757d',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          This will analyze all files in your Pietarien directory and categorize them using AI.
        </div>
      </div>

      {/* Results */}
      {results && (
        <div style={{
          background: '#f8fff9',
          border: '1px solid #28a745',
          borderRadius: '12px',
          padding: '25px'
        }}>
          <h3 style={{ color: theme.success, marginBottom: '20px' }}>
            ✅ Organization Results
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.primary }}>
                {results.totalFiles}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Files</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.success }}>
                {results.processed}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Processed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.error }}>
                {results.errors?.length || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Errors</div>
            </div>
          </div>

          {results.categorized && (
            <div>
              <h4 style={{ color: '#333', marginBottom: '15px' }}>📊 Categorization Breakdown</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                {Object.entries(results.categorized).map(([category, count]) => (
                  <div key={category} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 15px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef'
                  }}>
                    <span style={{ fontSize: '14px' }}>{category}</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: theme.primary,
                      background: '#f8f9fa',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {count} files
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Panel */}
      <div style={{
        marginTop: '40px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid #b3d7ff'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: theme.primary }}>ℹ️ How It Works</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', lineHeight: 1.6 }}>
          <li>Scans the Pietarien directory for files (.md, .txt, .pdf, .docx, .json)</li>
          <li>Uses AI to analyze content and determine the appropriate category</li>
          <li>Moves files to organized folders based on their ideological alignment</li>
          <li>Generates a detailed report of the organization process</li>
          <li>Preserves original filenames and handles naming conflicts</li>
        </ul>
      </div>
    </div>
  );
};

export default PietarienArchivist;