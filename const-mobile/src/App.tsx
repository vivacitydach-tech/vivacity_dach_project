import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/Layout'
import { CameraPage } from './pages/CameraPage'
import { ChecklistPage } from './pages/ChecklistPage'
import { DiaryPage } from './pages/DiaryPage'
import { LoginPage } from './pages/LoginPage'
import { ProjectHomePage } from './pages/ProjectHomePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { QueuePage } from './pages/QueuePage'
import { SnagPage } from './pages/SnagPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectHomePage />} />
        <Route path="/projects/:projectId/diary" element={<DiaryPage />} />
        <Route path="/projects/:projectId/snags" element={<SnagPage />} />
        <Route path="/projects/:projectId/camera" element={<CameraPage />} />
        <Route path="/projects/:projectId/checklists" element={<ChecklistPage />} />
        <Route path="/projects/:projectId/queue" element={<QueuePage />} />
      </Route>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}
