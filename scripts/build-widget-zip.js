/**
 * Собирает apps/widget/widget.zip с плоской структурой (без вложенной папки widget/).
 * Windows: PowerShell Compress-Archive; иначе: zip CLI.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const widgetDir = path.join(root, 'apps', 'widget');
const outZip = path.join(widgetDir, 'widget.zip');

const required = ['manifest.json', 'script.js', path.join('i18n', 'ru.json'), path.join('i18n', 'en.json')];
for (const rel of required) {
  const p = path.join(widgetDir, rel);
  if (!fs.existsSync(p)) {
    console.error('Missing:', p);
    process.exit(1);
  }
}

if (fs.existsSync(outZip)) {
  fs.unlinkSync(outZip);
}

if (process.platform === 'win32') {
  const manifest = path.join(widgetDir, 'manifest.json').replace(/'/g, "''");
  const script = path.join(widgetDir, 'script.js').replace(/'/g, "''");
  const i18n = path.join(widgetDir, 'i18n').replace(/'/g, "''");
  const dest = outZip.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -LiteralPath '${manifest}','${script}','${i18n}' -DestinationPath '${dest}' -Force"`,
    { stdio: 'inherit', cwd: widgetDir },
  );
} else {
  execSync('zip -r widget.zip manifest.json script.js i18n', {
    stdio: 'inherit',
    cwd: widgetDir,
  });
}

console.log('OK:', outZip);
