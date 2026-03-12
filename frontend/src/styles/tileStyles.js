// BlackieFi 3.0 - Shared Tile Styles
// Modern elevated 3D effect with glass-morphism and gold accents

export const tileStyles = {
  // Base tile with raised 3D effect
  base: {
    background: 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.03),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.2)
    `,
    position: 'relative',
    overflow: 'hidden',
  },

  // Stat card with gold accent
  statGold: {
    background: 'linear-gradient(145deg, #0F0E0A 0%, #0A0908 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(212, 175, 55, 0.12)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(212, 175, 55, 0.08),
      inset 0 1px 0 0 rgba(212, 175, 55, 0.08),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
    `,
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },

  // Stat card with red accent (for debts/negative values)
  statRed: {
    background: 'linear-gradient(145deg, #0F0A0A 0%, #0A0808 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(220, 38, 38, 0.12)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(220, 38, 38, 0.08),
      inset 0 1px 0 0 rgba(220, 38, 38, 0.08),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
    `,
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },

  // Stat card with green accent (for positive values)
  statGreen: {
    background: 'linear-gradient(145deg, #0A0F0A 0%, #080A08 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(5, 150, 105, 0.12)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(5, 150, 105, 0.08),
      inset 0 1px 0 0 rgba(5, 150, 105, 0.08),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
    `,
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },

  // Regular stat card
  stat: {
    background: 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.03),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.2)
    `,
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },

  // Content card for main sections
  content: {
    background: 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(212, 175, 55, 0.08)',
    boxShadow: `
      0 8px 32px -8px rgba(0, 0, 0, 0.5),
      0 16px 48px -16px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.02),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.15)
    `,
    position: 'relative',
    overflow: 'hidden',
    padding: '1.75rem',
  },

  // Inner card for nested items (transactions, goals, etc.)
  inner: {
    background: 'linear-gradient(145deg, #0C0C0C 0%, #070707 100%)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    boxShadow: `
      inset 0 2px 4px 0 rgba(0, 0, 0, 0.3),
      inset 0 -1px 0 0 rgba(255, 255, 255, 0.02)
    `,
    transition: 'all 0.2s ease',
  },

  // Card item (for grid items like accounts, investments)
  card: {
    background: 'linear-gradient(145deg, #0C0C0C 0%, #080808 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: `
      0 4px 16px -4px rgba(0, 0, 0, 0.5),
      0 8px 24px -8px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.02)
    `,
    padding: '1.5rem',
    transition: 'all 0.3s ease',
  },

  // Card item with gold hover effect
  cardGold: {
    background: 'linear-gradient(145deg, #0C0C0C 0%, #080808 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(212, 175, 55, 0.08)',
    boxShadow: `
      0 4px 16px -4px rgba(0, 0, 0, 0.5),
      0 8px 24px -8px rgba(212, 175, 55, 0.05),
      inset 0 1px 0 0 rgba(212, 175, 55, 0.05)
    `,
    padding: '1.5rem',
    transition: 'all 0.3s ease',
  },

  // Modal overlay
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },

  // Modal content
  modal: {
    background: 'linear-gradient(145deg, #0F0F0F 0%, #0A0A0A 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    boxShadow: `
      0 24px 48px -12px rgba(0, 0, 0, 0.75),
      0 12px 24px -12px rgba(212, 175, 55, 0.1),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
    `,
    padding: '2rem',
    width: '100%',
    maxWidth: '480px',
    position: 'relative',
  },
};

// Header text styles
export const headerStyles = {
  label: {
    fontSize: '0.7rem',
    fontWeight: '600',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: '#D4AF37',
    marginBottom: '0.75rem',
    textShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
  },
  title: {
    fontSize: '2.75rem',
    fontWeight: '700',
    color: '#F5F5F5',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    marginTop: '0.5rem',
    color: '#525252',
    fontSize: '0.95rem',
  },
};

// Input styles
export const inputStyles = {
  base: {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    background: '#0A0A0A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  focus: {
    border: '1px solid rgba(212, 175, 55, 0.3)',
    boxShadow: '0 0 0 3px rgba(212, 175, 55, 0.1)',
  },
};

// Button styles
export const buttonStyles = {
  primary: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
    color: '#000',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px -4px rgba(212, 175, 55, 0.4)',
  },
  secondary: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '600',
    background: 'transparent',
    color: '#F5F5F5',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  danger: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '600',
    background: 'rgba(220, 38, 38, 0.1)',
    color: '#DC2626',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

// Gold accent line (top of cards)
export const GoldAccentLine = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
  }} />
);

// Red accent line (for debts)
export const RedAccentLine = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #DC2626, transparent)',
  }} />
);

// Green accent line (for positive values)
export const GreenAccentLine = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #059669, transparent)',
  }} />
);

// Icon container with glow
export const iconContainerStyle = (color = '#D4AF37') => ({
  padding: '0.75rem',
  borderRadius: '12px',
  background: `rgba(${color === '#D4AF37' ? '212, 175, 55' : color === '#DC2626' ? '220, 38, 38' : '5, 150, 105'}, 0.1)`,
  boxShadow: `0 0 20px rgba(${color === '#D4AF37' ? '212, 175, 55' : color === '#DC2626' ? '220, 38, 38' : '5, 150, 105'}, 0.15)`,
});

// Format currency helper
export const formatCurrency = (value) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

// Format date helper
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default tileStyles;
