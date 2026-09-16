export function Logo({ size = 32 }) {
  return (
    <div className="nexo-logo-v2" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="58%" height="58%">
        <defs>
          <linearGradient id="nexoBoltGradient" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1e9ff" />
          </linearGradient>
        </defs>
        <path
          d="M12.7 2.2c.5-.15.96.32.78.82L11 10h6.2c.68 0 1.06.8.64 1.34l-8.6 11.05c-.53.68-1.6.18-1.42-.67L9.6 14H4.2c-.66 0-1.05-.75-.68-1.3L12.7 2.2Z"
          fill="url(#nexoBoltGradient)"
        />
      </svg>
    </div>
  );
}