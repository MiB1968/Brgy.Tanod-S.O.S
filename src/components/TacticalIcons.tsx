import React from "react";
import { cn } from "../lib/utils";

interface TacticalIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  glow?: boolean;
}

const BaseIcon = ({
  children,
  size = 48,
  glow,
  className,
  ...props
}: TacticalIconProps) => (
  <svg
    viewBox="0 0 48 48"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(
      "transition-all duration-300",
      glow && "drop-shadow-[0_0_8px_currentColor]",
      className
    )}
    {...props}
  >
    {children}
  </svg>
);

export const IconApprovedResidents = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <rect x="13" y="6" width="22" height="28" rx="2" fill="currentColor" />
    <rect x="17" y="10" width="14" height="2" rx="1" fill="#0D0D12" />
    <rect x="17" y="14" width="10" height="2" rx="1" fill="#0D0D12" />
    <rect x="17" y="18" width="12" height="2" rx="1" fill="#0D0D12" />
    <rect x="17" y="22" width="8" height="2" rx="1" fill="#0D0D12" />
    <rect x="22" y="34" width="4" height="4" rx="1" fill="currentColor" />
    <rect x="23" y="38" width="2" height="4" fill="currentColor" />
    <circle cx="24" cy="43" r="1.5" fill="#6B7280" />
    <circle cx="24" cy="3" r="1.5" fill="#6B7280" />
  </BaseIcon>
);

export const IconPendingRegistration = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <rect x="13" y="7" width="22" height="3" rx="1" fill="currentColor" />
    <rect x="13" y="38" width="22" height="3" rx="1" fill="currentColor" />
    <path d="M15 10 L24 25 L33 10 Z" fill="currentColor" opacity="0.35" />
    <path d="M15 38 L24 25 L33 38 Z" fill="currentColor" />
    <path d="M19 38 L24 30 L29 38 Z" fill="white" opacity="0.8" />
  </BaseIcon>
);

export const IconActiveSOS = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <line
      x1="24"
      y1="4"
      x2="24"
      y2="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="24"
      y1="38"
      x2="24"
      y2="44"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="4"
      y1="24"
      x2="10"
      y2="24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="38"
      y1="24"
      x2="44"
      y2="24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <polygon points="24,12 32,17 32,27 24,32 16,27 16,17" fill="currentColor" />
    <rect x="22.5" y="16" width="3" height="9" rx="1" fill="#0D0D12" />
    <circle cx="24" cy="28" r="1.8" fill="#0D0D12" />
  </BaseIcon>
);

export const IconOnlineTanods = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <path
      d="M24 6 L36 11 L36 25 C36 32 30 38 24 42 C18 38 12 32 12 25 L12 11 Z"
      fill="currentColor"
    />
    <path
      d="M24 10 L33 14 L33 25 C33 30.5 28.5 35.5 24 38.5 C19.5 35.5 15 30.5 15 25 L15 14 Z"
      fill="#0D0D12"
    />
    <polygon
      points="24,16 25.5,21 30.5,21 26.5,24 28,29 24,26 20,29 21.5,24 17.5,21 22.5,21"
      fill="currentColor"
    />
  </BaseIcon>
);

export const IconRadar = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <circle
      cx="24"
      cy="24"
      r="18"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.3"
    />
    <circle
      cx="24"
      cy="24"
      r="12"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.5"
    />
    <circle
      cx="24"
      cy="24"
      r="6"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.8"
    />
    <circle cx="24" cy="24" r="2" fill="currentColor" />
    <line
      x1="24"
      y1="24"
      x2="38"
      y2="12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.9"
    />
  </BaseIcon>
);

export const IconNewIncident = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="24" cy="24" r="5" fill="currentColor" />
    <line
      x1="24"
      y1="6"
      x2="24"
      y2="14"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <line
      x1="24"
      y1="34"
      x2="24"
      y2="42"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <line
      x1="6"
      y1="24"
      x2="14"
      y2="24"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <line
      x1="34"
      y1="24"
      x2="42"
      y2="24"
      stroke="currentColor"
      strokeWidth="2.5"
    />
  </BaseIcon>
);

export const IconAdminBadge = (props: TacticalIconProps) => (
  <BaseIcon {...props}>
    <path
      d="M24 5 L28 9 L33 8 L35 13 L40 14 L39 19 L43 23 L40 27 L42 32 L37 34 L36 39 L31 39 L28 43 L24 41 L20 43 L17 39 L12 39 L11 34 L6 32 L8 27 L5 23 L9 19 L8 14 L13 13 L15 8 L20 9 Z"
      fill="currentColor"
    />
    <circle cx="24" cy="24" r="11" fill="#0D0D12" />
    <polygon
      points="24,14 25.8,20 32,20 27,23.5 29,30 24,26.5 19,30 21,23.5 16,20 22.2,20"
      fill="currentColor"
    />
  </BaseIcon>
);
