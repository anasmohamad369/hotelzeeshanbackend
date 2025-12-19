const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const INIT = ESC + '@'; // Initialize Printer (Reset)
const NORMAL_TEXT = ESC + '!' + '\x00'; // Font A, Normal Size
const CENTER_ALIGN = ESC + 'a' + '\x01'; // Center Alignment
const LEFT_ALIGN = ESC + 'a' + '\x00'; // Left Alignment

const LINE_WIDTH = 32; // Normal 58mm printer width (Font A)

function line() {
  return '-'.repeat(LINE_WIDTH);
}

function center(text) {
  if (text.length >= LINE_WIDTH) return text.slice(0, LINE_WIDTH);
  const pad = Math.floor((LINE_WIDTH - text.length) / 2);
  return ' '.repeat(pad) + text;
}

function formatItem(name, qty, price) {
  // 32 chars total
  const itemCol = name.slice(0, 16).padEnd(16);
  const qtyCol = String(qty).padStart(4);
  const priceCol = String(price).padStart(12);
  return `${itemCol}${qtyCol}${priceCol}`;
}

function printToken(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    console.error('❌ No items to print', order);
    return;
  }

  // Dynamic Total Spacing
  const totalLabel = "TOTAL";
  const totalValue = `Rs.${order.total}`;
  const totalSpaces = LINE_WIDTH - totalLabel.length - totalValue.length;
  const totalLine = totalLabel + ' '.repeat(Math.max(0, totalSpaces)) + totalValue;

  // Use ESC/POS commands for reliable formatting
  const content =
    INIT +
    NORMAL_TEXT +
    `${center('HOTEL ZEESHAN')}
${center('NEAR BIG MASJID')}
${center('ARUN ICE CREAM OPP ROAD')}
${center('PHONE NO: 9666214777')}
${center('PHONE NO : 9553615666')}

${line()}
Token : ${order.token}
Time  : ${new Date().toLocaleTimeString()}
${line()}
Item            Qty       Price
${line()}
${order.items.map(i =>
      formatItem(i.name, i.qty, i.price)
    ).join('\n')}
${line()}
${totalLine}
${line()}
${center('Thank You')}
${center('Visit Again')}
\n\n\n\n\x1B\x69`; // Extra newlines + partial cut

  const filePath = path.join(__dirname, 'print.txt');

  // MUST use binary encoding to preserve ESC codes
  fs.writeFileSync(filePath, content, { encoding: 'binary' });

  // Use customized PowerShell script for Raw Printing (Bypasses Network Share)
  const scriptPath = path.join(__dirname, 'rawprint.ps1');

  exec(
    `powershell -ExecutionPolicy Bypass -File "${scriptPath}" "POS58 Printer" "${filePath}"`,
    (err, stdout, stderr) => {
      if (err) {
        console.error('Print error:', err);
        console.error('Stderr:', stderr);
      } else {
        console.log('Print output:', stdout);
      }
    }
  );
}

module.exports = printToken;
