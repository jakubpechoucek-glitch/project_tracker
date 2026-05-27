import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { borderRadius: '10px', fontSize: '14px' },
        success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
        error: { iconTheme: { primary: '#E30613', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
);
