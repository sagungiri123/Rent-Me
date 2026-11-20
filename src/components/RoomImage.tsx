import { useState } from "react";
import { Home } from "lucide-react";

interface RoomImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

function isSafeImageSrc(src?: string): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("..")) return true;
  if (trimmed.startsWith("blob:")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function RoomImage({ src, alt, className = "", aspectClass = "aspect-[4/3]" }: RoomImageProps) {
  const [failed, setFailed] = useState(false);

  if (!isSafeImageSrc(src) || failed) {
    return (
      <div
        className={`${aspectClass} ${className} flex flex-col items-center justify-center bg-[#EFECE6] text-[#6B6E72] px-4 text-center`}
      >
        <Home className="w-7 h-7 mb-2 stroke-[1.5] text-[#264D3B]" aria-hidden="true" />
        <span className="text-xs font-medium text-[#4A4E52] line-clamp-2 max-w-[200px]">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} ${className} overflow-hidden bg-[#EFECE6]`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}
