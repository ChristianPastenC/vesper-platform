import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'SovereignCore - Portal de Soporte',
};
const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui,sans-serif',
          background: '#0f0f0f',
          color: '#e5e5e5',
        }}
      >
        {children}
      </body>
    </html>
  );
};
export default RootLayout;
