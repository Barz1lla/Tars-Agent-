import React, { useState } from 'react';
import axios from 'axios';

const BookQASystem = ({ socket, systemStatus, addNotification, theme, serverUrl }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const [uploadedBooks, setUploadedBooks] = useState([]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      addNotification('warning', 'Please select a file to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      addNotification('info', `Uploading and processing ${selectedFile.name}...`);
      
      const response = await axios.post(`${serverUrl}/api/book/ingest`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setUploadedBooks(prev => [...prev, response.data.result]);
        addNotification('success', `Book processed: ${response.data.result.chunks} chunks created`);
        setSelectedFile(null);
        document.getElementById('file-input').value = '';
      }
    } catch (error) {
      addNotification('error', `Upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      addNotification('warning', 'Please enter a question');
      return;
    }

    setAsking(true);
    setAnswer('');

    try {
      addNotification('info', 'Searching through books for answer...');
      
      const response = await axios.post(`${serverUrl}/api/book/ask`, {
        question: question.trim()
      });

      if (response.data.success) {
        setAnswer(response.data.result);
        addNotification('success', 'Answer generated successfully');
      }
    } catch (error) {
      addNotification('error', `Question failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setAsking(false);
    }
  };

  const sampleQuestions = [
    "What are the main themes of the book?",
    "Who are the key characters?",
    "What is the central conflict?",
    "How does the book end?",
    "What lessons can be learned?"
  ];

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
          📚 Book Q&A System
        </h2>
        <p style={{ 
          color: '#6c757d', 
          margin: 0,
          fontSize: '16px',
          lineHeight: 1.5
        }}>
          Upload books and ask intelligent questions about their content using AI-powered analysis.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '30px' }}>
        
        {/* Upload Section */}
        <div style={{
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '25px'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>📥 Upload Book</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileSelect}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed #e9ecef',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa',
                fontSize: '14px'
              }}
            />
            
            {selectedFile && (
              <div style={{ 
                marginTop: '10px', 
                fontSize: '14px', 
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📄</span>
                <span>{selectedFile.name}</span>
                <span>({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              style={{
                padding: '12px 24px',
                backgroundColor: uploading || !selectedFile ? '#6c757d' : theme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: uploading || !selectedFile ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {uploading ? '📤 Processing...' : '📤 Upload & Process'}
            </button>
            
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Supported: PDF, DOCX, TXT, MD
            </div>
          </div>
        </div>

        {/* Uploaded Books */}
        {uploadedBooks.length > 0 && (
          <div style={{
            background: '#f8fff9',
            border: '1px solid #28a745',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <h3 style={{ color: theme.success, marginBottom: '20px' }}>
              📖 Uploaded Books ({uploadedBooks.length})
            </h3>
            
            <div style={{ display: 'grid', gap: '10px' }}>
              {uploadedBooks.map((book, index) => (
                <div key={index} style={{
                  background: 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>{book.filename}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {book.chunks} chunks • {book.wordCount} words
                    </div>
                  </div>
                  <div style={{
                    background: theme.primary,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Ready
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A Section */}
        <div style={{
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '25px'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>❓ Ask Questions</h3>
          
          {uploadedBooks.length === 0 && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              color: '#856404'
            }}>
              ⚠️ Please upload at least one book before asking questions.
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask any question about your uploaded books..."
              disabled={uploadedBooks.length === 0}
              style={{
                width: '100%',
                height: '120px',
                padding: '15px',
                border: `2px solid ${theme.primary}`,
                borderRadius: '8px',
                fontSize: '16px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Sample Questions */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>
              💡 Sample questions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sampleQuestions.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(sample)}
                  disabled={uploadedBooks.length === 0}
                  style={{
                    padding: '6px 12px',
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '15px',
                    fontSize: '12px',
                    cursor: uploadedBooks.length === 0 ? 'not-allowed' : 'pointer',
                    color: '#6c757d',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAskQuestion}
            disabled={asking || !question.trim() || uploadedBooks.length === 0}
            style={{
              padding: '15px 30px',
              backgroundColor: asking || !question.trim() || uploadedBooks.length === 0 ? '#6c757d' : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: asking || !question.trim() || uploadedBooks.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {asking ? '🔍 Searching...' : '🔍 Get Answer'}
          </button>
        </div>

        {/* Answer Section */}
        {answer && (
          <div style={{
            background: '#e7f3ff',
            border: '1px solid #007bff',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <h3 style={{ color: theme.primary, marginBottom: '15px' }}>
              💬 Answer
            </h3>
            
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              lineHeight: 1.6,
              fontSize: '16px'
            }}>
              {answer.answer}
            </div>

            {answer.sources && answer.sources.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#495057' }}>
                  📖 Sources:
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {answer.sources.map((source, index) => (
                    <div key={index} style={{
                      background: 'white',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef',
                      fontSize: '12px',
                      color: '#6c757d'
                    }}>
                      {source.filename} - Chunk {source.chunkIndex + 1} (Score: {source.score?.toFixed(1)})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answer.confidence && (
              <div style={{ 
                marginTop: '15px', 
                fontSize: '14px',
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🎯 Confidence:</span>
                <div style={{
                  width: '100px',
                  height: '8px',
                  background: '#e9ecef',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${answer.confidence * 100}%`,
                    height: '100%',
                    background: answer.confidence > 0.7 ? theme.success : answer.confidence > 0.4 ? theme.warning : theme.error
                  }}></div>
                </div>
                <span>{Math.round(answer.confidence * 100)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={{
        marginTop: '40px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid #b3d7ff'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: theme.primary }}>💡 How to Use</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', lineHeight: 1.6 }}>
          <li>Upload books in PDF, DOCX, TXT, or MD format</li>
          <li>Books are automatically processed and chunked for optimal search</li>
          <li>Ask specific questions about characters, themes, plot, or any content</li>
          <li>The AI searches through all uploaded books to find relevant answers</li>
          <li>Answers include source references and confidence scores</li>
        </ul>
      </div>
    </div>
  );
};

export default BookQASystem;