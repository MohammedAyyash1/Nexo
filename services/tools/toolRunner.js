import { getToolByName, getAllTools } from './toolRegistry.js';
import { checkToolEntitlement, consumeQuota } from '../entitlementService.js';

export function toGeminiToolsFormat(tools) {
  return [{
    functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
  }];
}

export function toGroqToolsFormat(tools) {
  return tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

// تحقق أساسي من المدخلات مقابل الـschema المعلن للأداة - بدون مكتبة خارجية
function validateArgsAgainstSchema(args, schema) {
  if (!schema || schema.type !== 'object') return { valid: true };
  const required = schema.required || [];
  for (const key of required) {
    if (args[key] === undefined || args[key] === null || args[key] === '') {
      return { valid: false, error: `missing_required_field:${key}` };
    }
  }
  const properties = schema.properties || {};
  for (const [key, value] of Object.entries(args)) {
    const propSchema = properties[key];
    if (!propSchema) continue;
    if (propSchema.type === 'string' && typeof value !== 'string') return { valid: false, error: `invalid_type:${key}` };
    if (propSchema.type === 'number' && typeof value !== 'number') return { valid: false, error: `invalid_type:${key}` };
  }
  return { valid: true };
}

// نقطة التنفيذ المركزية الوحيدة لأي أداة بكل المشروع - السيرفر ينفذ، الموديل فقط يطلب.
// ممنوع أي تنفيذ كود ديناميكي/SQL/HTTP هنا أو داخل أي أداة مسجّلة - راجع calculate.js كمثال آمن.
export async function executeToolCall({ name, args }, userId) {
  const startedAt = Date.now();
  const tool = getToolByName(name);

  if (!tool) {
    console.warn(`[tools] unknown tool requested: "${name}" (user ${userId})`);
    return { success: false, error: 'unknown_tool' };
  }

  const validation = validateArgsAgainstSchema(args || {}, tool.parameters);
  if (!validation.valid) {
    console.warn(`[tools] invalid args for "${name}": ${validation.error}`);
    return { success: false, error: validation.error };
  }

  const entitlement = await checkToolEntitlement(userId, name);
  if (!entitlement.allowed) {
    console.log(`[tools] blocked by entitlement: "${name}" (user ${userId})`);
    return { success: false, error: 'tool_not_allowed' };
  }

  try {
    const result = await tool.execute(args || {});
    consumeQuota(userId, `tool_${name}`).catch(() => {});
    console.log(`[tools] executed "${name}" in ${Date.now() - startedAt}ms — success`);
    return { success: true, result };
  } catch (err) {
    console.error(`[tools] execution failed for "${name}": ${err.message}`);
    return { success: false, error: err.message || 'execution_failed' };
  }
}

export { getAllTools };