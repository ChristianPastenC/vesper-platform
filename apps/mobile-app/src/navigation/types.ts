export type TabParamList = {
  HomeTab: undefined;
  CatalogTab: undefined;
  ScanAndGoTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ProductList: { category?: string } | undefined;
  ProductDetails: {
    product: {
      id: string;
      name: string;
      price: number;
      barcode: string;
    };
  };
  OnlineCart: undefined;
  OnlineCheckoutModal: undefined;
  InStoreCheckoutModal: undefined;
  PaymentSuccessScreen: {
    orderId: string;
    type: 'online' | 'instore';
  };
  Stores: undefined;
};
