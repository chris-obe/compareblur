import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './store/ThemeProvider';
import { KitProvider } from './store/KitProvider';
import { CompareProvider } from './store/CompareProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <KitProvider>
          <CompareProvider>
            <App />
          </CompareProvider>
        </KitProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
