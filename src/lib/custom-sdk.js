import { supabase } from "./supabase-client.js";
import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Environment Configuration
// =============================================================================
const getEnvVar = (key, defaultValue) => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return process.env[key] || defaultValue;
};

// OpenAI Configuration
const OPENAI_ENABLED = getEnvVar("VITE_OPENAI_ENABLED", "false") === "true";
const OPENAI_API_KEY = getEnvVar("VITE_OPENAI_API_KEY", "");
const OPENAI_MODEL = getEnvVar("VITE_OPENAI_MODEL", "gpt-4o-mini");

// Validate OpenAI configuration
if (OPENAI_ENABLED && !OPENAI_API_KEY) {
  console.error(
    "⚠️ OpenAI is enabled (VITE_OPENAI_ENABLED=true) but VITE_OPENAI_API_KEY is not set!"
  );
}

// Lazy-load OpenAI client only when needed
let openaiClient = null;
const getOpenAIClient = async () => {
  if (!OPENAI_ENABLED) {
    throw new Error("OpenAI is not enabled. Set VITE_OPENAI_ENABLED=true");
  }
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required. Set VITE_OPENAI_API_KEY");
  }
  if (!openaiClient) {
    const { default: OpenAI } = await import("openai");
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }
  return openaiClient;
};

// Supabase Configuration
const supabaseUrl = getEnvVar("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
const supabaseServiceKey = getEnvVar(
  "VITE_SUPABASE_SERVICE_ROLE_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
});

// =============================================================================
// CustomEntity Class - Base44 Compatible CRUD Operations
// =============================================================================
export class CustomEntity {
  constructor(tableName, useServiceRole = false) {
    this.tableName = tableName;
    this.supabase = useServiceRole ? supabaseAdmin : supabase;
    this.useServiceRole = useServiceRole;
  }

  mapFieldName(field) {
    const fieldMappings = {
      created_date: "created_at",
      updated_date: "updated_at",
    };
    return fieldMappings[field] || field;
  }

  mapDataFields(data) {
    if (!data || typeof data !== "object") return data;
    const mapped = {};
    Object.entries(data).forEach(([key, value]) => {
      const mappedKey = this.mapFieldName(key);
      mapped[mappedKey] = value;
    });
    return mapped;
  }

  mapResultFields(data) {
    if (!data) return data;
    const reverseFieldMappings = {
      created_at: "created_date",
      updated_at: "updated_date",
    };
    const mapObject = (obj) => {
      const mapped = {};
      for (const [key, value] of Object.entries(obj)) {
        const mappedKey = reverseFieldMappings[key] || key;
        mapped[mappedKey] = value;
      }
      return mapped;
    };
    if (Array.isArray(data)) {
      return data.map(mapObject);
    } else {
      return mapObject(data);
    }
  }

  async list(orderBy = "created_at", limit = null) {
    let query = this.supabase.from(this.tableName).select("*");
    if (orderBy) {
      if (orderBy.startsWith("-")) {
        const field = this.mapFieldName(orderBy.substring(1));
        query = query.order(field, { ascending: false });
      } else {
        const field = this.mapFieldName(orderBy);
        query = query.order(field, { ascending: true });
      }
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) {
      if (error.code === "PGRST205" && error.message.includes("Could not find the table")) {
        console.warn(`Table ${this.tableName} does not exist, returning empty array`);
        return [];
      }
      throw error;
    }
    return this.mapResultFields(data) || [];
  }

  async filter(conditions = {}, orderBy = "created_at", limit = null) {
    let query = this.supabase.from(this.tableName).select("*");
    Object.entries(conditions).forEach(([key, value]) => {
      const mappedKey = this.mapFieldName(key);
      if (Array.isArray(value)) {
        query = query.in(mappedKey, value);
      } else {
        query = query.eq(mappedKey, value);
      }
    });
    if (orderBy) {
      if (orderBy.startsWith("-")) {
        const field = this.mapFieldName(orderBy.substring(1));
        query = query.order(field, { ascending: false });
      } else {
        const field = this.mapFieldName(orderBy);
        query = query.order(field, { ascending: true });
      }
    }
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) {
      if (error.code === "PGRST205" && error.message.includes("Could not find the table")) {
        console.warn(`Table ${this.tableName} does not exist, returning empty array`);
        return [];
      }
      console.error(`Filter error for ${this.tableName}:`, error);
      throw error;
    }
    return this.mapResultFields(data) || [];
  }

  async get(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (error.code === "PGRST205" && error.message.includes("Could not find the table")) {
        console.warn(`Table ${this.tableName} does not exist, returning null`);
        return null;
      }
      console.error(`Get error for ${this.tableName}:`, error);
      throw error;
    }
    return data ? this.mapResultFields(data) : null;
  }

  async create(data) {
    const mappedData = this.mapDataFields(data);
    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .insert(mappedData)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST205" && error.message.includes("Could not find the table")) {
        console.warn(`Table ${this.tableName} does not exist, cannot create record`);
        throw new Error(`Table ${this.tableName} is not available in this environment`);
      }
      console.error(`Create error for ${this.tableName}:`, error);
      throw error;
    }
    return this.mapResultFields(result);
  }

  async update(id, data) {
    const mappedData = this.mapDataFields(data);
    mappedData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .update(mappedData)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === "PGRST205" && error.message.includes("Could not find the table")) {
        console.warn(`Table ${this.tableName} does not exist, cannot update record`);
        return null;
      }
      console.error(`Update error for ${this.tableName}:`, error);
      throw error;
    }
    if (!result) {
      return null;
    }
    return this.mapResultFields(result);
  }

  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);
    if (error) {
      if (error.code === "PGRST205" && error.message.includes("Could not find the table")) {
        console.warn(`Table ${this.tableName} does not exist, cannot delete record`);
        return;
      }
      throw error;
    }
  }
}

// =============================================================================
// UserEntity Class - Authentication Methods
// =============================================================================
export class UserEntity extends CustomEntity {
  constructor() {
    super("users", true);
  }

  async get(id) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("Error fetching user by ID:", error);
      throw error;
    }
    return data ? this.mapResultFields(data) : null;
  }

  async me() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (authError.message?.includes("User from sub claim in JWT does not exist")) {
          await supabase.auth.signOut();
          throw new Error("Not authenticated");
        }
        if (!authError.message?.includes("Auth session missing")) {
          console.error("Auth error:", authError);
        }
        throw new Error("Not authenticated");
      }
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await this.supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user:", error);
        throw error;
      }

      if (!data) {
        const newUser = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          email_verified: user.email_confirmed_at ? true : false,
          role: user.email === "dev@localhost.com" ? "admin" : "user",
        };
        const { data: createdUser, error: createError } = await this.supabase
          .from("users")
          .insert(newUser)
          .select()
          .single();
        if (createError) {
          console.error("Error creating user:", createError);
          throw createError;
        }
        return this.mapResultFields(createdUser);
      }

      if (user.email === "dev@localhost.com" && data.role !== "admin") {
        const { data: updatedUser, error: updateError } = await this.supabase
          .from("users")
          .update({ role: "admin" })
          .eq("id", user.id)
          .select()
          .single();
        if (!updateError) {
          return this.mapResultFields(updatedUser);
        }
      }

      return this.mapResultFields(data);
    } catch (error) {
      if (
        error.message?.includes("403") ||
        error.message?.includes("Forbidden") ||
        error.message?.includes("User from sub claim in JWT does not exist") ||
        error.message?.includes("AuthApiError")
      ) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore sign out errors
        }
        throw new Error("Not authenticated");
      }
      throw error;
    }
  }

  async updateMyUserData(userData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await this.supabase
      .from("users")
      .update({ ...userData, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .maybeSingle();
    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }
    if (!data) {
      return null;
    }
    return this.mapResultFields(data);
  }

  async login(provider = "dev") {
    if (provider === "dev") {
      const devEmail = "dev@localhost.com";
      const devPassword = "dev123456";
      try {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: devEmail,
            password: devPassword,
          });
        if (signInError) {
          console.log("Sign in failed, attempting to create user:", signInError.message);
          const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({
              email: devEmail,
              password: devPassword,
              options: {
                data: {
                  full_name: "Development User",
                  role: "admin",
                },
              },
            });
          if (signUpError) {
            console.error("Sign up failed:", signUpError);
            throw signUpError;
          }
          const { error: signInAfterSignUpError } =
            await supabase.auth.signInWithPassword({
              email: devEmail,
              password: devPassword,
            });
          if (signInAfterSignUpError) {
            console.error("Sign in after signup failed:", signInAfterSignUpError);
            throw signInAfterSignUpError;
          }
        }
        window.location.reload();
      } catch (error) {
        console.error("Development login failed:", error);
        throw error;
      }
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async isAuthenticated() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (authError.message?.includes("User from sub claim in JWT does not exist")) {
          await supabase.auth.signOut();
        }
        return false;
      }
      return !!user;
    } catch {
      return false;
    }
  }

  async getCurrentUser() {
    try {
      return await this.me();
    } catch (error) {
      if (error.message === "Not authenticated") {
        return null;
      }
      throw error;
    }
  }

  async list(orderBy = "created_at", limit = null) {
    return super.list(orderBy, limit);
  }

  async filter(conditions = {}, orderBy = "created_at", limit = null) {
    return super.filter(conditions, orderBy, limit);
  }
}

// =============================================================================
// Entity Name Utilities
// =============================================================================
function entityNameToTableName(entityName) {
  return entityName
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/_+/g, "_");
}

function shouldUseServiceRole(entityName) {
  const serviceRoleEntities = [
    "user",
    "transaction",
    "usermembership",
    "payment",
    "order",
    "subscription",
    "admin",
    "audit",
    "log",
  ];
  return serviceRoleEntities.some((pattern) =>
    entityName.toLowerCase().includes(pattern)
  );
}

function createEntitiesProxy() {
  const entityCache = new Map();
  return new Proxy(
    {},
    {
      get(_, entityName) {
        if (typeof entityName !== "string") return undefined;
        if (entityCache.has(entityName)) {
          return entityCache.get(entityName);
        }
        const tableName = entityNameToTableName(entityName);
        const useServiceRole = shouldUseServiceRole(entityName);
        const entity = new CustomEntity(tableName, useServiceRole);
        entityCache.set(entityName, entity);
        console.log(`Created entity: ${entityName} -> ${tableName} (service role: ${useServiceRole})`);
        return entity;
      },
      has(_, entityName) {
        return typeof entityName === "string";
      },
      ownKeys() {
        return Array.from(entityCache.keys());
      },
    }
  );
}

// =============================================================================
// OpenAI Integration Functions
// =============================================================================

/**
 * Invoke LLM with OpenAI (when enabled) or return mock response
 */
async function invokeLLM({
  prompt,
  add_context_from_internet = false,
  response_json_schema = null,
  file_urls = null,
}) {
  // If OpenAI is not enabled, return mock response
  if (!OPENAI_ENABLED) {
    console.warn("OpenAI not enabled. Set VITE_OPENAI_ENABLED=true to enable AI features.");
    if (response_json_schema) {
      return createMockJsonResponse(response_json_schema);
    }
    return {
      response: "AI features are disabled. Set VITE_OPENAI_ENABLED=true and provide VITE_OPENAI_API_KEY to enable.",
    };
  }

  try {
    const openai = await getOpenAIClient();
    
    // Build messages array
    const messages = [
      {
        role: "system",
        content: "You are a helpful financial advisor assistant. Provide accurate, actionable advice based on the data provided."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    // Configure response format for JSON schema
    const requestOptions = {
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    };

    // If JSON schema is provided, use JSON mode
    if (response_json_schema) {
      requestOptions.response_format = { type: "json_object" };
      // Add schema instructions to the prompt
      messages[0].content += `\n\nYou must respond with valid JSON that matches this schema:\n${JSON.stringify(response_json_schema, null, 2)}`;
    }

    const completion = await openai.chat.completions.create(requestOptions);
    const responseContent = completion.choices[0]?.message?.content;

    if (response_json_schema) {
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        console.error("Failed to parse OpenAI JSON response:", parseError);
        return createMockJsonResponse(response_json_schema);
      }
    }

    return { response: responseContent };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Return mock response on error
    if (response_json_schema) {
      return createMockJsonResponse(response_json_schema);
    }
    return {
      response: `AI request failed: ${error.message}. Please check your OpenAI API key and try again.`,
      error: true
    };
  }
}

/**
 * Generate image with OpenAI DALL-E (when enabled)
 */
async function generateImage({ prompt, size = "1024x1024", quality = "standard" }) {
  if (!OPENAI_ENABLED) {
    console.warn("OpenAI not enabled for image generation.");
    return {
      url: `https://placehold.co/1024x1024/1a1a2e/ffffff?text=AI+Disabled`,
      note: "Image generation disabled. Set VITE_OPENAI_ENABLED=true",
    };
  }

  try {
    const openai = await getOpenAIClient();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality,
    });

    return {
      url: response.data[0].url,
      revised_prompt: response.data[0].revised_prompt,
    };
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    return {
      url: `https://placehold.co/1024x1024/1a1a2e/ffffff?text=Error`,
      error: error.message,
    };
  }
}

