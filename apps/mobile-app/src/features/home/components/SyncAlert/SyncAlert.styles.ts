import { StyleSheet } from 'react-native';

export const stylesFactory = () => StyleSheet.create({
  alertContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  alertText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
});
