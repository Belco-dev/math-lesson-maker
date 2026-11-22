const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lib = require('../script.js');
const syllabus = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'syllabus.json'), 'utf8'));
lib.setSyllabus(syllabus);

test('splitSentences handles abbreviations, decimals and quotes without lookbehind', () => {
  const sentences = lib.splitSentences('Teacher asks learners to count by 100s up to 500 (100, 200, 300...). Teacher writes 345 on the chalkboard.');
  assert.ok(sentences.length >= 2);
  assert.match(sentences[0], /Teacher asks/);

  const pageRef = lib.splitSentences('Learners complete Exercise 1 in REB P1 Pupil\'s Book page 15: matching sets. Teacher checks notebooks.');
  assert.equal(pageRef.length, 2);

  const decimal = lib.splitSentences('The value is 1.5 units. Learners write it down.');
  assert.equal(decimal.length, 2);
  assert.match(decimal[0], /1\.5/);

  const quoted = lib.splitSentences("Teacher asks: 'How many sticks do we have in total?' Learners share ideas.");
  assert.equal(quoted.length, 2);
  assert.match(quoted[1], /Learners share/);

  assert.deepEqual(lib.splitSentences(''), []);
  assert.deepEqual(lib.splitSentences(null), []);
});

test('classifySentence distinguishes teacher, learner and task sentences', () => {
  assert.equal(lib.classifySentence('Teacher greets the class and sings a rhyme.'), 'teacher');
  assert.equal(lib.classifySentence('The teacher models counting on the table.'), 'teacher');
  assert.equal(lib.classifySentence('Learners work in small groups of 4 with counters.'), 'learner');
  assert.equal(lib.classifySentence('Selected learners come to the chalkboard to write numbers.'), 'learner');
  assert.equal(lib.classifySentence('In pairs, learners practice adding sets of counters.'), 'learner');
  assert.equal(lib.classifySentence('Worksheet: color all triangles green.'), 'learner');
  assert.equal(lib.classifySentence('Exercise: Classify a list of 10 fractions.'), 'learner');
  assert.equal(lib.classifySentence('Short oral and written assessment: 5 simple addition problems.'), 'learner');
  assert.equal(lib.classifySentence('Greet the class and check attendance.'), 'teacher');
});

test('toHyphenBullets dedupes and formats', () => {
  const out = lib.toHyphenBullets('- Greet the class\n- Greet the class', 'Sing a rhyme.');
  assert.match(out, /^- Greet the class\.$/m);
  assert.match(out, /^- Sing a rhyme\.$/m);
  assert.equal(lib.toHyphenBullets(''), '');
});

test('extractActivities populates teacher column for worksheet-only stages', () => {
  const res = lib.extractActivities([{ activity: 'Worksheet: color all triangles green, circles red.' }]);
  assert.match(res.learner, /Worksheet/);
  assert.match(res.teacher, /Teacher administers/);
});

test('parseGcCci maps Peace alias and splits explanation', () => {
  const peace = lib.parseGcCci('Peace - Cooperative learning in groups');
  assert.equal(peace.cci, 'Peace and Values Education');
  assert.equal(peace.explanation, 'Cooperative learning in groups');

  const full = lib.parseGcCci('Peace and Values Education - Respectful sharing');
  assert.equal(full.cci, 'Peace and Values Education');

  const gc = lib.parseGcCci('Critical Thinking - Learners analyse patterns');
  assert.equal(gc.gc, 'Critical Thinking');
  assert.equal(gc.explanation, 'Learners analyse patterns');

  assert.deepEqual(lib.parseGcCci(''), { gc: '', cci: '', explanation: '' });
});

test('formatGcciCell combines dropdowns with note instead of hiding them', () => {
  const cell = lib.formatGcciCell('Critical Thinking', 'Gender', 'Equal participation');
  assert.match(cell, /G\.C: Critical Thinking/);
  assert.match(cell, /C\.C\.I: Gender/);
  assert.match(cell, /Equal participation/);

  // Changing the dropdown must change the cell even when a note exists.
  const changed = lib.formatGcciCell('Problem Solving', 'Environment', 'Equal participation');
  assert.match(changed, /G\.C: Problem Solving/);
  assert.match(changed, /C\.C\.I: Environment/);
  assert.notEqual(cell, changed);
});

