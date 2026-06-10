import React, { useState, useEffect } from "react";
import { db, doc, onSnapshot } from "../lib/firebase";

interface GymStarsLogoProps {
  /** Size of the logo */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Layout orientation: "symbol" (only the gymnast), "horizontal" (icon + text to right), "vertical" (icon + text centered below) */
  variant?: "symbol" | "horizontal" | "vertical";
  /** Optional custom styling classes */
  className?: string;
  /** Whether to display monochromatic white or use Brazil theme green/yellow */
  primaryColor?: string;
  /** Section to load custom logo config for: "home" | "desktop-sidebar" | "mobile-header" | "auth" */
  section?: "home" | "desktop-sidebar" | "mobile-header" | "auth";
}

let homeConfigCache: any = null;
let brandingConfigCache: any = null;
let listenersCount = 0;
let unsubHome: any = null;
let unsubBranding: any = null;
const subscribers = new Set<() => void>();

const subscribeToConfig = (callback: () => void) => {
  subscribers.add(callback);
  if (listenersCount === 0) {
    unsubHome = onSnapshot(doc(db, "appContent", "homepage"), (snap) => {
      homeConfigCache = snap.exists() ? snap.data() : null;
      subscribers.forEach(cb => cb());
    });
    unsubBranding = onSnapshot(doc(db, "appContent", "branding"), (snap) => {
      brandingConfigCache = snap.exists() ? snap.data() : null;
      subscribers.forEach(cb => cb());
    });
  }
  listenersCount++;

  return () => {
    subscribers.delete(callback);
    listenersCount--;
    if (listenersCount === 0) {
      if (unsubHome) unsubHome();
      if (unsubBranding) unsubBranding();
      unsubHome = null;
      unsubBranding = null;
    }
  };
};

