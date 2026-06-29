import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppAuthProvider } from './auth/AuthProvider';
import { ThemeProvider } from './store/ThemeProvider';
import { KitProvider } from './store/KitProvider';
import { CompareProvider } from './store/CompareProvider';
import { CatalogProvider } from './store/CatalogProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppAuthProvider>
        <ThemeProvider>
          <CatalogProvider>
            <KitProvider>
              <CompareProvider>
                <App />
              </CompareProvider>
            </KitProvider>
          </CatalogProvider>
        </ThemeProvider>
      </AppAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
