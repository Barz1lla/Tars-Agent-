import React, { useState } from 'react';
import axios from 'axios';

function FileManager() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'; // Use environment variable or default to localhost

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage(''); // Clear message when a new file is selected
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('❌ Please select a file first!');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload file
      const response = await axios.post(`${serverUrl}/api/book/ingest`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(`✅ File uploaded successfully: ${response.data.fileName || file.name}`);
    } catch (error) {
      setMessage(`❌ Upload error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganize = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${serverUrl}/api/organize`);
      setMessage(`✅ Organized ${response.data.result?.organized || 'files'} successfully!`);
    } catch (error) {
      setMessage(`❌ Organization error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>📁 Interactive File Manager</h2>

      {/* File Upload Section */}
      <div style={{ border: '2px dashed #ccc', padding: '20px', margin: '20px 0', borderRadius: '10px' }}>
        <h3>📤 Upload Files</h3>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ margin: '10px 0' }}
          accept=".pdf,.docx,.txt,.md"
        />
        <br />
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
          }}
        >
          {loading ? '⏳ Uploading...' : '📤 Upload'}
        </button>
      </div>

      {/* File Organization Section */}
      <div style={{ border: '2px dashed #ccc', padding: '20px', margin: '20px 0', borderRadius: '10px' }}>
        <h3>🗂️ Organize Files</h3>
        <button
          onClick={handleOrganize}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Organizing...' : '🗂️ Organize'}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            backgroundColor: '#f8f9fa',
            color: '#333',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default FileManager;