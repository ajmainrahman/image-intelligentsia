type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
};

export function BrandLogo({ className = "", iconClassName = "" }: BrandLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400 shadow-lg ring-1 ring-emerald-500/30 ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        className={iconClassName}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Eye shape */}
        <path
          d="M4 16 Q16 6 28 16 Q16 26 4 16Z"
          fill="white"
          fillOpacity="0.12"
        />
        <path
          d="M4 16 Q16 6 28 16 Q16 26 4 16Z"
          stroke="white"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          fill="none"
        />
        {/* Iris ring */}
        <circle cx="16" cy="16" r="6.5" fill="white" fillOpacity="0.18" />
        <circle cx="16" cy="16" r="6.5" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" fill="none" />
        {/* Neural triangle nodes */}
        <circle cx="16" cy="11.5" r="1.6" fill="white" />
        <circle cx="19.8" cy="18" r="1.6" fill="white" />
        <circle cx="12.2" cy="18" r="1.6" fill="white" />
        {/* Neural connections */}
        <line x1="16" y1="11.5" x2="19.8" y2="18" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.85" />
        <line x1="19.8" y1="18" x2="12.2" y2="18" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.85" />
        <line x1="12.2" y1="18" x2="16" y2="11.5" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.85" />
        {/* Pupil center */}
        <circle cx="16" cy="16" r="1.8" fill="white" fillOpacity="0.4" />
      </svg>
    </div>
  );
}
