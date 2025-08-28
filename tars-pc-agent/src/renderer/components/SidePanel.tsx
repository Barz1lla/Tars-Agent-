import React, { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import ProviderStatus from './ProviderStatus';
import ModuleToggles from './ModuleToggles';
import ActivityFeed from './ActivityFeed';
import LogViewer from './LogViewer';
import SettingsPanel from './SettingsPanel';

type TabId = 'overview' | 'modules' | 'logs' | 'settings';

interface ProviderStatusType {
  [key: string]: any;
}

const SidePanel: React.FC = () => {
  const { socket, logs, status, metrics } = useWebSocket('ws://localhost:5001');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusType>({});

  // Memoize tabs for performance
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'modules', label: 'Modules', icon: '🧩' },
    { id: 'logs', label: 'Logs', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ], []);

  // Request provider status on socket connect
  useEffect(() => {
    if (socket && status === 'connected') {
      socket.send(JSON.stringify({ type: 'get_provider_status' }));
    }
  }, [socket, status]);

  // Listen for provider status updates
  useEffect(() => {
    if (!socket || status !== 'connected') return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'provider_status') {
          setProviderStatus(data.data);
        }
      } catch (err) {
        // Optionally log or ignore parse errors
      }
    };
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, status]);

  return (
    <aside
      className={`side-panel${isCollapsed ? ' collapsed' : ''}`}
      aria-label="TARS Side Panel"
    >
      {/* Header */}
      <header className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="tars-title text-lg font-bold">TARS</h1>
          <span
            className={`status-indicator ${status}`}
            aria-label={`Connection status: ${status}`}
            title={status}
          />
        </div>
        <button
          className="collapse-btn"
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </header>

      {/* Navigation Tabs */}
      {!isCollapsed && (
        <nav className="tab-navigation" aria-label="Panel navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab${activeTab === tab.id ? ' active' : ''}`}
              aria-label={tab.label}
              aria-current={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
            >
              <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Main Content */}
      {!isCollapsed && (
        <main className="panel-content" aria-live="polite">
          {activeTab === 'overview' && (
            <section className="overview-section">
              <ProviderStatus providers={providerStatus} />
              <ModuleToggles metrics={metrics} />
              <ActivityFeed items={logs.slice(-5)} />
            </section>
          )}
          {activeTab === 'modules' && (
            <ModuleToggles metrics={metrics} detailed />
          )}
          {activeTab === 'logs' && (
            <LogViewer logs={logs} />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel />
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="panel-footer text-xs text-gray-400">
        <span className="footer-text">TARS v1.0 &copy; {new Date().getFullYear()}</span>
      </footer>
    </aside>
  );
};

export default SidePanel;