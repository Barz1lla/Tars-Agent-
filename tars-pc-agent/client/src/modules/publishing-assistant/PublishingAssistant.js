import React, { useState } from 'react';
import axios from 'axios';

const PublishingAssistant = ({ socket, systemStatus, addNotification, theme, serverUrl }) => {
  const [bookData, setBookData] = useState({
    bookTitle: '',
    genre: '',
    description: '',
    author: ''
  });
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [contentType, setContentType] = useState('query-letter');

  const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
    'Fantasy', 'Thriller', 'Biography', 'Self-Help', 'Business',
    'History', 'Poetry', 'Children', 'Young Adult', 'Literary Fiction'
  ];

  const contentTypes = [
    { id: 'query-letter', name: 'Query Letter', icon: '📋', description: 'Professional query letter for publishers' },
    { id: 'social-post', name: 'Social Media Posts', icon: '📱', description: 'Engaging posts for social platforms' },
    { id: 'campaign', name: 'Full Campaign', icon: '🚀', description: 'Complete marketing campaign package' }
  ];

  const handleInputChange = (field, value) => {
    setBookData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!bookData.bookTitle.trim() || !bookData.genre) {
      addNotification('warning', 'Please fill in at least the book title and genre');
      return;
    }

    setGenerating(true);
    setGeneratedContent(null);

    try {
      addNotification('info', `Generating ${contentTypes.find(ct => ct.id === contentType)?.name}...`);
      
      let endpoint, payload;
      
      if (contentType === 'campaign') {
        endpoint = `${serverUrl}/api/publish/outreach`;
        payload = bookData;
      } else {
        endpoint = `${serverUrl}/api/publish/generate`;
        payload = {
          type: contentType,
          context: bookData
        };
      }

      const response = await axios.post(endpoint, payload);

      if (response.data.success) {
        setGeneratedContent({
          type: contentType,
          content: response.data.result,
          provider: response.data.provider
        });
        addNotification('success', `${contentTypes.find(ct => ct.id === contentType)?.name} generated successfully`);
      }
    } catch (error) {
      addNotification('error', `Generation failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      const textToCopy = typeof generatedContent.content === 'string' ? 
        generatedContent.content : JSON.stringify(generatedContent.content, null, 2);
      
      await navigator.clipboard.writeText(textToCopy);
      addNotification('success', 'Content copied to clipboard');
    } catch (err) {
      addNotification('error', 'Failed to copy to clipboard');
    }
  };

  const loadSampleData = () => {
    setBookData({
      bookTitle: 'The Digital Revolution',
      genre: 'Non-Fiction',
      description: 'An exploration of how technology is reshaping society and human relationships in the 21st century.',
      author: 'Alex Thompson'
    });
    addNotification('info', 'Sample book data loaded');
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
          📤 Publishing Assistant
        </h2>
        <p style={{ 
          color: '#6c757d', 
          margin: 0,
          fontSize: '16px',
          lineHeight: 1.5
        }}>
          Generate professional marketing materials, query letters, and social media content for your book.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '30px' }}>
        
        {/* Book Information */}
        <div style={{
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '25px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <h3 style={{ margin: 0, color: '#333' }}>📖 Book Information</h3>
            <button
              onClick={loadSampleData}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              📄 Load Sample
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Book Title *
                </label>
                <input
                  type="text"
                  value={bookData.bookTitle}
                  onChange={(e) => handleInputChange('bookTitle', e.target.value)}
                  placeholder="Enter your book title"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                  Author Name
                </label>
                <input
                  type="text"
                  value={bookData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Author name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                Genre *
              </label>
              <select
                value={bookData.genre}
                onChange={(e) => handleInputChange('genre', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Genre</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                Description
              </label>
              <textarea
                value={bookData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your book (optional but recommended)"
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Type Selection */}
        <div style={{
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '25px'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>📝 Content Type</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {contentTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                style={{
                  background: contentType === type.id ? theme.primary : 'white',
                  color: contentType === type.id ? 'white' : '#333',
                  border: `2px solid ${contentType === type.id ? theme.primary : '#e9ecef'}`,
                  padding: '20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{type.icon}</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{type.name}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleGenerate}
            disabled={generating || !bookData.bookTitle.trim() || !bookData.genre}
            style={{
              padding: '15px 40px',
              backgroundColor: generating || !bookData.bookTitle.trim() || !bookData.genre ? '#6c757d' : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: generating || !bookData.bookTitle.trim() || !bookData.genre ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: generating || !bookData.bookTitle.trim() || !bookData.genre ? 'none' : `0 4px 15px ${theme.primary}33`
            }}
          >
            {generating ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
                {' '}Generating...
              </>
            ) : (
              `🚀 Generate ${contentTypes.find(ct => ct.id === contentType)?.name}`
            )}
          </button>
        </div>

        {/* Generated Content */}
        {generatedContent && (
          <div style={{
            background: '#f8fff9',
            border: '1px solid #28a745',
            borderRadius: '12px',
            padding: '25px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: 0, color: theme.success }}>
                ✅ Generated {contentTypes.find(ct => ct.id === generatedContent.type)?.name}
              </h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {generatedContent.provider && (
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    background: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    via {generatedContent.provider}
                  </div>
                )}
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: theme.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>
            
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: '14px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {typeof generatedContent.content === 'string' ? 
                generatedContent.content : 
                JSON.stringify(generatedContent.content, null, 2)
              }
            </div>
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
        <h4 style={{ margin: '0 0 15px 0', color: theme.primary }}>💡 Publishing Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', lineHeight: 1.6 }}>
          <li><strong>Query Letters:</strong> Professional letters to pitch your book to agents and publishers</li>
          <li><strong>Social Media:</strong> Engaging posts to build your author platform and promote your book</li>
          <li><strong>Full Campaign:</strong> Complete marketing package including strategy and publisher list</li>
          <li>Always customize generated content to match your specific book and target audience</li>
          <li>Research publishers and agents before sending query letters</li>
        </ul>
      </div>
    </div>
  );
};

export default PublishingAssistant;