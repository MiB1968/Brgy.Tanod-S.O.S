// src/services/guardianAIService.ts
import { guardianAI as unifiedGuardianAI } from './guardianAI';

export const guardianAI = unifiedGuardianAI;

// Ignored callbacks for backwards compatibility
export function setGuardianProgressCallback(_cb: (progress: number, text: string) => void) {}
export type { GuardianContext, GuardianResponse } from '../types/ai';
