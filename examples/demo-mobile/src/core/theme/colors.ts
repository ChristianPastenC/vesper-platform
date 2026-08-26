export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  border: string;
}

export const LIGHT_COLORS: ThemeColors = {
  primary: '#2A66F6',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#7E8494',
  error: '#EF4444',
  success: '#10B981',
  border: '#E2E8F0',
};

export const DARK_COLORS: ThemeColors = {
  primary: '#2A66F6',
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  error: '#F87171',
  success: '#34D399',
  border: '#374151',
};
