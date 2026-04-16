import { Eye, Sparkles } from "lucide-react";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
};

export function BrandLogo({ className = "", iconClassName = "" }: BrandLogoProps) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg ${className}`}>
      <Eye className={iconClassName} />
      <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-white drop-shadow" />
    </div>
  );
}