import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from './components/SidePanel';
// import './App.css'; // Uncomment if you want to import global styles here

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element with id 'root' not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);