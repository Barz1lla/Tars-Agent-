import React from 'react';

const ProviderStatus = ({ providers }) => {
  const providerList = Object.entries(providers || {});

  return (
    <div className="provider-status">
      <h3>Provider Status</h3>
      <div className="provider-grid">
        {providerList.map(([key, provider]) => (
          <div key={key} className={`provider-card ${provider.status}`}>
            <div className="provider-name">{provider.name}</div>
            <div className="provider-details">
              <span className={`status-dot ${provider.status}`} />
              <span className="status-text">{provider.status}</span>
              {provider.responseTime && (
                <span className="response-time">{provider.responseTime}ms</span>
              )}
            </div>
            <div className="provider-cost">
              ${provider.costPerToken.toFixed(6)} per token
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProviderStatus;