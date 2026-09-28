import { Logo } from './Logo.jsx';

export function WelcomeHero({ lang, subtitle }) {
  return (
    <div className="welcome-hero">
      <div className="welcome-hero-core" aria-hidden="true">
        <span className="welcome-hero-aura" />
        <span className="welcome-hero-ring welcome-hero-ring-outer" />
        <span className="welcome-hero-ring welcome-hero-ring-inner" />
        <div className="welcome-hero-mark">
          <Logo size={30} />
        </div>
      </div>

      <h1 className="welcome-hero-title">
        {lang === 'en'
          ? <>Welcome to <span className="gradient-text">Nexo</span></>
          : <>مرحباً بك في <span className="gradient-text">Nexo</span></>}
      </h1>
      <p className="welcome-hero-subtitle">{subtitle}</p>
    </div>
  );
}