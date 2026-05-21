import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tucom.app',
  appName: 'TUcom',
  webDir: 'dist',
  // El bloque "server" se usa SOLO en desarrollo con hot-reload.
  // Para compilar la APK/AAB de producción debe estar comentado/eliminado.
  // server: {
  //   url: 'https://tucombustible.lovable.app?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
