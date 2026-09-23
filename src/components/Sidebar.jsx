import { useState, useRef } from 'react';
import {
  Menu, Search, SquarePen, X, FolderOpen, Bot, Plus, FolderKanban,
  ChevronDown, ChevronRight as ChevronRightIcon, Video, Mic, Volume2,
  FileStack, Image as ImageIcon, Moon, FileUser, PlayCircle, ShieldCheck,
  Languages, GraduationCap, ScanText, BarChart3, Users, Mail,
  Layers, Code2, BookOpen, Workflow, Megaphone, Sparkles, Film, Radio, Star,
  Home, MessageSquare, Settings as SettingsIcon,
} from 'lucide-react';
import { Logo } from './Logo.jsx';

const TOOL_GROUPS = [
  { key: 'media', labelAr: 'الصوت والصور', labelEn: 'Voice & Media', tools: [
    { key: 'avatar', icon: Video, labelAr: 'أفاتار الذكاء الاصطناعي', labelEn: 'Avatar AI', descAr: 'حوّل صورة ونص لفيديو شخص متحدث', descEn: 'Turn a photo and script into a talking video', handlerKey: 'onOpenAvatar', path: '/avatar' },
    { key: 'stt', icon: Mic, labelAr: 'تحويل الصوت إلى نص', labelEn: 'Speech to Text', descAr: 'حوّل تسجيل صوتي أو فيديو لنص مكتوب', descEn: 'Convert an audio or video recording to text', handlerKey: 'onOpenSTT', path: '/speech-to-text' },
    { key: 'tts', icon: Volume2, labelAr: 'تحويل النص إلى صوت', labelEn: 'Text to Speech', descAr: 'حوّل أي نص لصوت مسموع حقيقي', descEn: 'Convert any text into real spoken audio', handlerKey: 'onOpenTTS', path: '/text-to-speech' },
    { key: 'imagestudio', icon: ImageIcon, labelAr: 'استوديو الصور', labelEn: 'Image Studio', descAr: 'ولّد أو عدّل صورًا بالذكاء الاصطناعي', descEn: 'Generate or edit images with AI', handlerKey: 'onOpenImageStudio', path: '/image-studio' },
    { key: 'videoanalysis', icon: Film, labelAr: 'تحليل الفيديو', labelEn: 'Video Analysis', descAr: 'استخراج وتلخيص محتوى الفيديو (قريبًا)', descEn: 'Extract and summarize video content (coming soon)', handlerKey: 'onOpenVideoAnalysis', path: '/video-analysis' },
    { key: 'livetranslate', icon: Radio, labelAr: 'المكالمات والاجتماعات', labelEn: 'Calls & Meetings', descAr: 'مكالمة صوتية أو مرئية، مع ترجمة فورية عند الحاجة', descEn: 'Voice or video calls, with live translation when you need it', handlerKey: 'onOpenLiveTranslate', path: '/live-translate' },
  ]},
  { key: 'documents', labelAr: 'المستندات والبيانات', labelEn: 'Documents & Data', tools: [
    { key: 'documents', icon: FileStack, labelAr: 'تحليل المستندات', labelEn: 'AI Documents', descAr: 'لخّص أي ملف PDF أو Word واستخرج أهم نقاطه', descEn: 'Summarize any PDF or Word file', handlerKey: 'onOpenDocuments', path: '/ai-documents' },
    { key: 'ocr', icon: ScanText, labelAr: 'استخراج نص من صورة', labelEn: 'OCR', descAr: 'استخرج أي نص مكتوب داخل صورة', descEn: 'Extract written text from any image', handlerKey: 'onOpenOcr', path: '/ocr' },
    { key: 'dataanalyzer', icon: BarChart3, labelAr: 'محلل البيانات', labelEn: 'Data Analyzer', descAr: 'احسب إحصائيات دقيقة من ملفات CSV أو Excel', descEn: 'Compute real statistics from CSV/Excel', handlerKey: 'onOpenDataAnalyzer', path: '/data-analyzer' },
    { key: 'meetingnotes', icon: Users, labelAr: 'محاضر الاجتماعات', labelEn: 'Meeting Notes', descAr: 'حوّل تسجيل اجتماع لمحضر منظم', descEn: 'Turn a meeting recording into organized notes', handlerKey: 'onOpenMeetingNotes', path: '/meeting-notes' },
    { key: 'knowledgebase', icon: BookOpen, labelAr: 'قاعدة معرفتي', labelEn: 'Knowledge Base', descAr: 'اجمع ملاحظاتك واسأل Nexo عنها بأي وقت', descEn: 'Collect notes and ask Nexo about them', handlerKey: 'onOpenKnowledgeBase', path: '/knowledge-base' },
  ]},
  { key: 'productivity', labelAr: 'الإنتاجية', labelEn: 'Productivity', tools: [
    { key: 'email', icon: Mail, labelAr: 'مساعد الإيميلات', labelEn: 'Email Assistant', descAr: 'اكتب، ردّ، أو حسّن إيميلاتك', descEn: 'Compose, reply to, or improve emails', handlerKey: 'onOpenEmail', path: '/email-assistant' },
    { key: 'flashcards', icon: Layers, labelAr: 'البطاقات التعليمية', labelEn: 'Flashcards', descAr: 'بطاقات مذاكرة قابلة للقلب من أي موضوع', descEn: 'Flippable study flashcards on any topic', handlerKey: 'onOpenFlashcards', path: '/flashcards' },
    { key: 'study', icon: GraduationCap, labelAr: 'وضع المذاكرة', labelEn: 'Study Mode', descAr: 'ملخص ومفاهيم واختبار تفاعلي من أي مادة', descEn: 'Summary and interactive quiz from any material', handlerKey: 'onOpenStudy', path: '/study-mode' },
    { key: 'codeworkspace', icon: Code2, labelAr: 'مساحة عمل الكود', labelEn: 'Code Workspace', descAr: 'اكتب، اشرح، أو صحّح كود بالذكاء الاصطناعي', descEn: 'Generate, explain, or debug code with AI', handlerKey: 'onOpenCodeWorkspace', path: '/code-workspace' },
    { key: 'researcher', icon: Search, labelAr: 'الباحث', labelEn: 'Researcher', descAr: 'تقارير بحث معمّقة حول أي سؤال', descEn: 'In-depth research reports on any question', handlerKey: 'onOpenResearcher', path: '/researcher' },
    { key: 'workflows', icon: Workflow, labelAr: 'سلاسل العمل الآلية', labelEn: 'Workflows', descAr: 'سلسلة خطوات ذكاء اصطناعي تشتغل بالتتابع', descEn: 'A chain of AI steps that run in sequence', handlerKey: 'onOpenWorkflows', path: '/workflows' },
    { key: 'adgenerator', icon: Megaphone, labelAr: 'مولّد الإعلانات', labelEn: 'Ad Generator', descAr: 'ولّد نص وصورة إعلان جاهزين للنشر', descEn: 'Generate ready-to-publish ad copy and image', handlerKey: 'onOpenAdGenerator', path: '/ad-generator' },
  ]},
  { key: 'specialized', labelAr: 'أدوات متخصصة', labelEn: 'Specialized', tools: [
    { key: 'islamic', icon: Moon, labelAr: 'الزكاة والمواريث', labelEn: 'Zakat & Inheritance', descAr: 'حسابات شرعية دقيقة للزكاة والمواريث', descEn: 'Accurate Islamic zakat & inheritance calculations', handlerKey: 'onOpenIslamic', path: '/islamic-calculator' },
    { key: 'cv', icon: FileUser, labelAr: 'منشئ السيرة الذاتية', labelEn: 'CV Builder', descAr: 'ابنِ سيرة ذاتية احترافية جاهزة للتصدير', descEn: 'Build a professional, export-ready CV', handlerKey: 'onOpenCV', path: '/cv-builder' },
    { key: 'youtube', icon: PlayCircle, labelAr: 'ملخّص يوتيوب', labelEn: 'YouTube Summary', descAr: 'لخّص أي فيديو يوتيوب فيه ترجمة نصية', descEn: 'Summarize any YouTube video with captions', handlerKey: 'onOpenYoutube', path: '/youtube-summary' },
    { key: 'newscheck', icon: ShieldCheck, labelAr: 'كاشف مصداقية الأخبار', labelEn: 'News Checker', descAr: 'تحقق من مصداقية خبر عبر بحث حقيقي', descEn: 'Fact-check news using real web search', handlerKey: 'onOpenNewsCheck', path: '/news-check' },
    { key: 'dialect', icon: Languages, labelAr: 'محوّل العامية والفصحى', labelEn: 'Dialect Converter', descAr: 'حوّل بين الفصحى وست لهجات عربية', descEn: 'Convert between formal Arabic and 6 dialects', handlerKey: 'onOpenDialect', path: '/dialect-converter' },
  ]},
];
export { TOOL_GROUPS };

export function Sidebar(props) {
  const {
    t, sidebarCollapsed, toggleSidebar, toggleLang, searchOpen, setSearchOpen,
    showBrandMenu, setShowBrandMenu, onGoHome, onLogout, handleNewChat,
    searchQuery, setSearchQuery, filteredChats, activeChatId, setActiveChatId,
    handleDeleteChat, user, onOpenSettings, onOpenLibrary, onOpenFavorites,
    onToggleToolsPanel,
    lang, assistants = [], activeAssistantId, onSelectAssistant, onCreateAssistant,
    projects = [], chatsByProject = {}, onCreateProject, onNewChatInProject,
    onDeleteProject, onDeleteAssistant,
  } = props;

  const [expandedProjectIds, setExpandedProjectIds] = useState(new Set());
  const toggleExpandProject = (id) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const recentChatsRef = useRef(null);
  const scrollToRecentChats = () => {
    setSearchOpen(true);
    recentChatsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const safeCall = (fn) => (typeof fn === 'function' ? fn : () => {});
  const t2 = (ar, en) => (lang === 'en' ? en : ar);

  const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 640;
  const withAutoClose = (fn) => () => {
    safeCall(fn)();
    if (isMobile()) toggleSidebar();
  };

  const NAV_ITEMS = [
    { icon: Home, label: t2('الرئيسية', 'Home'), onClick: withAutoClose(onGoHome) },
    { icon: MessageSquare, label: t2('المحادثات', 'Chats'), onClick: withAutoClose(scrollToRecentChats) },
    { icon: Star, label: t2('المفضلة', 'Favorites'), onClick: withAutoClose(onOpenFavorites) },
    { icon: Sparkles, label: t2('الأدوات', 'Tools'), onClick: withAutoClose(onToggleToolsPanel) },
    { icon: FolderOpen, label: t2('المستندات', 'Documents'), onClick: withAutoClose(onOpenLibrary) },
    { icon: SettingsIcon, label: t2('الإعدادات', 'Settings'), onClick: withAutoClose(onOpenSettings) },
  ];

  return (
    <>
      {!sidebarCollapsed && isMobile() && (
        <div className="nexo-sidebar-backdrop" onClick={toggleSidebar} />
      )}
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-top">
        <button className="icon-btn" title={t.collapse} onClick={toggleSidebar}><Menu size={18} /></button>
        <button className="icon-btn lang-btn" title="Language" onClick={toggleLang}>{t.langLabel}</button>
        <button className="icon-btn" title={t.search} onClick={() => setSearchOpen((prev) => !prev)}>
          <Search size={18} />
        </button>
      </div>

      <div className="sidebar-brand" onClick={() => setShowBrandMenu((s) => !s)}>
        <Logo size={26} /><span>{t.brand}</span>
        {showBrandMenu && (
          <div className="brand-menu" onClick={(e) => e.stopPropagation()}>
            <div className="brand-menu-item" onClick={onGoHome}>الصفحة الرئيسية</div>
            <div className="brand-menu-item" onClick={onLogout}>{t.logout}</div>
          </div>
        )}
      </div>

      <button className="sidebar-newchat-btn" onClick={handleNewChat}>
        <SquarePen size={16} />
        <span>{t2('محادثة جديدة', 'New chat')}</span>
      </button>

      <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <nav className="side-nav-v3 side-nav-v3-primary">
          {NAV_ITEMS.map((item) => (
            <div key={item.label} className="side-nav-v3-item" onClick={item.onClick}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* المحادثات الأخيرة — مباشرة تحت التنقل، كما طُلب */}
        <div ref={recentChatsRef} className="sidebar-section-label sidebar-section-label-first">{t.recentChats}</div>

        {searchOpen && (
          <input type="text" className="sidebar-search-input" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
        )}

        <div className="chat-list">
          {filteredChats.map((c) => (
            <div key={c.id} className={`chat-item ${c.id === activeChatId ? 'active' : ''}`} onClick={() => { setActiveChatId(c.id); if (isMobile()) toggleSidebar(); }}>
              <span className="chat-item-title">{c.title}</span>
              <button className="chat-delete-btn" onClick={(e) => handleDeleteChat(e, c.id)} title={t.deleteChat}><X size={13} /></button>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <p className="sidebar-empty-hint">{t2('ما فيه محادثات بعد — ابدأ وحدة جديدة', 'No chats yet — start a new one')}</p>
          )}
        </div>

        {/* مشاريعك ومساعدوك — أقسام مدمجة أسفل قائمة المحادثات */}
        <div className="sidebar-subsection">
          <div className="sidebar-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t2('مشاريعك', 'Your Projects')}</span>
            <button className="icon-btn" title={t2('مشروع جديد', 'New project')} onClick={onCreateProject} style={{ width: 22, height: 22 }}>
              <Plus size={14} />
            </button>
          </div>

          {projects.length === 0 && (
            <p className="sidebar-empty-hint sidebar-empty-hint-compact">{t2('لا يوجد مشاريع بعد', 'No projects yet')}</p>
          )}
          {projects.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {projects.map((p) => {
                const isExpanded = expandedProjectIds.has(p.id);
                const projectChats = chatsByProject[p.id] || [];
                return (
                  <div key={p.id}>
                    <div className="chat-item" onClick={() => toggleExpandProject(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isExpanded ? <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.7 }} /> : <ChevronRightIcon size={13} style={{ flexShrink: 0, opacity: 0.7 }} />}
                      <FolderKanban size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
                      <span className="chat-item-title" style={{ flex: 1 }}>{p.name}</span>
                      <button className="icon-btn" style={{ width: 20, height: 20, flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onNewChatInProject(p); }} title={t2('محادثة جديدة بهذا المشروع', 'New chat in this project')}>
                        <Plus size={12} />
                      </button>
                      <button className="icon-btn" style={{ width: 20, height: 20, flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); onDeleteProject(p); }} title={t2('حذف المشروع', 'Delete project')}>
                        <X size={12} />
                      </button>
                    </div>
                    {isExpanded && projectChats.length > 0 && (
                      <div style={{ paddingInlineStart: 22 }}>
                        {projectChats.map((c) => (
                          <div key={c.id} className={`chat-item ${c.id === activeChatId ? 'active' : ''}`} onClick={() => setActiveChatId(c.id)}>
                            <span className="chat-item-title">{c.title}</span>
                            <button className="chat-delete-btn" onClick={(e) => handleDeleteChat(e, c.id)} title={t.deleteChat}><X size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && projectChats.length === 0 && (
                      <p className="settings-hint" style={{ paddingInlineStart: 22, margin: '2px 0 6px', fontSize: 11.5 }}>{t2('لا يوجد محادثات بعد', 'No chats yet')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="sidebar-section-label" style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t2('مساعدوك', 'Your Assistants')}</span>
            <button className="icon-btn" title={t2('مساعد جديد', 'New assistant')} onClick={onCreateAssistant} style={{ width: 22, height: 22 }}>
              <Plus size={14} />
            </button>
          </div>

          {assistants.length > 0 ? (
            <div className="chat-list" style={{ marginBottom: 4 }}>
              {assistants.map((a) => (
                <div key={a.id} className={`chat-item ${a.id === activeAssistantId ? 'active' : ''}`} onClick={() => onSelectAssistant(a)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bot size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
                  <span className="chat-item-title" style={{ flex: 1 }}>{a.name}</span>
                  <button className="chat-delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteAssistant(a); }} title={t2('حذف المساعد', 'Delete assistant')}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="sidebar-empty-hint sidebar-empty-hint-compact">{t2('لا يوجد مساعدين بعد', 'No assistants yet')}</p>
          )}
        </div>
      </div>

      <div className="sidebar-user" onClick={onOpenSettings} title={t.brand}>
        {(() => {
          const myAvatar = user?.avatar || user?.avatarUrl || user?.photoUrl || user?.picture || user?.avatar_url || null;
          return myAvatar
            ? <img src={myAvatar} alt={user?.name || 'N'} className="user-avatar-img" />
            : <div className="user-avatar">{(user?.name || 'N')[0].toUpperCase()}</div>;
        })()}
        <div className="user-info">
          <div className="user-name">{user?.name || user?.email}</div>
          <div className="user-plan">{t.userPlan}</div>
        </div>
      </div>
    </aside>
    </>
  );
}