const fs = require('fs');
const path = require('path');

const SOFTWARE_NAME = '动物大战外星军团游戏软件';
const VERSION = 'V1.0';
const TOTAL_PAGES = 60;
const LINES_PER_PAGE = 50;

function getCleanLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const rawLines = content.split(/\r?\n/);
  const clean = [];
  rawLines.forEach(l => {
    const trimmed = l.trim();
    if (trimmed.length > 0) {
      clean.push(l);
    }
  });
  return clean;
}

// 提取前 30 页 (1500 行) 与后 30 页 (1500 行)
const frontFiles = ['game.js', 'js/main.js', 'js/player/index.js'];
const backFiles = [
  'js/runtime/achievementManager.js',
  'js/skills/ElementSynergyManager.js',
  'js/equipment/EquipmentManager.js',
  'js/ui/game_ui.js',
];

let frontLines = [];
frontFiles.forEach(f => {
  frontLines = frontLines.concat(getCleanLines(f));
});

let backLines = [];
backFiles.forEach(f => {
  backLines = backLines.concat(getCleanLines(f));
});

const selectedFront = frontLines.slice(0, 1500);
const selectedBack = backLines.slice(-1500);
const all60PagesLines = selectedFront.concat(selectedBack);

console.log('Front lines extracted:', selectedFront.length);
console.log('Back lines extracted:', selectedBack.length);
console.log('Total extracted lines:', all60PagesLines.length);

if (!fs.existsSync('docs')) {
  fs.mkdirSync('docs');
}

// ----------------- 1. 生成 软著源代码文档.md -----------------
let mdContent = `# ${SOFTWARE_NAME} ${VERSION} 源代码文档\n\n`;
mdContent += `> 说明：本程序源码遵照中国版权保护中心（CPCC）计算机软件著作权登记要求，提取前 30 页（前 1500 行）与后 30 页（后 1500 行），共计 60 页，每页严格排版 50 行，共计 3000 行。\n\n`;

for (let p = 0; p < TOTAL_PAGES; p++) {
  const pageNum = p + 1;
  const start = p * LINES_PER_PAGE;
  const pageLines = all60PagesLines.slice(start, start + LINES_PER_PAGE);

  mdContent += `\n---\n`;
  mdContent += `**【页眉】${SOFTWARE_NAME} ${VERSION}**\n\n`;
  mdContent += `\`\`\`javascript\n`;
  pageLines.forEach((l, idx) => {
    const lineNum = idx + 1;
    const numPrefix = (lineNum < 10 ? '0' : '') + lineNum + ': ';
    mdContent += `${numPrefix}${l}\n`;
  });
  mdContent += `\`\`\`\n\n`;
  mdContent += `<div align="center"><b>第 ${pageNum} 页 / 共 ${TOTAL_PAGES} 页</b></div>\n\n`;
}

fs.writeFileSync('docs/软著源代码文档.md', mdContent, 'utf8');
console.log('Saved: docs/软著源代码文档.md');

// ----------------- 2. 生成 软著源代码文档.html (直接浏览器 Ctrl+P 导出标准 A4 PDF) -----------------
let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${SOFTWARE_NAME} ${VERSION} - 软件源代码文档</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 15mm 14mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #f4f5f7;
      font-family: "Courier New", Consolas, "PingFang SC", "Microsoft YaHei", monospace;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      padding: 14mm 16mm 14mm 16mm;
      margin: 10mm auto;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      position: relative;
    }
    @media print {
      body {
        background: transparent;
      }
      .page {
        margin: 0;
        box-shadow: none;
        width: 100%;
        height: 100vh;
        min-height: 100vh;
        page-break-after: always;
      }
      .no-print {
        display: none;
      }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #666;
      padding-bottom: 3.5mm;
      font-size: 9pt;
      font-weight: bold;
      color: #333;
    }
    .code-container {
      flex: 1;
      margin-top: 3mm;
      margin-bottom: 3mm;
      font-size: 8.5pt;
      line-height: 5.15mm;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .code-line {
      display: flex;
      height: 5.15mm;
      align-items: center;
    }
    .line-no {
      width: 8mm;
      color: #777;
      user-select: none;
      text-align: right;
      margin-right: 3mm;
      font-weight: normal;
    }
    .line-code {
      flex: 1;
      color: #111;
      font-family: inherit;
      white-space: pre;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .footer {
      border-top: 1px solid #666;
      padding-top: 3mm;
      text-align: center;
      font-size: 9pt;
      color: #333;
    }
    .print-tip {
      max-width: 210mm;
      margin: 15px auto;
      background: #e1f5fe;
      border: 1px solid #81d4fa;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.6;
      color: #0277bd;
    }
  </style>
</head>
<body>
  <div class="no-print print-tip">
    <strong>💡 打印/导出 PDF 提示：</strong><br>
    当前页面已配置标准 A4 软著排版（共 60 页，每页严格 50 行，顶端自动带页眉，底端带页码）。<br>
    在浏览器中直接按 <strong>Ctrl + P</strong>（或 <strong>Cmd + P</strong>），选择目标打印机为 <strong>“另存为 PDF”</strong>，纸张选 <strong>A4</strong>，边距选 <strong>无</strong>（或默认），即可一键导出标准的 60 页源代码 PDF 申报文件。
  </div>
`;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

for (let p = 0; p < TOTAL_PAGES; p++) {
  const pageNum = p + 1;
  const start = p * LINES_PER_PAGE;
  const pageLines = all60PagesLines.slice(start, start + LINES_PER_PAGE);

  htmlContent += `  <div class="page">\n`;
  htmlContent += `    <div class="header">\n`;
  htmlContent += `      <span>${SOFTWARE_NAME}</span>\n`;
  htmlContent += `      <span>版本号：${VERSION}</span>\n`;
  htmlContent += `    </div>\n`;
  htmlContent += `    <div class="code-container">\n`;

  pageLines.forEach((l, idx) => {
    const lineNum = idx + 1;
    const numStr = (lineNum < 10 ? '0' : '') + lineNum;
    htmlContent += `      <div class="code-line"><span class="line-no">${numStr}</span><span class="line-code">${escapeHtml(l)}</span></div>\n`;
  });

  htmlContent += `    </div>\n`;
  htmlContent += `    <div class="footer">第 ${pageNum} 页 / 共 ${TOTAL_PAGES} 页</div>\n`;
  htmlContent += `  </div>\n`;
}

htmlContent += `</body>\n</html>\n`;

fs.writeFileSync('docs/软著源代码文档.html', htmlContent, 'utf8');
console.log('Saved: docs/软著源代码文档.html');

