export const getCurrentDatetimeTool = {
  name: 'get_current_datetime',
  description: "Returns the current real-world date and time. Use this whenever the user asks about today's date, the current time, or anything relative to 'now' — never guess this from training data.",
  parameters: { type: 'object', properties: {}, required: [] },
  execute: async () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      readable: now.toLocaleString('ar-EG', { timeZone: 'Asia/Hebron' }),
      timezone: 'Asia/Hebron',
    };
  },
};