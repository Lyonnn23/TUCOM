import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.tucom',
  appName: 'TUcom',
  webDir: 'dist',
  // El bloque "server" se usa SOLO en desarrollo con hot-reload desde Lovable.
  // Para compilar la APK/AAB de producción debe estar comentado/eliminado.
  // server: {
  //   url: 'https://72bff210-d571-4f6a-8fac-a80aad590768.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
