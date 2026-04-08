import { Bell, BellOff, Loader2, MapPin } from "lucide-react";
import { usePushNotifications, FUEL_OPTIONS } from "@/hooks/usePushNotifications";
import { useState } from "react";

const PushNotificationToggle = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    selectedFuels,
    setSelectedFuels,
    subscribe,
    unsubscribe,
    requestNearbyCheapestAlert,
  } = usePushNotifications();
  const [showPrefs, setShowPrefs] = useState(false);

  if (!isSupported) return null;

  const toggleFuel = (key: string) => {
    const next = selectedFuels.includes(key)
      ? selectedFuels.filter((f) => f !== key)
      : [...selectedFuels, key];
    setSelectedFuels(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            isSubscribed
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isSubscribed ? (
            <Bell className="w-3.5 h-3.5" />
          ) : (
            <BellOff className="w-3.5 h-3.5" />
          )}
          {isSubscribed ? "Alertas ON" : "Activar alertas"}
        </button>

        {(isSubscribed || !isSubscribed) && (
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            {showPrefs ? "Ocultar" : "Personalizar"}
          </button>
        )}
      </div>

      {showPrefs && (
        <div className="flex flex-wrap gap-1.5">
          {FUEL_OPTIONS.map((fuel) => {
            const active = selectedFuels.includes(fuel.key);
            return (
              <button
                key={fuel.key}
                onClick={() => toggleFuel(fuel.key)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {fuel.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PushNotificationToggle;
