const fs = require('fs');
const path = require('path');

const suspiciousPatterns = [
  /\bchatgpt\b/i,
  /\bgpt-[34o]\b/i,
  /\bclaude\b/i,
  /\bgemini\b/i,
  /\bantigravity\b/i,
  /\bdeepseek\b/i,
  /\bcopilot\b/i,
  /\bllm\b/i,
  /\bprompt\b/i,
  /作为.*(?:模型|助手|ai)/i,
  /语言模型/i,
  /大模型/i,
  /人工.*智能.*生成/i,
  /\btodo\b/i,
  /\bfixme\b/i,
  /\bxxx\b/i,
  /待补充/i,
  /占位/i,
  /待定/i,
  /个人\s*\/\s*企业开发者/i,
  /[cCdD]:\\[Uu]sers\\/i,
  /d:\\file\\wr/i,
  /file:\/\/\//i
];

function getAllFiles(dir) {
  let res = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== '.git' && f !== 'node_modules') {
        res = res.concat(getAllFiles(full));
      }
    } else {
      if (f.endsWith('.js') || f.endsWith('.md') || f.endsWith('.html') || f.endsWith('.json')) {
        res.push(full);
      }
    }
  }
  return res;
}

const allFiles = getAllFiles('.');
console.log('Total files to scan:', allFiles.length);

let findings = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    suspiciousPatterns.forEach(pat => {
      if (pat.test(line)) {
        findings.push({
          file,
          lineNum: idx + 1,
          pattern: pat.toString(),
          line: line.trim()
        });
      }
    });
  });
});

console.log('--- AUDIT FINDINGS ---');
console.log('Total findings:', findings.length);
findings.forEach((f, i) => {
  console.log((i + 1) + '. [' + f.file + ':L' + f.lineNum + '] Pattern: ' + f.pattern);
  console.log('   Line: ' + f.line.slice(0, 120));
});
