// BlackieFi Design System - Shared Styles
// Gold: #D4AF37, Background: #050505

export const colors = {
  gold: '#D4AF37',
  goldLight: 'rgba(212, 175, 55, 0.1)',
  goldBorder: 'rgba(212, 175, 55, 0.2)',
  background: '#050505',
  surface: '#0a0a0a',
  surfaceHover: '#111111',
  border: 'rgba(255, 255, 255, 0.05)',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#666666',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#eab308',
  info: '#3b82f6',
};

export const tileStyles = {
  content: {
    background: colors.surface,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    padding: '1.5rem',
  },
  inner: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
  },
  stat: {
    background: colors.surface,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    padding: '1rem',
  },
  statGold: {
    background: colors.surface,
    borderRadius: '12px',
    border: `1px solid ${colors.goldBorder}`,
    padding: '1rem',
    position: 'relative' as const,
    overflow: 'hidden',
  },
};

export const buttonStyles = {
  primary: {
    background: `linear-gradient(135deg, ${colors.gold} 0%, #B8960C 100%)`,
    color: '#000',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  secondary: {
    background: 'transparent',
    color: colors.gold,
    border: `1px solid ${colors.gold}`,
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s',
  },
  ghost: {
    background: 'transparent',
    color: colors.textMuted,
    border: 'none',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s, color 0.2s',
  },
};

export const inputStyles = {
  text: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: colors.text,
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: colors.text,
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer',
  },
};

export const headerStyles = {
  page: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.text,
  },
  section: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
};
