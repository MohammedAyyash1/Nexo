import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export function SettingsSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="settings-custom-select" ref={ref}>
      <button
        type="button"
        className="settings-custom-select-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} className={open ? 'flipped' : ''} />
      </button>
      {open && (
        <div className="settings-custom-select-menu">
          {options.map((o) => (
            <div
              key={o.value}
              className={`settings-custom-select-option ${o.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}