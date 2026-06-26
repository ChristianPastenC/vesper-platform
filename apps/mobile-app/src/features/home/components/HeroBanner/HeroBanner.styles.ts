import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) => StyleSheet.create({
  heroContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  heroCardAuth: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  heroCardUnauth: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitleAuth: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroTitleUnauth: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroSubtitleAuth: {
    color: '#9CA3AF',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 24,
  },
  heroSubtitleUnauth: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  heroButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  heroButtonUnauth: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  heroButtonTextUnauth: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
