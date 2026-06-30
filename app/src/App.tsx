import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { GalleryPage } from './components/gallery/GalleryPage';
import { GalleryRoute, AlbumGalleryRoute } from './pages/Gallery';
import { Compare } from './pages/Compare';
import { MyKit } from './pages/MyKit';
import { Suggestions } from './pages/Suggestions';
import { Settings } from './pages/Settings';
import { Stub } from './pages/Stub';
import { Admin } from './pages/Admin';
import { EmbedPhoto } from './pages/EmbedPhoto';
import { Albums } from './pages/Albums';

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
        path="/gallery/photo/:photoId"
        element={
          <AppShell title="Gallery">
            <GalleryRoute />
          </AppShell>
        }
      />
      <Route
        path="/g/:albumSlug"
        element={
          <AppShell title="Gallery">
            <AlbumGalleryRoute />
          </AppShell>
        }
      />
      <Route
        path="/g/:albumSlug/photo/:photoId"
        element={
          <AppShell title="Gallery">
            <AlbumGalleryRoute />
          </AppShell>
        }
      />
      <Route path="/embed/photo/:photoId" element={<EmbedPhoto />} />
      <Route
        path="/albums"
        element={
          <AppShell title="Albums">
            <Albums />
          </AppShell>
        }
      />
      <Route
        path="/albums/:albumSlug"
        element={
          <AppShell title="Albums">
            <Albums />
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
            <Settings />
          </AppShell>
        }
      />
      <Route
        path="/admin"
        element={
          <AppShell title="Admin">
            <Admin />
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
