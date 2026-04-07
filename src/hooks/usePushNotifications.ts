import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BC3JzPS0nDLKPAh3K-zSf-3YwXWkWJy5AKgbX2Pulq_zOWVt9U23XZfpeYCPmgUrZ_eD1g4m10RlOJM8X_rAS-0";

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

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Necesitas permitir las notificaciones para recibir alertas de precios");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisuallyOwnsRegistration: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      } as PushSubscriptionOptionsInit);

      const subJson = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
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
  }, [isSupported]);

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
    subscribe,
    unsubscribe,
  };
}
