#!/usr/bin/env node
// Добавляет запись о потраченном времени в hours.json.
// node add.mjs --date 2026-09-15 --project finix --type доработка --minutes 150 --comment "..."

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), 'hours.json');
const TYPES = ['техподдержка', 'доработка', 'другое'];
const MAX_MINUTES = 24 * 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROJECT_RE = /^[a-z0-9][a-z0-9-]*$/;

function fail(message) {
  console.error(`Ошибка: ${message}`);
  process.exit(1);
}

function isRealDate(value) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function validate({ date, project, type, minutes, comment }) {
  if (!isRealDate(date)) fail(`дата «${date}» некорректна, нужен формат ГГГГ-ММ-ДД`);
  if (!PROJECT_RE.test(project)) fail(`проект «${project}» — латиница в нижнем регистре, цифры, дефис`);
  if (!TYPES.includes(type)) fail(`тип «${type}» — допустимо: ${TYPES.join(', ')}`);
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > MAX_MINUTES) {
    fail(`минуты «${minutes}» — целое число от 1 до ${MAX_MINUTES}`);
  }
  if (!comment) fail('пустой комментарий');
}

const { values } = parseArgs({
  options: {
    date: { type: 'string' },
    project: { type: 'string' },
    type: { type: 'string' },
    minutes: { type: 'string' },
    comment: { type: 'string' },
  },
});

const entry = {
  date: values.date ?? '',
  project: (values.project ?? '').trim().toLowerCase(),
  type: (values.type ?? '').trim().toLowerCase(),
  minutes: Number(values.minutes),
  comment: (values.comment ?? '').trim(),
};
validate(entry);

let entries;
try {
  entries = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
} catch (err) {
  fail(`не удалось прочитать ${DATA_FILE}: ${err.message}`);
}

const next = [...entries, entry].sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(DATA_FILE, `${JSON.stringify(next, null, 2)}\n`);

const month = entry.date.slice(0, 7);
const monthMinutes = next
  .filter((e) => e.project === entry.project && e.date.startsWith(month))
  .reduce((sum, e) => sum + e.minutes, 0);

console.log(`Записано: ${entry.date} · ${entry.project} · ${entry.type} · ${entry.minutes} мин`);
console.log(`Итого по ${entry.project} за ${month}: ${monthMinutes} мин`);
