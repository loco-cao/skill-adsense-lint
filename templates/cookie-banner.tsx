// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie-consent');
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // localStorage may be blocked in some environments
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem('cookie-consent', 'accepted');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const decline = () => {
    try {
      localStorage.setItem('cookie-consent', 'declined');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        padding: '16px 24px',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5, maxWidth: '700px' }}>
        We use cookies to improve your experience, analyze site traffic, and serve personalized ads.
        By continuing, you agree to our use of cookies. You can manage your preferences at any time.
      </span>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
