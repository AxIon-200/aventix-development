import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function AventixLogo({ className = "", size = "md" }: LogoProps) {
  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Exact Aventix Cyan Geometric Mark */}
      <svg
        className={iconSizes[size]}
        viewBox="0 0 40 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17.5 4L2 32H11L20 16L17.5 4Z"
          fill="#00e5be"
        />
        <path
          d="M22.5 4L38 32H29L20 16L22.5 4Z"
          fill="#00e5be"
        />
        <path
          d="M11 25.5H29L26 31H14L11 25.5Z"
          fill="#00e5be"
          fillOpacity="0.85"
        />
      </svg>
      <span
        className={`font-extrabold tracking-wider text-white uppercase ${textSizes[size]}`}
        style={{ letterSpacing: "0.08em" }}
      >
        AVENTIX
      </span>
    </div>
  );
}
