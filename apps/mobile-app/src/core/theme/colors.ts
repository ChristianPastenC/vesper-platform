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
  primary: '#6200EE',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#121212',
  error: '#B00020',
  success: '#4CAF50',
  border: '#E0E0E0',
};

export const DARK_COLORS: ThemeColors = {
  primary: '#BB86FC',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  error: '#CF6679',
  success: '#81C784',
  border: '#333333',
};