test('defaultStageTimings sums to the requested duration', () => {
  const t = lib.defaultStageTimings(40);
  assert.equal(t.step1, '5 minutes');
  assert.equal(t.step2, '25 minutes');
  assert.equal(t.step3, '10 minutes');
  const t2 = lib.defaultStageTimings(60);
  const total = ['step1', 'step2', 'step3'].reduce((sum, k) => sum + parseInt(t2[k], 10), 0);
  assert.equal(total, 60);
});

test('transcribeLessonFromBooks maps 6 steps to 3 rows correctly', () => {
  const p3 = syllabus.P3.units[0];
  const lesson = p3.lessons[1]; // Addition of 3-Digit Numbers with Carrying
  const books = lib.getYearBooks('P3');
  const result = lib.transcribeLessonFromBooks('P3', p3, lesson, books, { duration: '40', planLocation: 'P3 Classroom' });
  assert.ok(result);
  assert.equal(result.unitNo, 'Unit 1');
  assert.equal(result.lessonNo, 'Lesson 2');
  // Introduction (steps[0]) -> step1
  assert.match(result.step1_teacher, /Teacher writes a review problem/);
  // Development (steps[1..2]) -> step2, must NOT contain the Conclusion step
  assert.match(result.step2_teacher, /Teacher introduces a problem requiring regrouping/);
  assert.match(result.step2_learner, /Learners practice in pairs/);
  // Conclusion (steps[3]) -> step3, must contain the demo sentence
  assert.match(result.step3_teacher, /Teacher selects two pairs to demonstrate/);
  // Evaluation + homework (steps[4..5]) also land in step3
  assert.match(result.step3_learner, /Individual written evaluation/);
  // CCI from steps[3] (Peace) must map to the canonical dropdown value
  assert.equal(result.step3_cci, 'Peace and Values Education');
  // Notes carry explanations from all mapped steps
  assert.match(result.step2_note, /Step-by-step problem solving/);
  assert.match(result.step2_note, /Cooperative learning without pressure/);
  assert.match(result.step3_note, /Respectful presentation and listening/);
  assert.match(result.step3_note, /Equal assessment opportunities/);
});

test('transcribeLessonFromBooks never returns stale unit/lesson numbers', () => {
  const p4 = syllabus.P4.units[1];
  const lesson = p4.lessons[0];
  const books = lib.getYearBooks('P4');
  // Even if headers carry stale values, the matched unit/lesson must win.
  const result = lib.transcribeLessonFromBooks('P4', p4, lesson, books, { duration: '40', unitNo: 'Unit 1', lessonNo: 'Lesson 1', planLocation: 'P4 Classroom' });
  assert.equal(result.unitNo, 'Unit 5');
  assert.equal(result.lessonNo, 'Lesson 1');
});

test('extractJsonFromText handles fenced and raw JSON', () => {
  assert.deepEqual(lib.extractJsonFromText('{"a":1}'), { a: 1 });
  assert.deepEqual(lib.extractJsonFromText('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(lib.extractJsonFromText('Here is your plan: {"a":1} done'), { a: 1 });
  assert.equal(lib.extractJsonFromText('no json here'), null);
});

test('resolvePlanLocation resets stale class-prefixed locations', () => {
  assert.equal(lib.resolvePlanLocation('P5', 'P3 Classroom / Math Learning Corner'), 'P5 Classroom / Math Learning Corner');
  assert.equal(lib.resolvePlanLocation('P5', 'P5 Classroom / Math Learning Corner'), 'P5 Classroom / Math Learning Corner');
  assert.equal(lib.resolvePlanLocation('P5', 'Outdoor area'), 'Outdoor area');
  assert.equal(lib.resolvePlanLocation('P5', ''), 'P5 Classroom / Math Learning Corner');
});
