import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BC3JzPS0nDLKPAh3K-zSf-3YwXWkWJy5AKgbX2Pulq_zOWVt9U23XZfpeYCPmgUrZ_eD1g4m10RlOJM8X_rAS-0";

export const FUEL_OPTIONS = [
  { key: "gasoline93", label: "Bencina 93" },
  { key: "gasoline95", label: "Bencina 95" },
  { key: "gasoline97", label: "Bencina 97" },
  { key: "diesel", label: "Diésel" },
] as const;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFuels, setSelectedFuels] = useState<string[]>(
    FUEL_OPTIONS.map((f) => f.key)
  );

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
        const subJson = subscription.toJSON();
        const { data } = await supabase
          .from("push_subscriptions")
          .select("fuel_types")
          .eq("endpoint", subJson.endpoint!)
          .single();
        if (data?.fuel_types) {
          setSelectedFuels(data.fuel_types);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    if (selectedFuels.length === 0) {
      toast.error("Selecciona al menos un tipo de combustible");
      return;
    }
    setIsLoading(true);

    try {
      // Anonymous subscriptions allowed; capture user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Necesitas permitir las notificaciones para recibir alertas de precios");
        return;
      }

      // Get user location for nearby alerts
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        console.warn("Location not available, nearby alerts won't work");
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisuallyOwnsRegistration: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      } as PushSubscriptionOptionsInit);

      const subJson = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user?.id ?? null,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
          fuel_types: selectedFuels,
          ...(lat !== null && lng !== null ? { lat, lng } : {}),
        },
        { onConflict: "endpoint" }
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("🔔 ¡Notificaciones activadas! Te avisaremos cuando bajen los precios");
    } catch (err) {
      console.error("Push subscription error:", err);
      toast.error("No se pudieron activar las notificaciones");
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, selectedFuels]);

  const requestNearbyCheapestAlert = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        toast.error("Primero activa las notificaciones");
        return;
      }

      const subJson = subscription.toJSON();

      // Update location before requesting
      try {
        const pos = await getCurrentPosition();
        await supabase
          .from("push_subscriptions")
          .update({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          .eq("endpoint", subJson.endpoint!);
      } catch {
        // Use existing saved location
      }

      const { error } = await supabase.functions.invoke("nearby-cheapest-alert", {
        body: { endpoint: subJson.endpoint },
      });

      if (error) throw error;
      toast.success("📍 Alerta enviada con los precios más bajos cerca de ti");
    } catch (err) {
      console.error("Nearby alert error:", err);
      toast.error("No se pudo enviar la alerta de precios cercanos");
    }
  }, []);

  const updateFuelPreferences = useCallback(async (fuels: string[]) => {
    setSelectedFuels(fuels);
    if (!isSubscribed) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const subJson = subscription.toJSON();
        await supabase
          .from("push_subscriptions")
          .update({ fuel_types: fuels })
          .eq("endpoint", subJson.endpoint!);
      }
    } catch (err) {
      console.error("Failed to update fuel preferences:", err);
    }
  }, [isSubscribed]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("Notificaciones desactivadas");
    } catch (err) {
      console.error("Unsubscribe error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    selectedFuels,
    setSelectedFuels: updateFuelPreferences,
    subscribe,
    unsubscribe,
    requestNearbyCheapestAlert,
  };
}
