import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import ImageToComicPage from './pages/ImageToComicPage';
import EditorPage from './pages/EditorPage';
import VideoPage from './pages/VideoPage';
import ProjectsPage from './pages/ProjectsPage';
import LoginPage from './pages/LoginPage';
import UserCenterPage from './pages/UserCenterPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/image-to-comic" element={<ImageToComicPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/editor/:projectId" element={<EditorPage />} />
        <Route path="/video/:projectId" element={<VideoPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/user-center" element={<UserCenterPage />} />
      </Route>
    </Routes>
  );
}

export default App;
