import React, { useState } from 'react';
import officialLogo from '../assets/images/cave_exact_gold_icon_1790915039041.jpg';

interface AppLogoProps {
  className?: string;
  imgClassName?: string;
  alt?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = "w-10 h-10 rounded-xl overflow-hidden shadow-inner border border-amber-500/40 shrink-0 bg-black flex items-center justify-center",
  imgClassName = "w-full h-full object-cover",
  alt = "Cave Companions Logo"
}) => {
  const [imgSrc, setImgSrc] = useState<string>(officialLogo || '/app_icon.jpg');
  const [hasFailedAll, setHasFailedAll] = useState(false);

  const handleError = () => {
    if (imgSrc !== '/app_icon.jpg') {
      // Try fallback to public URL
      setImgSrc('/app_icon.jpg');
    } else {
      setHasFailedAll(true);
    }
  };

  if (hasFailedAll) {
    // Exact Cave Companions Logo vector representation (Gold Cave Silhouette with Campfire on Solid Black)
    return (
      <div className={`${className} bg-black flex items-center justify-center relative overflow-hidden select-none`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" fill="#000000" />
          
          {/* Outer Layer: Golden Cave Silhouette with Jagged Contours */}
          <path
            d="M 50 12 L 53 15 L 60 20 L 64 25 L 70 34 L 75 48 L 81 66 L 84 78 L 78 77 L 70 82 L 63 85 L 50 89 L 37 85 L 30 82 L 22 77 L 16 78 L 19 66 L 25 48 L 30 34 L 36 25 L 40 20 L 47 15 Z"
            fill="#ebb146"
          />

          {/* Inner Cave Void */}
          <path
            d="M 50 26 L 56 32 L 62 42 L 67 58 L 70 74 L 63 76 L 50 79 L 37 76 L 30 74 L 33 58 L 38 42 L 44 32 Z"
            fill="#000000"
          />

          {/* Inner Golden Layer (Depth Cave Arch) */}
          <path
            d="M 50 28 L 54 34 L 59 44 L 62 56 L 60 58 L 56 46 L 52 38 L 50 36 L 48 38 L 44 46 L 40 58 L 38 56 L 41 44 L 46 34 Z"
            fill="#ebb146"
          />

          {/* Campfire Stone Base & Logs */}
          <path
            d="M 33 82 L 39 80 L 43 83 L 49 84 L 51 84 L 57 83 L 61 80 L 67 82 L 62 86 L 50 88 L 38 86 Z"
            fill="#ebb146"
          />
          {/* Cross Logs */}
          <path
            d="M 40 76 L 47 79 L 45 82 L 38 79 Z M 60 76 L 62 79 L 55 82 L 53 79 Z M 44 79 L 49 82 L 51 82 L 56 79 L 54 82 L 46 82 Z"
            fill="#ebb146"
          />

          {/* Campfire Flame Tongues */}
          <path
            d="M 50 48 C 50 48 47 54 47 58 C 45 55 44 57 43 62 C 41 68 44 74 48 76 C 45 72 46 68 48 66 C 48 70 51 74 50 77 C 54 75 57 69 56 63 C 55 58 53 55 53 58 C 53 54 50 48 50 48 Z"
            fill="#ebb146"
          />
          {/* Flame Core */}
          <path
            d="M 50 58 C 50 58 48 63 48 66 C 47 64 46 66 46 69 C 45 72 47 75 50 76 C 53 75 55 72 54 69 C 54 66 53 64 52 66 C 52 63 50 58 50 58 Z"
            fill="#000000"
          />
          <path
            d="M 50 63 C 50 63 49 66 49 68 C 49 70 50 72 50 73 C 50 72 51 70 51 68 C 51 66 50 63 50 63 Z"
            fill="#ebb146"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={imgSrc}
        alt={alt}
        className={imgClassName}
        referrerPolicy="no-referrer"
        onError={handleError}
      />
    </div>
  );
};
