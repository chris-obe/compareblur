import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { GalleryPage } from './components/gallery/GalleryPage';
import { Compare } from './pages/Compare';
import { MyKit } from './pages/MyKit';
import { Suggestions } from './pages/Suggestions';
import { Stub } from './pages/Stub';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell title="Gallery">
            <GalleryPage />
          </AppShell>
        }
      />
      <Route
        path="/compare"
        element={
          <AppShell title="Compare">
            <Compare />
          </AppShell>
        }
      />
      <Route
        path="/kit"
        element={
          <AppShell title="My Kit">
            <MyKit />
          </AppShell>
        }
      />
      <Route
        path="/suggestions"
        element={
          <AppShell title="Suggestions">
            <Suggestions />
          </AppShell>
        }
      />
      <Route
        path="/settings"
        element={
          <AppShell title="Settings">
            <Stub name="Settings" />
          </AppShell>
        }
      />
      <Route
        path="*"
        element={
          <AppShell title="Not found">
            <Stub name="404 — nothing here" />
          </AppShell>
        }
      />
    </Routes>
  );
}
