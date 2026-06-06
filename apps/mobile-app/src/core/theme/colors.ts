export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  error: string;
  success: string;
  border: string;
}

export const LIGHT_COLORS: ThemeColors = {
  primary: '#0F172A',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  error: '#EF4444',
  success: '#10B981',
  border: '#E2E8F0',
};

export const DARK_COLORS: ThemeColors = {
  primary: '#F8FAFC',
  background: '#09090B',
  surface: '#18181B',
  text: '#F4F4F5',
  error: '#F87171',
  success: '#34D399',
  border: '#27272A',
};
