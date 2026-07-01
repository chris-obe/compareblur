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
import { EmbedGallery } from './pages/EmbedGallery';
import { Albums } from './pages/Albums';
import { FeatureFlagGate } from './store/FeatureFlagsProvider';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <GalleryPage />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/gallery/photo/:photoId"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <GalleryRoute />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/g/:albumSlug"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <AlbumGalleryRoute />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/g/:albumSlug/photo/:photoId"
        element={
          <AppShell title="Gallery">
            <FeatureFlagGate flag="gallery">
              <AlbumGalleryRoute />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route path="/embed/photo/:photoId" element={<EmbedPhoto />} />
      <Route path="/embed/album/:albumSlug" element={<EmbedGallery mode="album" />} />
      <Route path="/embed/photos" element={<EmbedGallery mode="set" />} />
      <Route
        path="/albums"
        element={
          <AppShell title="Albums">
            <FeatureFlagGate flag="albums">
              <Albums />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/albums/:albumSlug"
        element={
          <AppShell title="Albums">
            <FeatureFlagGate flag="albums">
              <Albums />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/compare"
        element={
          <AppShell title="Compare">
            <FeatureFlagGate flag="compare">
              <Compare />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/kit"
        element={
          <AppShell title="My Kit">
            <FeatureFlagGate flag="kit">
              <MyKit />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/suggestions"
        element={
          <AppShell title="Suggestions">
            <FeatureFlagGate flag="suggestions">
              <Suggestions />
            </FeatureFlagGate>
          </AppShell>
        }
      />
      <Route
        path="/settings"
        element={
          <AppShell title="Settings">
            <FeatureFlagGate flag="settings">
              <Settings />
            </FeatureFlagGate>
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
