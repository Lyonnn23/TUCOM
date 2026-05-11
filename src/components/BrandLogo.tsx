import copecLogo from "@/assets/brands/copec.png";
import shellLogo from "@/assets/brands/shell.png";
import aramcoLogo from "@/assets/brands/aramco.png";
import copecVoltexLogo from "@/assets/brands/copec-voltex.png";
import { Fuel } from "lucide-react";

const LOGOS: Record<string, string> = {
  Copec: copecLogo,
  Shell: shellLogo,
  Aramco: aramcoLogo,
  "Copec Voltex": copecVoltexLogo,
};

interface BrandLogoProps {
  brand: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}

const BrandLogo = ({ brand, size = 28, className = "", rounded = true }: BrandLogoProps) => {
  const src = LOGOS[brand];
  if (!src) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-muted text-muted-foreground ${rounded ? "rounded-full" : "rounded"} ${className}`}
        style={{ width: size, height: size }}
        aria-label={brand}
      >
        <Fuel className="w-1/2 h-1/2" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${brand} logo`}
      width={size}
      height={size}
      className={`object-contain bg-white ${rounded ? "rounded-full" : "rounded"} shrink-0 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
};

export default BrandLogo;
