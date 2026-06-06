export type TabParamList = {
  CatalogTab: undefined;
  OnlineCartTab: undefined;
  ScanAndGoTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  OnlineCheckoutModal: undefined;
  InStoreCheckoutModal: undefined;
  PaymentSuccessScreen: {
    orderId: string;
    type: 'online' | 'instore';
  };
};
