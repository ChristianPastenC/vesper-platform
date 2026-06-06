import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

export interface ScannableProduct {
  id: string;
  barcode: string;
  name: string;
  price: number;
}

const SCANNABLE_PRODUCTS: ScannableProduct[] = [
  {
    id: 'scan-1',
    barcode: '75010001',
    name: 'Organic Bananas 1kg',
    price: 2.49,
  },
  { id: 'scan-2', barcode: '75010002', name: 'Fresh Milk 1L', price: 1.89 },
  { id: 'scan-3', barcode: '75010003', name: 'Whole Wheat Bread', price: 3.29 },
  { id: 'scan-4', barcode: '75010004', name: 'Avocados Bag', price: 4.99 },
  {
    id: 'scan-5',
    barcode: '75010005',
    name: 'Greek Yogurt 500g',
    price: 2.99,
  },
];

export const useScanner = () => {
  const { t } = useTranslation();
  const addToInStoreCart = useAppStore((state) => state.addToInStoreCart);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const simulateScan = () => {
    const randomIndex = Math.floor(Math.random() * SCANNABLE_PRODUCTS.length);
    const product = SCANNABLE_PRODUCTS[randomIndex];

    addToInStoreCart({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
    });

    setLastScanned(`${product.name} (${product.barcode})`);

    setTimeout(() => {
      setLastScanned(null);
    }, 2000);
  };

  return {
    lastScanned,
    simulateScan,
    t,
  };
};
