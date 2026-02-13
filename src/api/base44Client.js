import { customClient } from "@/lib/custom-sdk.js";

// Export the custom client as base44 for compatibility with existing code
// This is a drop-in replacement for the Base44 SDK
export const base44 = customClient;
