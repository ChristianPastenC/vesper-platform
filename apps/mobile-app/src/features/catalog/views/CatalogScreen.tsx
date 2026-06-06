import React from 'react';
import { FlatList, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useCatalog } from '../hooks/useCatalog';
import { ProductCard, Product } from '../components/ProductCard';
import { RootStackParamList } from '../../../navigation/types';
import { stylesFactory } from './CatalogScreen.styles';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export const CatalogScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp>();
  const {
    products,
    handleAddToOnline,
    handleAddToInStore,
    isAuthenticated,
    logout,
  } = useCatalog();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (isAuthenticated) {
              logout();
            } else {
              navigation.navigate('Login');
            }
          }}
          style={{ marginRight: 16 }}
          testID="auth-header-button"
        >
          <Ionicons
            name={isAuthenticated ? 'log-out-outline' : 'log-in-outline'}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isAuthenticated, logout, theme.colors.primary]);

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onAddToOnline={handleAddToOnline}
      onAddToInStore={handleAddToInStore}
      onPress={() => navigation.navigate('ProductDetails', { product: item })}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};
