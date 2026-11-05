import React from 'react';
import ReactDOM from 'react-dom/client';
import PortalApp from '@portal-app'; // this site's app: see vite.config.js
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PortalApp />
  </React.StrictMode>,
);

