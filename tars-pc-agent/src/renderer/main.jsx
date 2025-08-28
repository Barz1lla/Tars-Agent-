import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
import './styles/side-panel.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);