/**
 * Create mock JSON response based on schema
 */
function createMockJsonResponse(schema) {
  // Return sensible defaults based on common schema patterns
  return {
    risk_level: "medium",
    risk_explanation: "AI analysis unavailable - using default assessment",
    diversification_score: 5,
    diversification_analysis: "Enable OpenAI to get detailed analysis",
    rebalancing_needed: false,
    rebalancing_suggestions: [],
    key_insights: ["Enable VITE_OPENAI_ENABLED=true for AI-powered insights"],
    recommendations: ["Configure OpenAI API key to unlock AI features"],
    // For market analysis
    overall_sentiment: "neutral",
    market_conditions: {
      overall_sentiment: "neutral",
      volatility_level: "medium"
    },
    assets: [],
    benchmarks: [],
    // For budget/debt analysis
    suggested_budget: {},
    payoff_strategies: [],
    bills: [],
    categories: []
  };
}

// =============================================================================
// Create Custom Client (Base44 Compatible)
// =============================================================================
export function createCustomClient() {
  return {
    entities: createEntitiesProxy(),
    auth: new UserEntity(),
    
    // Check if OpenAI is enabled
    isOpenAIEnabled: () => OPENAI_ENABLED,
    
    functions: {
      invoke: async (functionName, payload = {}) => {
        console.warn(`Function ${functionName} called with:`, payload);
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload,
        });
        if (error) {
          console.error(`Function ${functionName} error:`, error);
          throw error;
        }
        return { data };
      },
      verifyHcaptcha: async () => {
        console.warn("verifyHcaptcha not yet implemented");
        return { success: true };
      },
    },
    
    integrations: {
      Core: {
        // Main LLM invocation - uses OpenAI when enabled
        InvokeLLM: invokeLLM,
        
        // Image generation - uses DALL-E when enabled
        GenerateImage: generateImage,
        
        // Email sending (placeholder - would need SendGrid/Resend)
        SendEmail: async ({ to, subject, body, from_name = "BlackieFi" }) => {
          console.warn("SendEmail called:", { to, subject, from_name });
          // TODO: Implement with SendGrid, Resend, or Supabase Edge Function
          return {
            status: "mock",
            message_id: `mock_${Date.now()}`,
            note: "Email integration not configured. Implement with SendGrid or Resend.",
          };
        },
        
        // File upload - uses Supabase Storage
        UploadFile: async ({ file }) => {
          console.warn("UploadFile called:", file?.name);
          
          try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
              .from("uploads")
              .upload(fileName, file);
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
              .from("uploads")
              .getPublicUrl(fileName);
            
            return { file_url: publicUrl };
          } catch (error) {
            console.error("File upload error:", error);
            return {
              file_url: null,
              error: error.message,
              note: "Ensure 'uploads' bucket exists in Supabase Storage",
            };
          }
        },
        
        // Data extraction from files (placeholder)
        ExtractDataFromUploadedFile: async ({ file_url, json_schema }) => {
          console.warn("ExtractDataFromUploadedFile called:", { file_url });
          
          if (!OPENAI_ENABLED) {
            return {
              status: "disabled",
              output: json_schema?.type === "array" ? [] : {},
              note: "Enable OpenAI for document extraction",
            };
          }
          
          // TODO: Implement with GPT-4 Vision or dedicated OCR service
          return {
            status: "not_implemented",
            output: json_schema?.type === "array" ? [] : {},
            note: "Document extraction requires GPT-4 Vision implementation",
          };
        },
      },
    },
  };
}

export const customClient = createCustomClient();
