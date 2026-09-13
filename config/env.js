import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: 3001,
  jwtSecret: process.env.JWT_SECRET || 'nexo-dev-secret-change-me',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  avatarProvider: process.env.AVATAR_PROVIDER,
  didApiKey: process.env.DID_API_KEY,
  geminiModel: 'gemini-flash-lite-latest',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  frontendUrl: 'http://localhost:5173',
};