import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface DishImageProps {
  type?: string;
  imageUrl?: string;
  alt?: string;
  className?: string;
}

// Professional restaurant food photography map (curated high-res culinary images)
export const FOOD_PHOTOS: Record<string, string> = {
  somsa: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80',
  cherry_juice: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80',
  orange_fresh: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80',
  coffee_cup: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80',
  takeaway_bag: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=500&q=80',
  osh: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=500&q=80',
  cola_can: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80',
  qozon_kabob: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
  shashlik: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=80',
  achichuk: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80',
  lagmon: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=500&q=80',
  tea_pot: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
  manti: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=500&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=500&q=80',
};

export const DishImage: React.FC<DishImageProps> = ({
  type = 'somsa',
  imageUrl,
  alt = 'Taom surati',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const photoSrc = imageUrl || (type ? FOOD_PHOTOS[type] : undefined);

  // If real food photo is available and hasn't failed to load
  if (photoSrc && !imgError) {
    return (
      <div className={`relative w-full h-full overflow-hidden rounded-xl bg-slate-100 ${className}`}>
        <img
          src={photoSrc}
          alt={alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Soft atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Serverdagi taomda rasm yo'q (yoki yuklanmadi) — neytral belgi, stok foto EMAS
  if (!type || !FOOD_PHOTOS[type]) {
    return (
      <div
        className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-teal-50/70 to-emerald-50 border border-teal-100/70 ${className}`}
        role="img"
        aria-label={alt}
      >
        <UtensilsCrossed className="w-1/4 h-1/4 max-w-10 max-h-10 min-w-4 min-h-4 text-teal-600/40" strokeWidth={1.5} />
      </div>
    );
  }

  // Resilient Offline SVG Fallback
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#00b49f] via-[#009688] to-[#00796b] shadow-inner ${className}`}
    >
      <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" />

      {type === 'somsa' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="65" rx="38" ry="16" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="50" cy="63" rx="34" ry="13" fill="#ffffff" />
          <path d="M30 60 L45 42 L48 62 Z" fill="#d97706" stroke="#b45309" strokeWidth="1" />
          <path d="M40 62 L60 38 L65 62 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
          <path d="M52 64 L70 45 L74 63 Z" fill="#d97706" stroke="#b45309" strokeWidth="1" />
          <circle cx="52" cy="48" r="1" fill="#451a03" />
          <circle cx="58" cy="50" r="1" fill="#451a03" />
          <circle cx="43" cy="52" r="1" fill="#451a03" />
        </svg>
      )}

      {type === 'cherry_juice' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="78" rx="20" ry="6" fill="#000000" opacity="0.2" />
          <rect x="42" y="32" width="16" height="42" rx="4" fill="#991b1b" stroke="#7f1d1d" strokeWidth="1" />
          <rect x="46" y="20" width="8" height="13" rx="2" fill="#991b1b" />
          <rect x="44" y="16" width="12" height="5" rx="1.5" fill="#f8fafc" />
          <rect x="42" y="44" width="16" height="16" rx="1" fill="#ffffff" opacity="0.9" />
          <line x1="45" y1="52" x2="55" y2="52" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'sandwich' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="72" rx="36" ry="14" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="50" cy="70" rx="32" ry="11" fill="#ffffff" />
          <path d="M26 65 L52 32 L74 65 Z" fill="#d97706" />
          <path d="M28 64 L52 34 L72 64 Z" fill="#fde68a" />
          <path d="M28 62 Q36 60 44 62 Q52 64 60 61 Q68 63 72 61" stroke="#22c55e" strokeWidth="3" fill="none" />
          <path d="M30 64 Q42 62 55 64 Q64 62 70 63" stroke="#ef4444" strokeWidth="2.5" fill="none" />
          <path d="M32 66 Q45 64 58 66 Q66 64 69 65" stroke="#f59e0b" strokeWidth="2" fill="none" />
        </svg>
      )}

      {type === 'orange_fresh' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="80" rx="18" ry="5" fill="#000000" opacity="0.2" />
          <path d="M37 32 L41 75 Q42 78 50 78 Q58 78 59 75 L63 32 Z" fill="#fb923c" opacity="0.95" />
          <path d="M36 30 L40 76 Q42 80 50 80 Q58 80 60 76 L64 30 Z" fill="none" stroke="#f8fafc" strokeWidth="2" />
          <path d="M54 18 L50 40 L48 70" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="37" cy="30" r="10" fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="37" cy="30" r="7" fill="#fbbf24" />
        </svg>
      )}

      {type === 'coffee_cup' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="80" rx="18" ry="5" fill="#000000" opacity="0.2" />
          <path d="M36 32 L40 75 Q41 78 50 78 Q59 78 60 75 L64 32 Z" fill="#ffffff" />
          <path d="M38 46 L40 64 L60 64 L62 46 Z" fill="#d97706" />
          <rect x="34" y="26" width="32" height="6" rx="2" fill="#1e293b" />
          <rect x="42" y="23" width="16" height="3" rx="1" fill="#1e293b" />
        </svg>
      )}

      {type === 'takeaway_bag' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="78" rx="22" ry="6" fill="#000000" opacity="0.2" />
          <path d="M35 38 L38 76 L62 76 L65 38 L58 35 L50 38 L42 35 Z" fill="#b45309" stroke="#92400e" strokeWidth="1" />
          <path d="M36 40 L38 74 L62 74 L64 40 Z" fill="#d97706" />
          <polygon points="40,42 50,47 60,42 50,38" fill="#b45309" opacity="0.6" />
          <circle cx="50" cy="58" r="7" fill="#fef3c7" opacity="0.9" />
          <text x="50" y="61" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#92400e">
            POS
          </text>
        </svg>
      )}

      {type === 'osh' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="68" rx="38" ry="16" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          <ellipse cx="50" cy="66" rx="34" ry="13" fill="#ffffff" />
          <ellipse cx="50" cy="58" rx="26" ry="10" fill="#f59e0b" />
          <ellipse cx="50" cy="55" rx="22" ry="8" fill="#fbbf24" />
          <circle cx="48" cy="52" r="5" fill="#78350f" />
          <circle cx="55" cy="53" r="4.5" fill="#92400e" />
          <ellipse cx="40" cy="56" rx="3" ry="1.5" fill="#dc2626" />
          <circle cx="52" cy="46" r="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
        </svg>
      )}

      {type === 'cola_can' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="44" cy="78" rx="14" ry="5" fill="#000000" opacity="0.2" />
          <rect x="36" y="34" width="18" height="42" rx="4" fill="#dc2626" />
          <ellipse cx="45" cy="34" rx="9" ry="3" fill="#e2e8f0" />
          <path d="M37 48 Q45 54 53 48" stroke="#ffffff" strokeWidth="2.5" fill="none" />
          <rect x="52" y="38" width="16" height="38" rx="3" fill="#eab308" />
          <ellipse cx="60" cy="38" rx="8" ry="2.5" fill="#cbd5e1" />
        </svg>
      )}

      {type === 'qozon_kabob' && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="68" rx="38" ry="16" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="50" cy="66" rx="34" ry="13" fill="#ffffff" />
          <circle cx="40" cy="56" r="8" fill="#78350f" />
          <circle cx="56" cy="54" r="9" fill="#92400e" />
          <circle cx="48" cy="62" r="7.5" fill="#854d0e" />
          <ellipse cx="34" cy="62" rx="6" ry="4" fill="#f59e0b" />
          <ellipse cx="62" cy="62" rx="6" ry="4" fill="#d97706" />
          <path d="M46 52 Q50 48 54 52" stroke="#22c55e" strokeWidth="2" fill="none" />
        </svg>
      )}

      {/* Fallback default */}
      {!['somsa', 'cherry_juice', 'sandwich', 'orange_fresh', 'coffee_cup', 'takeaway_bag', 'osh', 'cola_can', 'qozon_kabob'].includes(type) && (
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-md">
          <ellipse cx="50" cy="68" rx="36" ry="14" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="50" cy="66" rx="32" ry="11" fill="#ffffff" />
          <circle cx="50" cy="56" r="14" fill="#0d9488" />
          <circle cx="50" cy="56" r="10" fill="#f59e0b" />
          <circle cx="50" cy="56" r="6" fill="#78350f" />
        </svg>
      )}
    </div>
  );
};
