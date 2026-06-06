export type TabParamList = {
  HomeTab: undefined;
  CatalogTab: undefined;
  OnlineCartTab: undefined;
  ScanAndGoTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ProductDetails: {
    product: {
      id: string;
      name: string;
      price: number;
      barcode: string;
    };
  };
  OnlineCheckoutModal: undefined;
  InStoreCheckoutModal: undefined;
  PaymentSuccessScreen: {
    orderId: string;
    type: 'online' | 'instore';
  };
};
