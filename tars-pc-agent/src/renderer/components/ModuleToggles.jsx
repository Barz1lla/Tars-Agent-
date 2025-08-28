import React from 'react';

const ModuleToggles = ({ metrics, detailed = false }) => {
  const modules = [
    { id: 'pietarien_archivist', name: 'Pietarien Archivist', icon: '📚' },
    { id: 'reedsy_repair', name: 'Reedsy Repair', icon: '🔧' },
    { id: 'chat_auto_filer', name: 'Chat Auto-Filer', icon: '📁' },
    { id: 'book_qa', name: 'Book QA', icon: '❓' },
    { id: 'publishing_assistant', name: 'Publishing Assistant', icon: '📖' }
  ];

  return (
    <div className="module-toggles">
      <h3>Modules</h3>
      <div className="module-grid">
        {modules.map(module => (
          <div key={module.id} className="module-card">
            <div className="module-header">
              <span className="module-icon">{module.icon}</span>
              <span className="module-name">{module.name}</span>
            </div>
            
            {detailed && metrics?.[module.id] && (
              <div className="module-metrics">
                <span className="metric">
                  {metrics[module.id].lastRun || 'Never run'}
                </span>
                <span className="metric">
                  {metrics[module.id].filesProcessed || 0} files
                </span>
              </div>
            )}
            
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleToggles;