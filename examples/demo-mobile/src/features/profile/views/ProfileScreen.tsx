import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { Text } from '../../../components/Text';
import { ProfileHeader } from '../components/ProfileHeader/ProfileHeader';
import { AuthPromptCard } from '../components/AuthPromptCard/AuthPromptCard';
import { PreferencesList } from '../components/PreferencesList/PreferencesList';
import { AddressModal } from '../../../components/AddressModal/AddressModal';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './ProfileScreen.styles';

type ProfileNavigationProp = StackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavigationProp>();
  const deliveryAddress = useAppStore((state) => state.deliveryAddress);
  const [isAddressModalVisible, setAddressModalVisible] = useState(false);

  return (
    <ScrollView style={styles.container} testID="profile-scroll">
      <ProfileHeader />
      <AuthPromptCard />
      <PreferencesList />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('location.title', 'Delivery Address')}</Text>
        <View style={styles.optionsList}>
          <TouchableOpacity
            style={styles.rowLast}
            testID="profile-address-row"
            onPress={() => setAddressModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="location-outline" size={22} color={theme.colors.text} />
              <Text style={styles.rowText} numberOfLines={1}>
                {deliveryAddress || t('location.addressPlaceholder', 'Add Address')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text + '80'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.appInfo', 'App Info')}</Text>
        <View style={styles.optionsList}>
          <View style={__DEV__ ? styles.row : styles.rowLast} testID="profile-version-row">
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color={theme.colors.text} />
              <Text style={styles.rowText}>{t('profile.version', 'Version')}</Text>
            </View>
            <Text style={styles.rowValueText}>1.0.0</Text>
          </View>
          {__DEV__ && (
            <TouchableOpacity
              style={styles.rowLast}
              testID="profile-dev-menu-row"
              onPress={() => navigation.navigate('DevMenu')}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="construct-outline" size={22} color={theme.colors.text} />
                <Text style={styles.rowText}>Developer Menu</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text + '80'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AddressModal visible={isAddressModalVisible} onClose={() => setAddressModalVisible(false)} />
    </ScrollView>
  );
};
