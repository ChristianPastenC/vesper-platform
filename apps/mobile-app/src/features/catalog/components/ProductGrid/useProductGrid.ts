import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TabParamList } from '../../../../navigation/types';
import { useAppStore } from '../../../../store/useAppStore';
import { Product } from '../../components/ProductCard';

type NavigationProp = StackNavigationProp<RootStackParamList & TabParamList>;

export const useProductGrid = () => {
  const navigation = useNavigation<NavigationProp>();
  const addToOnlineCart = useAppStore((state) => state.addToOnlineCart);
  const addToInStoreCart = useAppStore((state) => state.addToInStoreCart);

  const handleAddToOnline = (product: Product) => {
    addToOnlineCart({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

  const handleAddToInStore = (product: Product) => {
    addToInStoreCart({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
    });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { product });
  };

  return {
    handleAddToOnline,
    handleAddToInStore,
    handleProductPress,
  };
};
