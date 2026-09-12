import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { TimetablePage } from './pages/TimetablePage';
import { ConflictsPage } from './pages/ConflictsPage';
import { ExaminationsPage } from './pages/ExaminationsPage';
import { ModulesPage } from './pages/ModulesPage';
import { LecturersPage } from './pages/LecturersPage';
import { CohortsPage } from './pages/CohortsPage';
import { RoomsPage } from './pages/RoomsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { api } from './services/api';

const AppLayout: React.FC = () => {
  const [conflictCount, setConflictCount] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const checkValidation = async () => {
    try {
      const res = await api.validateTimetable();
      setIsValid(res.data.data.isValid);
      setConflictCount(res.data.data.conflictCount);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkValidation();
  }, []);

  const handleGlobalGenerate = async () => {
    try {
      setIsGenerating(true);
      await api.generateTimetable();
      await checkValidation();
      window.location.reload();
    } catch (e: any) {
      alert('Error generating timetable: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar conflictCount={conflictCount} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          isValid={isValid}
          conflictCount={conflictCount}
          onGenerateTimetable={handleGlobalGenerate}
          isGenerating={isGenerating}
        />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/conflicts" element={<ConflictsPage />} />
            <Route path="/examinations" element={<ExaminationsPage />} />
            <Route path="/modules" element={<ModulesPage />} />
            <Route path="/lecturers" element={<LecturersPage />} />
            <Route path="/cohorts" element={<CohortsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
