export type TabParamList = {
  CatalogTab: undefined;
  OnlineCartTab: undefined;
  ScanAndGoTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  OnlineCheckoutModal: undefined;
  InStoreCheckoutModal: undefined;
  PaymentSuccessScreen: {
    orderId: string;
    type: 'online' | 'instore';
  };
};
