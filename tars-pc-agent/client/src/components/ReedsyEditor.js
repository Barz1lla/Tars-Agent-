import React, { useState } from 'react';
import axios from 'axios';

const ReedsyEditor = () => {
  const [content, setContent] = useState('');
  const [formatted, setFormatted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'; // Use environment variable or default to localhost

  const handleFormat = async () => {
    setLoading(true);
    setError('');
    setFormatted('');
    try {
      const response = await axios.post(`${serverUrl}/api/repair-reedsy`, {
        content: content.trim(),
      });
      setFormatted(response.data.formatted || response.data.result || '✅ Formatting complete!');
    } catch (err) {
      setError(err.response?.data?.error || '❌ An error occurred while formatting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>📝 Reedsy Chapter Formatter</h2>

      {/* Input Section */}
      <div style={{ margin: '20px 0' }}>
        <h3>📥 Paste Your Chapter</h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your Reedsy chapter content here..."
          style={{
            width: '100%',
            height: '250px',
            padding: '15px',
            border: '2px solid #007bff',
            borderRadius: '8px',
            fontSize: '16px',
            resize: 'vertical',
          }}
        />
      </div>

      <button
        onClick={handleFormat}
        disabled={loading || !content.trim()}
        style={{
          padding: '12px 30px',
          backgroundColor: loading || !content.trim() ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {loading ? '🔧 Formatting...' : '🔧 Fix Formatting Issues'}
      </button>

      {/* Error Message */}
      {error && (
        <div
          style={{
            margin: '20px 0',
            padding: '10px',
            border: '1px solid #dc3545',
            borderRadius: '5px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
          }}
        >
          {error}
        </div>
      )}

      {/* Output Section */}
      {formatted && (
        <div style={{ margin: '20px 0' }}>
          <h3>📤 Formatted Result</h3>
          <textarea
            value={formatted}
            readOnly
            style={{
              width: '100%',
              height: '250px',
              padding: '15px',
              border: '2px solid #28a745',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              resize: 'vertical',
            }}
          />
          <button
            onClick={() => navigator.clipboard.writeText(formatted)}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            📋 Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};

export default ReedsyEditor;