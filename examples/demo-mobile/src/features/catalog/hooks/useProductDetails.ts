import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useAppStore } from '../../../store/useAppStore';

type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetails'>;

export interface SpecificationItem {
  labelKey: string;
  value: string;
  isTranslationValue?: boolean;
}

export const useProductDetails = () => {
  const route = useRoute<ProductDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { product } = route.params;

  const addToOnlineCart = useAppStore((state) => state.addToOnlineCart);
  const addToInStoreCart = useAppStore((state) => state.addToInStoreCart);

  const handleAddToOnline = () => {
    addToOnlineCart({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

  const handleAddToInStore = () => {
    addToInStoreCart({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const specifications: SpecificationItem[] = [
    { labelKey: 'catalog.brand', value: 'Sovereign Core' },
    { labelKey: 'catalog.weight', value: '320g' },
    { labelKey: 'catalog.dimensions', value: '18 x 12 x 4 cm' },
    { labelKey: 'catalog.availability', value: 'catalog.inStock', isTranslationValue: true },
  ];

  return {
    product,
    handleAddToOnline,
    handleAddToInStore,
    handleGoBack,
    specifications,
  };
};
