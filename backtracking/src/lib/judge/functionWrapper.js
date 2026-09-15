/**
 * Generates a full C translation unit by wrapping a contestant's function
 * in a hidden main() driver based on the problem's inputSpec.
 */

export const shouldWrapSource = (source, problem) => {
  if (!problem || !problem.useFunctionMode) return false;
  if (!source || typeof source !== 'string') return false;
  // If the source already defines a main function, do not double-wrap
  if (/\bint\s+main\s*\(/.test(source) || /\bmain\s*\(/.test(source)) {
    return false;
  }
  return true;
};

export const generateCWrapper = ({ source, problem }) => {
  if (!shouldWrapSource(source, problem)) {
    return source;
  }

  const inputSpec = problem.inputSpec || [];
  const funcName = problem.functionName || 'solve';
  const returnType = problem.returnType || 'void';

  // Build parameter reads for main()
  const declarations = [];
  const readStmts = [];
  const callArgs = [];

  for (let i = 0; i < inputSpec.length; i++) {
    const spec = inputSpec[i];
    const varName = spec.name || `arg${i + 1}`;
    const type = (spec.type || 'int').toLowerCase();

    callArgs.push(varName);

    switch (type) {
      case 'long':
        declarations.push(`    long ${varName} = 0;`);
        readStmts.push(`    if (scanf("%ld", &${varName}) != 1) return 0;`);
        break;
      case 'float':
        declarations.push(`    float ${varName} = 0.0f;`);
        readStmts.push(`    if (scanf("%f", &${varName}) != 1) return 0;`);
        break;
      case 'double':
        declarations.push(`    double ${varName} = 0.0;`);
        readStmts.push(`    if (scanf("%lf", &${varName}) != 1) return 0;`);
        break;
      case 'string':
        declarations.push(`    char ${varName}[1024] = {0};`);
        readStmts.push(`    if (scanf("%1023s", ${varName}) != 1) return 0;`);
        break;
      case 'array':
        // By convention: reads integer size N first, then N integers
        declarations.push(`    int ${varName}_len = 0;`);
        declarations.push(`    int ${varName}[1024] = {0};`);
        readStmts.push(`    if (scanf("%d", &${varName}_len) != 1) return 0;`);
        readStmts.push(`    for (int _i = 0; _i < ${varName}_len && _i < 1024; _i++) { if (scanf("%d", &${varName}[_i]) != 1) break; }`);
        callArgs[callArgs.length - 1] = `${varName}, ${varName}_len`;
        break;
      case 'int':
      default:
        declarations.push(`    int ${varName} = 0;`);
        readStmts.push(`    if (scanf("%d", &${varName}) != 1) return 0;`);
        break;
    }
  }

  // If problem had no inputSpec configured, fallback to reading integer n
  if (inputSpec.length === 0) {
    declarations.push(`    int n = 0;`);
    readStmts.push(`    if (scanf("%d", &n) != 1) return 0;`);
    callArgs.push('n');
  }

  let invocation = `${funcName}(${callArgs.join(', ')});`;
  if (returnType === 'int') {
    invocation = `    int _ret = ${funcName}(${callArgs.join(', ')});\n    printf("%d\\n", _ret);`;
  } else if (returnType === 'long') {
    invocation = `    long _ret = ${funcName}(${callArgs.join(', ')});\n    printf("%ld\\n", _ret);`;
  } else if (returnType === 'double' || returnType === 'float') {
    invocation = `    double _ret = ${funcName}(${callArgs.join(', ')});\n    printf("%f\\n", _ret);`;
  } else {
    invocation = `    ${invocation}`;
  }

  return `/* === AUTO-GENERATED DRIVER (Backtracking Arena) === */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>

/* --- USER SOLUTION START --- */
${source}
/* --- USER SOLUTION END --- */

int main(void) {
${declarations.join('\n')}
${readStmts.join('\n')}
${invocation}
    return 0;
}
`;
};

/**
 * Generates the preview wrapper displayed in Admin Console so admins can inspect the C harness.
 */
export const previewWrapper = (problem) => {
  return generateCWrapper({
    source: `// Contestant code goes here\n${problem.functionSignature || 'void solve(int n)'} {\n    // Implementation\n}`,
    problem,
  });
};
