// محلل حسابي آمن (Shunting-yard) - بدون eval أو Function أو أي تنفيذ كود ديناميكي
function safeEvaluate(expr) {
  const tokens = expr.match(/\d+\.?\d*|[+\-*/().%]/g) || [];
  const outputQueue = [];
  const operatorStack = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };

  for (const token of tokens) {
    if (/^\d+\.?\d*$/.test(token)) {
      outputQueue.push(parseFloat(token));
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.pop();
    } else {
      while (operatorStack.length && precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    }
  }
  while (operatorStack.length) outputQueue.push(operatorStack.pop());

  const stack = [];
  for (const token of outputQueue) {
    if (typeof token === 'number') {
      stack.push(token);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      let r;
      if (token === '+') r = a + b;
      else if (token === '-') r = a - b;
      else if (token === '*') r = a * b;
      else if (token === '/') r = a / b;
      else if (token === '%') r = a % b;
      stack.push(r);
    }
  }
  return stack[0];
}

export const calculateTool = {
  name: 'calculate',
  description: 'Evaluates a mathematical expression and returns the precise numeric result. Use this whenever exact arithmetic, percentages, or numeric calculations are needed instead of estimating.',
  parameters: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'A mathematical expression using only numbers and + - * / ( ) . %, e.g. "(120 * 0.15) + 40"' },
    },
    required: ['expression'],
  },
  execute: async (args) => {
    const expr = String(args?.expression || '');
    if (!/^[0-9+\-*/(). %\s]+$/.test(expr)) throw new Error('invalid_expression');
    if (expr.length > 200) throw new Error('expression_too_long');

    const result = safeEvaluate(expr);
    if (!Number.isFinite(result)) throw new Error('calculation_error');
    return { expression: expr, result };
  },
};