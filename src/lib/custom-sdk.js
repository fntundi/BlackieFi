import { supabase } from "./supabase-client.js";
import { createClient } from "@supabase/supabase-js";

// Handle both Vite (import.meta.env) and Node.js (process.env) environments
const getEnvVar = (key, defaultValue) => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return process.env[key] || defaultValue;
};

// Create service role client for admin operations (bypasses RLS)
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

/**
 * Base Entity class that provides CRUD operations compatible with Base44 SDK
 */
export class CustomEntity {
  constructor(tableName, useServiceRole = false) {
    this.tableName = tableName;
    this.supabase = useServiceRole ? supabaseAdmin : supabase;
    this.useServiceRole = useServiceRole;
  }

  /**
   * Map Base44 field names to Supabase field names
   */
  mapFieldName(field) {
    const fieldMappings = {
      created_date: "created_at",
      updated_date: "updated_at",
    };
    return fieldMappings[field] || field;
  }

  /**
   * Map data object fields from Base44 to Supabase format
   */
  mapDataFields(data) {
    if (!data || typeof data !== "object") return data;
    const mapped = {};
    Object.entries(data).forEach(([key, value]) => {
      const mappedKey = this.mapFieldName(key);
      mapped[mappedKey] = value;
    });
    return mapped;
  }

  /**
   * Map Supabase field names back to Base44 field names in results
   */
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

  /**
   * List all records with optional ordering and limit
   */
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

  /**
   * Filter records based on conditions
   */
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

  /**
   * Get a single record by ID
   */
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

  /**
   * Create a new record
   */
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

  /**
   * Update a record by ID
   */
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

  /**
   * Delete a record by ID
   */
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

/**
 * User Entity with authentication methods
 */
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

/**
 * Convert PascalCase entity name to snake_case table name
 */
function entityNameToTableName(entityName) {
  return entityName
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/_+/g, "_");
}

/**
 * Determine if an entity should use service role based on common patterns
 */
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

/**
 * Create a dynamic entities proxy that creates entities on-demand
 */
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

/**
 * Create custom client that mimics Base44 SDK structure
 */
export function createCustomClient() {
  return {
    entities: createEntitiesProxy(),
    auth: new UserEntity(),
    functions: {
      invoke: async (functionName, payload = {}) => {
        // For now, implement functions as Supabase Edge Functions or local handlers
        console.warn(`Function ${functionName} called with:`, payload);
        
        // Map to Supabase Edge Functions
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
        InvokeLLM: async ({
          prompt,
          add_context_from_internet = false,
          response_json_schema = null,
          file_urls = null,
        }) => {
          console.warn("InvokeLLM called with:", { prompt, add_context_from_internet, response_json_schema, file_urls });
          // TODO: Replace with actual OpenAI API call
          if (response_json_schema) {
            return {
              risk_level: "medium",
              risk_explanation: "LLM integration not yet implemented - placeholder response",
              diversification_score: 5,
              diversification_analysis: "Placeholder analysis",
              rebalancing_needed: false,
              rebalancing_suggestions: [],
              key_insights: ["LLM integration pending implementation"],
              recommendations: ["Configure OpenAI API key to enable AI features"],
            };
          } else {
            return {
              response: "LLM integration not yet implemented. Configure OpenAI API key to enable AI features.",
            };
          }
        },
        SendEmail: async ({ to, subject, body, from_name = "BlackieFi" }) => {
          console.warn("SendEmail called with:", { to, subject, body, from_name });
          return {
            status: "sent",
            message_id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            note: "Email integration not yet implemented",
          };
        },
        UploadFile: async ({ file }) => {
          console.warn("UploadFile called with file:", file?.name, file?.size, file?.type);
          const mockUrl = `https://mock-storage.supabase.co/uploads/${Date.now()}_${file?.name || "file"}`;
          return {
            file_url: mockUrl,
            note: "File upload integration not yet implemented",
          };
        },
        GenerateImage: async ({ prompt }) => {
          console.warn("GenerateImage called with prompt:", prompt);
          const mockUrl = `https://mock-ai-images.com/generated/${Date.now()}.png`;
          return {
            url: mockUrl,
            note: "Image generation integration not yet implemented",
          };
        },
        ExtractDataFromUploadedFile: async ({ file_url, json_schema }) => {
          console.warn("ExtractDataFromUploadedFile called with:", { file_url, json_schema });
          return {
            status: "success",
            details: null,
            output: json_schema?.type === "array" ? [] : {},
            note: "File data extraction integration not yet implemented",
          };
        },
      },
    },
  };
}

export const customClient = createCustomClient();
