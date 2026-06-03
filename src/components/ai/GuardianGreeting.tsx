import React, { useEffect } from "react";
import { useGuardian } from "../../hooks/useGuardian";
import { useAuthStore } from "../../store/useAuthStore";

interface GuardianGreetingProps {
  delay?: number;
}

export const GuardianGreeting: React.FC<GuardianGreetingProps> = ({
  delay = 1000,
}) => {
  const { performGreeting } = useGuardian();
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      const timer = setTimeout(() => {
        performGreeting(profile.role, profile.name);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [profile, performGreeting, delay]);

  return null; // Side-effect only component
};
