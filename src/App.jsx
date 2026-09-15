import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './components/Landing.jsx';
import { Auth } from './components/Auth.jsx';
import { ChatApp } from './components/ChatApp.jsx';
import { LibraryPage } from './components/LibraryPage.jsx';
import { AvatarPage } from './components/AvatarPage.jsx';
import { SpeechToTextPage } from './components/SpeechToTextPage.jsx';
import { TextToSpeechPage } from './components/TextToSpeechPage.jsx';
import { AIDocumentsPage } from './components/AIDocumentsPage.jsx';
import { ImageStudioPage } from './components/ImageStudioPage.jsx';
import { IslamicCalculatorPage } from './components/IslamicCalculatorPage.jsx';
import { CVBuilderPage } from './components/CVBuilderPage.jsx';
import { YoutubeSummaryPage } from './components/YoutubeSummaryPage.jsx';
import { NewsCheckPage } from './components/NewsCheckPage.jsx';
import { DialectConverterPage } from './components/DialectConverterPage.jsx';
import { StudyModePage } from './components/StudyModePage.jsx';
import { OCRPage } from './components/OCRPage.jsx';
import { DataAnalyzerPage } from './components/DataAnalyzerPage.jsx';
import { MeetingNotesPage } from './components/MeetingNotesPage.jsx';
import { EmailAssistantPage } from './components/EmailAssistantPage.jsx';
import { UpgradePage } from './components/UpgradePage.jsx';
import { SubscribePage } from './components/SubscribePage.jsx';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage.jsx';
import { TermsPage } from './components/TermsPage.jsx';
import { FeaturesPage } from './components/FeaturesPage.jsx';
import { AboutUsPage } from './components/AboutUsPage.jsx';
import { ContactPage } from './components/ContactPage.jsx';
import { OrganizationPage } from './components/OrganizationPage.jsx';
import './App.css';
import { FlashcardsPage } from './components/FlashcardsPage.jsx';
import { CodeWorkspacePage } from './components/CodeWorkspacePage.jsx';
import { KnowledgeBasePage } from './components/KnowledgeBasePage.jsx';
import { ResearcherPage } from './components/ResearcherPage.jsx';
import { WorkflowsPage } from './components/WorkflowsPage.jsx';
import { AdGeneratorPage } from './components/AdGeneratorPage.jsx';
import { LiveTranslatePage } from './components/LiveTranslatePage.jsx';
import { FavoritesPage } from './components/FavoritesPage.jsx';
import { VideoAnalysisPage } from './components/VideoAnalysisPage.jsx';
const TOKEN_KEY = 'nexo_token';
const USER_KEY = 'nexo_user';

function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // جديد

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setView('chat');
    }
    setAuthChecked(true); // بنعلّم إنه التحقق خلص
  }, []);

  const handleAuthenticated = (userData) => { setUser(userData); setView('chat'); };
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setView('landing');
  };

  const handleUserUpdate = (updates) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  };
  
const handleGoHome = () => setView('landing');
  const MainView = () => {
    if (view === 'landing') return <Landing onStart={() => setView('auth')} />;
    if (view === 'auth') return <Auth onAuthenticated={handleAuthenticated} />;
    return <ChatApp user={user} onLogout={handleLogout} onGoHome={handleGoHome} onUserUpdate={handleUserUpdate} />;
  };

  // لسا عم نتحقق من localStorage - ما نقرر شي بعد
  if (!authChecked) {
    return null; // أو ممكن Spinner بسيط لاحقًا
  }

  return (
    <Routes>
      <Route
        path="/library"
        element={user ? <LibraryPage user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />}
      />
      <Route
        path="/avatar"
        element={user ? <AvatarPage user={user} /> : <Navigate to="/" replace />}
      />
      <Route
        path="/speech-to-text"
        element={user ? <SpeechToTextPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/text-to-speech"
        element={user ? <TextToSpeechPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/ai-documents"
        element={user ? <AIDocumentsPage /> : <Navigate to="/" replace />}
      /><Route
        path="/image-studio"
        element={user ? <ImageStudioPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/islamic-calculator"
        element={user ? <IslamicCalculatorPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/cv-builder"
        element={user ? <CVBuilderPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/youtube-summary"
        element={user ? <YoutubeSummaryPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/news-check"
        element={user ? <NewsCheckPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/dialect-converter"
        element={user ? <DialectConverterPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/study-mode"
        element={user ? <StudyModePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/ocr"
        element={user ? <OCRPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/data-analyzer"
        element={user ? <DataAnalyzerPage /> : <Navigate to="/" replace />}
      />
            <Route
        path="/meeting-notes"
        element={user ? <MeetingNotesPage /> : <Navigate to="/" replace />}
      />
            <Route
        path="/email-assistant"
        element={user ? <EmailAssistantPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/upgrade"
        element={user ? <UpgradePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/subscribe"
        element={user ? <SubscribePage /> : <Navigate to="/" replace />}
      />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/about" element={<AboutUsPage />} />
      <Route path="/contact" element={<ContactPage />} />
     <Route path="/site" element={<OrganizationPage />} />
      <Route path="/*" element={<MainView />} />
            <Route path="/flashcards" element={user ? <FlashcardsPage /> : <Navigate to="/" replace />} />
      <Route path="/code-workspace" element={user ? <CodeWorkspacePage /> : <Navigate to="/" replace />} />
      <Route path="/knowledge-base" element={user ? <KnowledgeBasePage /> : <Navigate to="/" replace />} />
      <Route path="/researcher" element={user ? <ResearcherPage /> : <Navigate to="/" replace />} />
      <Route path="/workflows" element={user ? <WorkflowsPage /> : <Navigate to="/" replace />} />
          <Route path="/ad-generator" element={user ? <AdGeneratorPage /> : <Navigate to="/" replace />} />
              <Route path="/live-translate" element={<LiveTranslatePage user={user} />} />
<Route path="/live-translate/:roomId" element={<LiveTranslatePage user={user} />} />
          <Route path="/video-analysis" element={user ? <VideoAnalysisPage /> : <Navigate to="/" replace />} />
                <Route path="/favorites" element={user ? <FavoritesPage /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;