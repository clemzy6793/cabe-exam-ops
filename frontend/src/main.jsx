import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from './contexts/SessionContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <SessionProvider>
      <App />
      <Toaster position="top-right" />
    </SessionProvider>
  </BrowserRouter>
);