export default function GymStarsLogo({
  size = "md",
  variant = "horizontal",
  className = "",
  primaryColor = "text-white",
  section = "home"
}: GymStarsLogoProps) {
  const [customLogo, setCustomLogo] = useState<{ base64?: string; url?: string } | null>(() => {
    try {
      const b64 = localStorage.getItem(`gymstars_custom_logo_base64_${section}`);
      const url = localStorage.getItem(`gymstars_custom_logo_url_${section}`);
      if (b64 || url) {
        return { base64: b64 || undefined, url: url || undefined };
      }
    } catch (e) {}
    return null;
  });
  const [customHeight, setCustomHeight] = useState<number | null>(() => {
    try {
      const h = localStorage.getItem(`gymstars_custom_logo_height_${section}`);
      return h ? Number(h) : null;
    } catch (e) {}
    return null;
  });

  const [homeConfig, setHomeConfig] = useState<any>(homeConfigCache);
  const [brandingConfig, setBrandingConfig] = useState<any>(brandingConfigCache);

  useEffect(() => {
    // Call the set state immediately in case cache updated before mount
    setHomeConfig(homeConfigCache);
    setBrandingConfig(brandingConfigCache);

    const unsubscribe = subscribeToConfig(() => {
      setHomeConfig(homeConfigCache);
      setBrandingConfig(brandingConfigCache);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let base64 = "";
    let url = "";
    let heightVal = 0;

    const data = section === "home" ? homeConfig : brandingConfig;
    const fallbackData = section === "home" ? brandingConfig : homeConfig;

    if (section === "desktop-sidebar" && data) {
      base64 = data.sidebarLogoBase64 || "";
      url = data.sidebarLogoUrl || "";
      heightVal = Number(data.sidebarLogoHeight) || 20;
    } else if (section === "mobile-header" && data) {
      base64 = data.mobileLogoBase64 || "";
      url = data.mobileLogoUrl || "";
      heightVal = Number(data.mobileLogoHeight) || 20;
    } else if (section === "auth" && data) {
      base64 = data.authLogoBase64 || "";
      url = data.authLogoUrl || "";
      heightVal = Number(data.authLogoHeight) || 40;
    } else if (section === "home" && data) {
      base64 = data.logoBase64 || "";
      url = data.logoUrl || "";
      heightVal = Number(data.logoHeight) || 112; 
    }

    // Fallbacks if specific section logo is missing!
    if (!base64 && !url) {
      if (section !== "home" && fallbackData) {
        // Fallback to home logo if available
        base64 = fallbackData.logoBase64 || "";
        url = fallbackData.logoUrl || "";
      } else if (section === "home" && fallbackData) {
        // Fallback to auth or sidebar logo if available
        base64 = fallbackData.authLogoBase64 || fallbackData.sidebarLogoBase64 || "";
        url = fallbackData.authLogoUrl || fallbackData.sidebarLogoUrl || "";
      }
    }

    if (base64 || url) {
      setCustomLogo({ base64: base64 || undefined, url: url || undefined });
      if (heightVal && heightVal > 0) {
        setCustomHeight(heightVal);
      }
      
      try {
        const cacheKeyB64 = `gymstars_custom_logo_base64_${section}`;
        const cacheKeyUrl = `gymstars_custom_logo_url_${section}`;
        const cacheKeyHeight = `gymstars_custom_logo_height_${section}`;
        if (base64) localStorage.setItem(cacheKeyB64, base64);
        else localStorage.removeItem(cacheKeyB64);
        
        if (url) localStorage.setItem(cacheKeyUrl, url);
        else localStorage.removeItem(cacheKeyUrl);

        if (heightVal) localStorage.setItem(cacheKeyHeight, String(heightVal));
        else localStorage.removeItem(cacheKeyHeight);
      } catch (e) {}
    } else {
       // If no data and no fallback could resolve, allow it to fall back to the SVG
       // BUT, check if we had something in localStorage during boot. Do not clear it unless it's strictly empty on both.
       if (homeConfig !== null || brandingConfig !== null) {
          setCustomLogo(null);
          setCustomHeight(null);
       }
    }
  }, [section, homeConfig, brandingConfig]);

  // Size mappings
  const sizeClasses = {
    xs: { logo: "w-6 h-6", text: "text-xs", subtitle: "text-[8px]", img: "h-6 w-auto" },
    sm: { logo: "w-8 h-8", text: "text-base", subtitle: "text-[10px]", img: "h-8 w-auto" },
    md: { logo: "w-12 h-12", text: "text-xl", subtitle: "text-[12px]", img: "h-14 w-auto" },
    lg: { logo: "w-16 h-16", text: "text-3xl", subtitle: "text-[14px]", img: "h-20 w-auto" },
    xl: { logo: "w-28 h-28", text: "text-4xl md:text-5xl", subtitle: "text-[18px]", img: "h-48 md:h-56 w-auto" }
  };

  const selectedSize = sizeClasses[size];

  // Render the custom logo if configured by Admin
  if (customLogo && (customLogo.base64 || customLogo.url)) {
    const imgSrc = customLogo.base64 || customLogo.url;
    const styleOverride = customHeight 
      ? { height: `${customHeight}px`, maxHeight: "none", WebkitTouchCallout: "none" as const, WebkitUserSelect: "none" as const }
      : { WebkitTouchCallout: "none" as const, WebkitUserSelect: "none" as const };
    return (
      <div 
        className={`inline-flex items-center justify-center ${className} select-none`} 
        id={`gymstars-logo-custom-${size}`}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      >
        <img
          src={imgSrc}
          alt="GYMSTARS BRASIL"
          className={`${customHeight ? "" : selectedSize.img} object-contain select-none pointer-events-none`}
           referrerPolicy="no-referrer"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          style={styleOverride}
        />
      </div>
    );
  }

  // Stylized Gymnast SVG fallback based on your beautiful vector
  const GymnastIcon = () => (
    <svg
      viewBox="0 0 100 100"
      className={`${selectedSize.logo} text-white shrink-0 overflow-visible`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Floating high-energy head */}
      <ellipse
        cx="48"
        cy="24"
        rx="6"
        ry="5"
        fill="currentColor"
        transform="rotate(-15 48 24)"
      />
      
      {/* Stylized upper crescent / gymnast arm wing swoosh (upper-left arc pointing up-right) */}
      <path
        d="M 33 34 C 34 32, 40 30, 44 29 C 48 28, 54 29, 58 30 C 50 32, 43 36, 40 40 C 37 44, 38 48, 41 51 C 36 44, 32 39, 33 34 Z"
        fill="currentColor"
      />

      {/* Main sweeping dynamic spine & leg swoosh (crescent that curves right, sweeps down, curls left/right below) */}
      <path
        d="M 58 29 C 55 33, 44 42, 41 51 C 38 60, 39 71, 47 79 C 52 84, 59 84, 57 77 C 54 70, 40 68, 41 51 Q 42 40, 58 29 Z"
        fill="currentColor"
      />
      
      {/* Elegant swooping trail / double lines highlight */}
      <path
        d="M 40 48 Q 42 66, 56 68 Q 46 62, 42 48 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );

  if (variant === "symbol") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} id="gymstars-logo-symbol">
        <GymnastIcon />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`} id="gymstars-logo-vertical">
        <GymnastIcon />
        <div className="mt-2 select-none">
          <div className={`${selectedSize.text} font-black tracking-widest leading-none text-white font-sans`}>
            GYMSTARS
          </div>
          <div className={`${selectedSize.subtitle} font-extrabold tracking-[0.3em] font-sans text-[#009c3b] uppercase leading-none mt-1`}>
            BRASIL
          </div>
        </div>
      </div>
    );
  }

  // default horizontal layout
  return (
    <div className={`flex items-center space-x-3 ${className}`} id="gymstars-logo-horizontal">
      <GymnastIcon />
      <div className="select-none leading-none">
        <div className={`${selectedSize.text} font-black tracking-wider text-white font-sans`}>
          GYMSTARS
        </div>
        <div className={`${selectedSize.subtitle} font-bold tracking-[0.25em] text-[#009c3b] uppercase mt-0.5`}>
          BRASIL
        </div>
      </div>
    </div>
  );
}
