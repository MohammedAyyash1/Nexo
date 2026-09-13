import { useState } from 'react';
import { X } from 'lucide-react';
import { SettingsNav, SECTIONS } from './SettingsNav.jsx';
import { GeneralSection } from './sections/GeneralSection.jsx';
import { PersonalizationSection } from './sections/PersonalizationSection.jsx';
import { ChatSection } from './sections/ChatSection.jsx';
import { AISection } from './sections/AISection.jsx';
import { SecuritySection } from './sections/SecuritySection.jsx';
import { FilesSection } from './sections/FilesSection.jsx';
import { DataControlsSection } from './sections/DataControlsSection.jsx';
import { AboutSection } from './sections/AboutSection.jsx';
import { VoiceSection } from './sections/VoiceSection.jsx';
import { SubscriptionSection } from './sections/SubscriptionSection.jsx';
import { MemorySection } from './sections/MemorySection.jsx';
import { ProjectsSection } from './sections/ProjectsSection.jsx';
import { AssistantsSection } from './sections/AssistantsSection.jsx';
import { PlaceholderSection } from './sections/PlaceholderSection.jsx';
import './settings.css';

export function SettingsModal({ user, lang, toggleLang, onLogout, onClose, showToast, onChatsCleared, onAutoRenameChange, initialSection }) {
  const [active, setActive] = useState(initialSection || 'general');

  const renderSection = () => {
    if (active === 'general') return <GeneralSection user={user} lang={lang} toggleLang={toggleLang} onLogout={onLogout} />;
    if (active === 'personalization') return <PersonalizationSection lang={lang} showToast={showToast} />;
    if (active === 'chat') return <ChatSection lang={lang} showToast={showToast} onChatsCleared={onChatsCleared} onAutoRenameChange={onAutoRenameChange} />;
    if (active === 'ai') return <AISection lang={lang} showToast={showToast} />;
    if (active === 'security') return <SecuritySection lang={lang} showToast={showToast} />;
    if (active === 'files') return <FilesSection lang={lang} showToast={showToast} />;
    if (active === 'data') return <DataControlsSection lang={lang} showToast={showToast} onAccountDeleted={onLogout} />;
    if (active === 'about') return <AboutSection lang={lang} />;
    if (active === 'voice') return <VoiceSection lang={lang} showToast={showToast} />;
    if (active === 'subscription') return <SubscriptionSection lang={lang} />;
    if (active === 'memory') return <MemorySection lang={lang} showToast={showToast} />;
    if (active === 'assistants') return <AssistantsSection lang={lang} showToast={showToast} />;
    if (active === 'projects') return <ProjectsSection lang={lang} showToast={showToast} />;
    return <PlaceholderSection />;
  };

  return (
    <div className="nexo-settings-overlay" onClick={onClose}>
      <div className="nexo-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nexo-settings-modal-header">
          <h2 className="nexo-dialog-title">{lang === 'en' ? 'Settings' : 'الإعدادات'}</h2>
          <button className="nexo-btn nexo-btn-ghost nexo-btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="nexo-settings-modal-body">
          <SettingsNav active={active} onSelect={setActive} lang={lang} />
          <div className="nexo-settings-content">
            <div key={active} className="nexo-settings-section-enter">
              <h3 className="nexo-settings-content-heading">
                {lang === 'en'
                  ? SECTIONS.find((s) => s.id === active)?.labelEn
                  : SECTIONS.find((s) => s.id === active)?.labelAr}
              </h3>
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}