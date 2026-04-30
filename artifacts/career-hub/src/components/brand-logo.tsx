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
        <path
          d="M8 24 L16 7 L24 24"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M11.6 18.5 L20.4 18.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="16" cy="11.5" r="1.5" fill="white" />
      </svg>
    </div>
  );
}
