const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lib = require('../script.js');
const syllabus = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'syllabus.json'), 'utf8'));
lib.setSyllabus(syllabus);

test('normaliseTitle strips punctuation and keeps magnitudes distinct', () => {
  assert.equal(lib.normaliseTitle('Whole Numbers up to 1,000'), 'whole numbers up to 1000');
  assert.equal(lib.normaliseTitle("Teacher's Guide"), 'teachers guide');
  assert.notEqual(
    lib.normaliseTitle('Whole Numbers up to 1,000'),
    lib.normaliseTitle('Whole Numbers up to 100,000')
  );
});

test('titleMatchScore: exact, substring and magnitude guard', () => {
  assert.equal(lib.titleMatchScore('Whole Numbers up to 1,000', 'Whole Numbers up to 1,000'), 100);
  assert.equal(lib.titleMatchScore('Whole Numbers up to 1,000', 'Whole Numbers up to 100,000'), 0);
  assert.equal(lib.titleMatchScore('Whole Numbers up to 100,000', 'Whole Numbers up to 1,000'), 0);
  assert.ok(lib.titleMatchScore('Whole Numbers up to 1,000', 'Whole Numbers up to 1,000 (P3)') >= 75);
  assert.equal(lib.titleMatchScore('', 'Whole Numbers up to 1,000'), 0);
  assert.equal(lib.titleMatchScore('form', 'formula'), 0); // prefix alone must not match
});

test('findUnitInYear only searches the selected class', () => {
  const ok = lib.findUnitInYear('P3', 'Whole Numbers up to 1,000');
  assert.equal(ok.ok, true);
  assert.equal(ok.unit.unitTitle, 'Whole Numbers up to 1,000');

  // Same title in a different class must not leak across years.
  const wrongYear = lib.findUnitInYear('P4', 'Whole Numbers up to 1,000');
  assert.equal(wrongYear.ok, false);
  assert.equal(wrongYear.reason, 'unit-not-in-year');

  const empty = lib.findUnitInYear('P3', '');
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, 'empty');

  const noBooks = lib.findUnitInYear('P9', 'Anything');
  assert.equal(noBooks.ok, false);
  assert.equal(noBooks.reason, 'no-books');
});

test('findUnitInYear matches by unit number', () => {
  const res = lib.findUnitInYear('P4', 'Unit 5');
  assert.equal(res.ok, true);
  assert.equal(res.unit.unitNo, 'Unit 5');
});

test('findLessonInUnit indexes inside the matched unit only', () => {
  const unitRes = lib.findUnitInYear('P3', 'Whole Numbers up to 1,000');
  assert.equal(unitRes.ok, true);
  const lessonRes = lib.findLessonInUnit(unitRes.unit, 'Addition of 3-Digit Numbers with Carrying');
  assert.equal(lessonRes.ok, true);
  assert.match(lessonRes.lesson.lessonTitle, /Addition of 3-Digit/);

  const assumed = lib.findLessonInUnit(unitRes.unit, '');
  assert.equal(assumed.ok, true);
  assert.equal(assumed.assumed, true);
  assert.equal(assumed.lessonIndex, 0);

  const missing = lib.findLessonInUnit(unitRes.unit, 'Nonexistent Lesson Title XYZ');
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'lesson-not-in-unit');
});

test('escapeHtml neutralises markup', () => {
  assert.equal(lib.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(lib.escapeHtml('a & "b"'), 'a &amp; &quot;b&quot;');
  assert.equal(lib.escapeHtml(null), '');
});
