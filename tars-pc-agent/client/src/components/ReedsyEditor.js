import React, { useState } from 'react';
import axios from 'axios';

const ReedsyEditor = ({ socket, systemStatus, addNotification, theme, serverUrl }) => {
  const [content, setContent] = useState('');
  const [formatted, setFormatted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('');

  const handleFormat = async () => {
    if (!content.trim()) {
      addNotification('warning', 'Please enter some content to format');
      return;
    }

    setLoading(true);
    setError('');
    setFormatted('');
    
    try {
      addNotification('info', 'Formatting content with AI...');
      
      const response = await axios.post(`${serverUrl}/api/format`, {
        content: content.trim(),
        formatType: 'reedsy'
      });
      
      if (response.data.success) {
        setFormatted(response.data.result);
        setProvider(response.data.provider);
        addNotification('success', `Content formatted successfully via ${response.data.provider}`);
      } else {
        throw new Error(response.data.error || 'Formatting failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred while formatting.';
      setError(errorMessage);
      addNotification('error', `Formatting failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      addNotification('success', 'Content copied to clipboard');
    } catch (err) {
      addNotification('error', 'Failed to copy to clipboard');
    }
  };

  const sampleContent = `Chapter 1: The Beginning

This is a sample chapter with some formatting issues. It needs better structure and formatting.

The protagonist walked down the street. The sun was shining brightly. They had an important decision to make.

"This is dialogue that needs proper formatting," they said.

The chapter continued with more content that could benefit from proper HTML structure and formatting.`;

  const loadSample = () => {
    setContent(sampleContent);
    addNotification('info', 'Sample content loaded');
  };

  const clearContent = () => {
    setContent('');
    setFormatted('');
    setError('');
    setProvider('');
    addNotification('info', 'Content cleared');
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
          📝 Reedsy Chapter Formatter
        </h2>
        <p style={{ 
          color: '#6c757d', 
          margin: 0,
          fontSize: '16px',
          lineHeight: 1.5
        }}>
          Fix formatting issues, improve structure, and enhance your Reedsy chapters with AI-powered assistance.
        </p>
      </div>

      {/* Provider Status */}
      {systemStatus?.providers && (
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
            AI Provider Status:
          </div>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {Object.entries(systemStatus.providers).map(([key, provider]) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '4px 8px',
                background: provider.status === 'healthy' ? '#d4edda' : '#f8d7da',
                borderRadius: '4px',
                color: provider.status === 'healthy' ? '#155724' : '#721c24'
              }}>
                <span>{provider.status === 'healthy' ? '✅' : '❌'}</span>
                <span>{provider.name}</span>
                {provider.responseTime && (
                  <span>({provider.responseTime}ms)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '30px' }}>
        
        {/* Input Section */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '15px' 
          }}>
            <h3 style={{ margin: 0, color: '#333' }}>📥 Input Content</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={loadSample}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📄 Load Sample
              </button>
              <button
                onClick={clearContent}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🗑️ Clear
              </button>
            </div>
          </div>
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your Reedsy chapter content here..."
            style={{
              width: '100%',
              height: '300px',
              padding: '20px',
              border: `2px solid ${theme.primary}`,
              borderRadius: '10px',
              fontSize: '16px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              boxSizing: 'border-box'
            }}
          />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: '10px',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            <div>
              Characters: {content.length} | Words: {content.split(/\s+/).filter(w => w).length}
            </div>
            <button
              onClick={handleFormat}
              disabled={loading || !content.trim()}
              style={{
                padding: '15px 30px',
                backgroundColor: loading || !content.trim() ? '#6c757d' : theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading || !content.trim() ? 'none' : `0 2px 8px ${theme.primary}33`
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
                  {' '}Formatting...
                </>
              ) : (
                '🔧 Fix Formatting Issues'
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #dc3545',
            borderRadius: '8px',
            padding: '15px',
            color: '#721c24'
          }}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {/* Output Section */}
        {formatted && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '15px' 
            }}>
              <h3 style={{ margin: 0, color: '#333' }}>📤 Formatted Result</h3>
              {provider && (
                <div style={{
                  fontSize: '12px',
                  color: '#6c757d',
                  background: '#f8f9fa',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  Powered by: {provider}
                </div>
              )}
            </div>
            
            <textarea
              value={formatted}
              readOnly
              style={{
                width: '100%',
                height: '300px',
                padding: '20px',
                border: `2px solid ${theme.success}`,
                borderRadius: '10px',
                backgroundColor: '#f8fff9',
                fontSize: '16px',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                boxSizing: 'border-box'
              }}
            />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '15px' 
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Output: {formatted.length} characters | {formatted.split(/\s+/).filter(w => w).length} words
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: '12px 24px',
                  backgroundColor: theme.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usage Tips */}
      <div style={{
        marginTop: '40px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid #b3d7ff'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: theme.primary }}>💡 Tips for Better Results</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', lineHeight: 1.6 }}>
          <li>Provide clear chapter structure with titles and paragraphs</li>
          <li>Include dialogue and narrative content for comprehensive formatting</li>
          <li>The AI will automatically add HTML formatting and improve structure</li>
          <li>Review the output and make manual adjustments as needed</li>
          <li>Use the copy button to easily transfer formatted content to Reedsy</li>
        </ul>
      </div>
    </div>
  );
};

export default ReedsyEditor;