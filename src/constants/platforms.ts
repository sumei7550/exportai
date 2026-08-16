import type { Platform } from "../types/conversation";

interface PlatformDefinition {
  label: string;
  matchesHostname: (hostname: string) => boolean;
}

export const PLATFORM_DEFINITIONS: Record<Platform, PlatformDefinition> = {
  chatgpt: {
    label: "ChatGPT",
    matchesHostname: (hostname) => hostname === "chatgpt.com" || hostname.endsWith(".chatgpt.com") || hostname === "chat.openai.com",
  },
  claude: {
    label: "Claude",
    matchesHostname: (hostname) => hostname === "claude.ai" || hostname.endsWith(".claude.ai"),
  },
  gemini: {
    label: "Gemini",
    matchesHostname: (hostname) => hostname === "gemini.google.com",
  },
};

export function detectPlatformFromHostname(hostname: string): Platform | null {
  return (Object.keys(PLATFORM_DEFINITIONS) as Platform[]).find((platform) => PLATFORM_DEFINITIONS[platform].matchesHostname(hostname)) ?? null;
}

export function getPlatformLabel(platform: Platform): string {
  return PLATFORM_DEFINITIONS[platform].label;
}

export function isExportSupported(platform: Platform): boolean {
  return platform === "chatgpt";
}
