/**
 * Собирает apps/widget/widget.zip с плоской структурой (без вложенной папки widget/).
 * Включает images/, если папка есть (требование Kommo для логотипов).
 * Windows: PowerShell Compress-Archive; иначе: zip CLI.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const widgetDir = path.join(root, 'apps', 'widget');
const outZip = path.join(widgetDir, 'widget.zip');

const required = [
  'manifest.json',
  'script.js',
  path.join('i18n', 'ru.json'),
  path.join('i18n', 'en.json'),
];
for (const rel of required) {
  const p = path.join(widgetDir, rel);
  if (!fs.existsSync(p)) {
    console.error('Missing:', p);
    process.exit(1);
  }
}

const imagesDir = path.join(widgetDir, 'images');
if (!fs.existsSync(imagesDir)) {
  console.warn('Warning: images/ missing — Kommo upload may fail.');
}

if (fs.existsSync(outZip)) {
  fs.unlinkSync(outZip);
}

if (process.platform === 'win32') {
  const esc = (p) => p.replace(/'/g, "''");
  const parts = [
    path.join(widgetDir, 'manifest.json'),
    path.join(widgetDir, 'script.js'),
    path.join(widgetDir, 'i18n'),
  ];
  if (fs.existsSync(imagesDir)) {
    parts.push(imagesDir);
  }
  const literal = parts.map((p) => `'${esc(p)}'`).join(',');
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -LiteralPath ${literal} -DestinationPath '${esc(outZip)}' -Force"`,
    { stdio: 'inherit', cwd: widgetDir },
  );
} else {
  const hasImages = fs.existsSync(imagesDir);
  execSync(
    hasImages
      ? 'zip -r widget.zip manifest.json script.js i18n images'
      : 'zip -r widget.zip manifest.json script.js i18n',
    { stdio: 'inherit', cwd: widgetDir },
  );
}

console.log('OK:', outZip);
