const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lib = require('../script.js');
const syllabus = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'syllabus.json'), 'utf8'));

const EXPECTED_CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

test('syllabus.json covers P1–P6 with units and lessons', () => {
  for (const cls of EXPECTED_CLASSES) {
    assert.ok(syllabus[cls], `missing class ${cls}`);
    assert.ok(Array.isArray(syllabus[cls].units), `${cls} units must be an array`);
    assert.ok(syllabus[cls].units.length > 0, `${cls} must have at least one unit`);
    for (const unit of syllabus[cls].units) {
      assert.ok(unit.unitNo, `${cls} unit missing unitNo`);
      assert.ok(unit.unitTitle, `${cls} ${unit.unitNo} missing unitTitle`);
      assert.ok(unit.keyUnitCompetence, `${cls} ${unit.unitNo} missing keyUnitCompetence`);
      assert.ok(Array.isArray(unit.lessons) && unit.lessons.length > 0, `${cls} ${unit.unitNo} must have lessons`);
      for (const lesson of unit.lessons) {
        assert.ok(lesson.lessonNo, `${cls} ${unit.unitNo} lesson missing lessonNo`);
        assert.ok(lesson.lessonTitle, `${cls} ${unit.unitNo} ${lesson.lessonNo} missing lessonTitle`);
        assert.ok(lesson.instrObjective, `${cls} ${unit.unitNo} ${lesson.lessonNo} missing instrObjective`);
        assert.ok(lesson.materials, `${cls} ${unit.unitNo} ${lesson.lessonNo} missing materials`);
        assert.ok(lesson.references, `${cls} ${unit.unitNo} ${lesson.lessonNo} missing references`);
      }
    }
  }
});

test('every lesson uses the 6-step schema with valid G.C./C.C.I. labels', () => {
  for (const cls of EXPECTED_CLASSES) {
    for (const unit of syllabus[cls].units) {
      for (const lesson of unit.lessons) {
        const where = `${cls} ${unit.unitNo} ${lesson.lessonNo}`;
        assert.ok(Array.isArray(lesson.steps), `${where} missing steps array`);
        assert.equal(lesson.steps.length, 6, `${where} must have exactly 6 steps`);
        lesson.steps.forEach((step, i) => {
          assert.ok(step.activity && step.activity.trim().length > 0, `${where} step ${i} missing activity`);
          assert.ok(step.gcOrCci && step.gcOrCci.trim().length > 0, `${where} step ${i} missing gcOrCci`);
          const parsed = lib.parseGcCci(step.gcOrCci);
          const label = step.gcOrCci.split(' - ')[0].trim();
          const isGc = lib.REB_GC_LIST.includes(parsed.gc);
          const isCci = lib.REB_CCI_LIST.includes(parsed.cci);
          assert.ok(isGc || isCci, `${where} step ${i} label "${label}" is not a valid REB G.C./C.C.I.`);
          // Bare "Peace" must never appear — it must be canonicalised.
          assert.notEqual(label, 'Peace', `${where} step ${i} uses bare "Peace" instead of "Peace and Values Education"`);
        });
      }
    }
  }
});

test('transcribed plans always have teacher and learner activities per stage', () => {
  lib.setSyllabus(syllabus);
  for (const cls of EXPECTED_CLASSES) {
    for (const unit of syllabus[cls].units) {
      for (const lesson of unit.lessons) {
        const books = lib.getYearBooks(cls);
        const result = lib.transcribeLessonFromBooks(cls, unit, lesson, books, { duration: '40', planLocation: `${cls} Classroom` });
        const where = `${cls} ${unit.unitNo} ${lesson.lessonNo}`;
        assert.ok(result.step1_teacher.trim().length > 0, `${where} step1 teacher empty`);
        assert.ok(result.step1_learner.trim().length > 0, `${where} step1 learner empty`);
        assert.ok(result.step2_teacher.trim().length > 0, `${where} step2 teacher empty`);
        assert.ok(result.step2_learner.trim().length > 0, `${where} step2 learner empty`);
        assert.ok(result.step3_teacher.trim().length > 0, `${where} step3 teacher empty`);
        assert.ok(result.step3_learner.trim().length > 0, `${where} step3 learner empty`);
        // Every stage must carry a valid CCI (or GC) so the dropdown is populated.
        for (const i of [1, 2, 3]) {
          const gc = result[`step${i}_gc`];
          const cci = result[`step${i}_cci`];
          assert.ok(
            (gc && lib.REB_GC_LIST.includes(gc)) || (cci && lib.REB_CCI_LIST.includes(cci)),
            `${where} step${i} has no valid G.C./C.C.I. (gc="${gc}", cci="${cci}")`
          );
        }
      }
    }
  }
});
