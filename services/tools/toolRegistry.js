import { calculateTool } from './calculate.js';
import { getCurrentDatetimeTool } from './getCurrentDatetime.js';

// السجل المركزي - أي أداة جديدة مستقبلًا تُضاف هون بسطر واحد بس، وتشتغل تلقائيًا
// مع كل المزودين المدعومين (Gemini, Groq) بدون أي تعديل على /chat أو toolRunner.js
const TOOLS = [calculateTool, getCurrentDatetimeTool];
const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

export function getAllTools() {
  return TOOLS;
}

export function getToolByName(name) {
  return TOOL_MAP[name] || null;
}