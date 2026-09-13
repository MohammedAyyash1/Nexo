export function Logo({ size = 32 }) {
  return (
    <div className="nexo-logo" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="60%" height="60%">
        <path d="M13 2L4 14H11L10 22L20 9H13L13 2Z" fill="white" />
      </svg>
    </div>
  );
}