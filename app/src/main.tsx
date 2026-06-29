import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppAuthProvider } from './auth/AuthProvider';
import { AdminAccessProvider } from './auth/AdminAccessProvider';
import { ThemeProvider } from './store/ThemeProvider';
import { KitProvider } from './store/KitProvider';
import { CompareProvider } from './store/CompareProvider';
import { CatalogProvider } from './store/CatalogProvider';
import { ReactionsProvider } from './store/ReactionsProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppAuthProvider>
        <AdminAccessProvider>
          <ThemeProvider>
            <CatalogProvider>
              <KitProvider>
                <CompareProvider>
                  <ReactionsProvider>
                    <App />
                  </ReactionsProvider>
                </CompareProvider>
              </KitProvider>
            </CatalogProvider>
          </ThemeProvider>
        </AdminAccessProvider>
      </AppAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
