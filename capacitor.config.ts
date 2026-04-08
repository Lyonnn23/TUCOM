import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.tucom',
  appName: 'TUcom',
  webDir: 'dist',
  server: {
    url: 'https://72bff210-d571-4f6a-8fac-a80aad590768.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
