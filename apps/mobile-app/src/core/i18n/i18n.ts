import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      catalog: {
        title: 'Product Catalog',
        addToOnline: 'Ship to Home',
        addToInStore: 'Scan & Go (Store)',
        itemAdded: 'Added to cart',
      },
      online_checkout: {
        title: 'Online Checkout',
        cartTitle: 'Online Cart',
        deliveryAddress: 'Delivery Address',
        simulatedAddress: '123 Sovereign Way, Crypto City',
        checkoutButton: 'Place Home Order',
        processing: 'Processing online order...',
        success: 'Home order placed successfully!',
        empty: 'Your online cart is empty.',
        total: 'Total Amount',
      },
      scan_and_go: {
        title: 'Scan & Go',
        scannerTitle: 'In-Store Scanner',
        scanHint: 'Position barcode inside the box to scan',
        simulateScan: 'Simulate Scanning Item',
        networkStatus: 'Network Signal Status',
        onlineLabel: 'Connected (Online)',
        offlineLabel: 'Offline (No Signal)',
        checkoutTitle: 'In-Store Checkout',
        payButton: 'Pay & Generate Receipt',
        processing: 'Authorizing terminal payment...',
        error503: 'Network Error (503): No cell signal. Check connection.',
        success: 'Receipt Ready! Show QR to exit agent.',
        empty: 'No items scanned. Use simulator above!',
        total: 'Cart Total',
      },
      shared_ui: {
        language: 'Language',
        theme: 'Theme Mode',
        themeLight: 'Light',
        themeDark: 'Dark',
        themeSystem: 'System',
        loading: 'Loading...',
        close: 'Close',
        networkIndicator: 'Simulated Network Status',
      },
    },
  },
  es: {
    translation: {
      catalog: {
        title: 'Catálogo de Productos',
        addToOnline: 'Envío a Domicilio',
        addToInStore: 'Scan & Go (Tienda)',
        itemAdded: 'Agregado al carrito',
      },
      online_checkout: {
        title: 'Pago en Línea',
        cartTitle: 'Cesta Online',
        deliveryAddress: 'Dirección de Entrega',
        simulatedAddress: 'Avenida Soberana 123, Ciudad Cripto',
        checkoutButton: 'Confirmar Pedido',
        processing: 'Procesando pedido online...',
        success: '¡Pedido a domicilio confirmado!',
        empty: 'Tu cesta online está vacía.',
        total: 'Monto Total',
      },
      scan_and_go: {
        title: 'Scan & Go',
        scannerTitle: 'Escáner en Sucursal',
        scanHint: 'Coloque el código de barras dentro del recuadro',
        simulateScan: 'Simular Escaneo de Artículo',
        networkStatus: 'Estado de Señal de Red',
        onlineLabel: 'Conectado (Online)',
        offlineLabel: 'Sin Señal (Offline)',
        checkoutTitle: 'Pago en Sucursal',
        payButton: 'Pagar y Salir',
        processing: 'Autorizando terminal de pago...',
        error503: 'Error de Red (503): Sin señal. Verifique la conexión.',
        success: '¡Pago Exitoso! Muestre el código QR al salir.',
        empty: 'Aún no hay artículos escaneados. ¡Use el simulador!',
        total: 'Total Escaneado',
      },
      shared_ui: {
        language: 'Idioma',
        theme: 'Modo de Tema',
        themeLight: 'Claro',
        themeDark: 'Oscuro',
        themeSystem: 'Sistema',
        loading: 'Cargando...',
        close: 'Cerrar',
        networkIndicator: 'Estado de Red Simulado',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
