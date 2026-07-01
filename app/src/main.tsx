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
import { FeatureFlagsProvider } from './store/FeatureFlagsProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppAuthProvider>
        <AdminAccessProvider>
          <ThemeProvider>
            <FeatureFlagsProvider>
              <CatalogProvider>
                <KitProvider>
                  <CompareProvider>
                    <ReactionsProvider>
                      <App />
                    </ReactionsProvider>
                  </CompareProvider>
                </KitProvider>
              </CatalogProvider>
            </FeatureFlagsProvider>
          </ThemeProvider>
        </AdminAccessProvider>
      </AppAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
