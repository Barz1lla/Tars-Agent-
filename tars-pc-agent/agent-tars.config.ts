// TARS AGENT CONFIGURATION
// This file defines the core behavior of the TARS agent, including AI model preferences,
// fallback strategies, and operational settings.

import { defineConfig } from "@agent-tars/interface";

export default defineConfig({
  // --- PRIMARY AI PROVIDER ---
  // The main model used for all primary tasks.
  model: {
    provider: "deepseek",
    id: "deepseek-chat",
    // Use environment variables for URLs for flexibility, with a sensible default.
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY,
 
      max_tokens: 4000,
      temperature: 0.7,
  },

  // --- FALLBACK CHAIN ---
  // A chain of models to use in order if the primary model fails.
  // This ensures resilience and continued operation.
  fallbacks: [
    { 
      provider: "openchat", 
      id: "openchat-3.5", 
      baseURL: process.env.OPENCHAT_BASE_URL || "https://api.openchat.ai/v1",
      // Ensure all external providers use environment variables for keys.
      apiKey: process.env.OPENCHAT_API_KEY,
    },
    { 
      provider: "ollama",   
      id: "llama2",      
      baseURL: "http://localhost:11434/v1",
      // Allow per-model overrides for more granular control.
      temperature: 0.75,
    },
  ],

  // --- BROWSER CONTROL ---
  // Defines how the agent interacts with web browsers.
  // 'hybrid' mode likely allows both programmatic control and user interaction.
  browser: { 
    control: "hybrid" 
  },

  // --- LOGGING ---
  // Configures the verbosity and output of the agent's logs.
  logging: { 
    level: "debug",     // Set to 'info' for production to reduce noise.
    websocket: true   // Enables real-time log streaming to a client.
  },
});