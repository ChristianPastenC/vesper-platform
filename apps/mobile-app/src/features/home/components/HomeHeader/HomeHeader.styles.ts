import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../../../core/theme/colors';

export const stylesFactory = (colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    height: 44,
    borderRadius: 100,
    marginHorizontal: 12,
    paddingHorizontal: 16,
  },
  searchPlaceholder: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
});
