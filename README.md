# math-lesson-maker
**Rwanda Competency-Based Curriculum (CBC) Primary Mathematics Lesson Plan Generator (P1–P6)**

A client-side web tool that helps Rwandan Primary School Mathematics teachers generate REB CBC lesson plans in the browser — no backend server required. The built-in mode transcribes lessons from the indexed curriculum in `syllabus.json`; an optional external AI provider can be connected with your own API key.

## Key Features

1. **Year-locked curriculum lookup (P1–P6):**
   - The generator reads **only the selected year's Teacher's Guide (TG) and Pupil's Book (PB)**. It never borrows a unit or lesson from another class's book.
   - Type a **Unit title**; the engine searches for it inside that year's TG/PB only.
   - When the unit is found, the engine then **indexes the Lesson title** you typed **inside that unit**.
   - If the unit is **not** in the indexed sample for that year, generation **stops** and the page **lists that year's indexed units** (with their lessons) so you can pick a real one. You can also choose **“Continue with custom titles”** to create an editable blank plan with your own titles (no book data is fabricated).
   - Number matching is strict, so `Whole Numbers up to 1,000` (P3) can never resolve to `Whole Numbers up to 100,000` (P4).
   - Units and lessons in the index are **clickable**, and the lookup boxes offer **autocomplete suggestions** for the selected year.
   - Sources are the official [REB e-Learning Mathematics Repository](https://elearning.reb.rw/course/index.php?categoryid=19) (Category ID 19).

2. **Built-in transcription + optional external AI:**
   - **Built-in mode (free, no key):** Deterministically transcribes the matched lesson from `syllabus.json` into the 3-row REB table (Introduction · Lesson development · Conclusion). It does **not** invent new book content.
   - **External AI (optional):** Connect your own API key for **OpenAI**, **Google Gemini**, **Anthropic Claude**, or **OpenRouter / custom OpenAI-compatible API** via the ⚙️ AI Settings drawer. The model is prompted with the matched unit/lesson only and its output is validated as JSON. If the external call fails (bad key, quota, CORS, timeout), the app **tells you why** and falls back to the built-in transcription.
   - API keys are stored **in this browser only** (session storage by default; “Remember on this device” opts into `localStorage`). Browser storage is **not encrypted** — do not use keys on shared computers.

3. **Standard Administrative Metadata with LocalStorage Persistence:**
   - Collects header metadata: School Name, Teacher's Name, Term (`Term 1`–`Term 3`), Date, Subject (`Mathematics`), Class (`P1`–`P6`), Unit No, Lesson No, Duration, **Number of students**, SEN Info, and Plan Location.
   - The roll is a single **Number of students** field — there is no boys/girls split anywhere in the form or the printed plan.
   - **Auto-saves reusable headers** (school, teacher, term, date, subject, class, duration, class size, SEN) to `localStorage`. `Unit No`, `Lesson No` and `Plan Location` are **lesson-specific** and are never persisted across lessons, so a new plan always shows the newly matched unit/lesson numbers.
   - Includes quick action controls (`💾 Save Header Defaults` and `🗑️ Clear Saved Headers`).

4. **3-row timed activities table (editable timings + hyphen bullets):**
   - **Introduction** (default ~5 mins): Warm-up, activating prior knowledge, checking attendance/homework.
   - **Lesson development** (default ~25 mins): Discovery, presentation, and exploitation of learners’ productions.
   - **Conclusion** (default ~10 mins): Recap, formative assessment, and homework.
   - Each stage timing is editable. Teacher and learner activities render as hyphen bullets.
   - The 6-step `syllabus.json` schema maps as: `steps[0]` → Introduction, `steps[1..2]` → Lesson development, `steps[3..5]` (Conclusion + Evaluation + Homework/Remediation) → Conclusion. G.C./C.C.I. dropdown edits always take effect in the preview/PDF.

5. **Instant A4 PDF Download & Browser Print:**
   - Generates official Basic Education Board (REB) A4 PDF lesson plans locally in the browser using a **vendored** `html2pdf.js` bundle (works offline, no CDN dependency).
   - Print and PDF both require the mandatory header fields; the header Cross-Cutting Issue is included in the printed plan.

## Curriculum coverage (honest scope)

`syllabus.json` currently indexes **12 units / 16 lessons** across P1–P6 (2 units per class). This is a **sample**, not the complete REB P1–P6 catalogue. Units not yet indexed will stop with a clear message listing what *is* indexed for that year, plus the option to continue with custom titles. To extend coverage, add units/lessons to `syllabus.json` following the schema below — no code changes needed.

### `syllabus.json` schema

```jsonc
{
  "P3": {
    "classLevel": "Primary 3 (P3)",
    "rebSourceUrl": "https://elearning.reb.rw/course/index.php?categoryid=19",
    "pupilBookTitle": "REB Primary Mathematics P3 Pupil's Book (PB)",
    "teacherGuideTitle": "REB Primary Mathematics P3 Teacher's Guide (TG)",
    "units": [
      {
        "unitNo": "Unit 1",
        "unitTitle": "Whole Numbers up to 1,000",
        "keyUnitCompetence": "…",
        "lessons": [
          {
            "lessonNo": "Lesson 1",
            "lessonTitle": "…",
            "instrObjective": "…",
            "materials": "…",
            "references": "…",
            "crossCutting": "Inclusive Education", // must be a canonical REB C.C.I.
            "steps": [ // exactly 6 steps
              { "activity": "Teacher … . Learners … .", "gcOrCci": "Inclusive Education - …" },
              { "activity": "…", "gcOrCci": "Peace and Values Education - …" },
              { "activity": "…", "gcOrCci": "Gender - …" },
              { "activity": "…", "gcOrCci": "Peace and Values Education - …" },
              { "activity": "…", "gcOrCci": "Gender - …" },
              { "activity": "…", "gcOrCci": "Inclusive Education - …" }
            ]
          }
        ]
      }
    ]
  }
}
```

Rules enforced by `npm test`:
- `gcOrCci` labels must be canonical REB names (`Peace and Values Education`, not bare `Peace`; see `REB_GC_LIST` / `REB_CCI_LIST` in `script.js`).
- Every lesson must have exactly 6 steps with non-empty `activity` and `gcOrCci`.
- Every transcribed stage must produce non-empty teacher **and** learner activities.

## Usage / Deployment

> **Do not open `index.html` directly via `file://`.** Browsers block `fetch('syllabus.json')` on `file://`, so the app silently falls back to a smaller embedded sample. Always serve the folder over HTTP:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
# or: npx serve .
```

1. Select your Class / Year (`P1`–`P6`) — this locks the generator to that year's Teacher's Guide and Pupil's Book.
2. Type the **Unit title** as it appears in that year's books (autocomplete helps), then the **Lesson title** inside that unit — or click a unit/lesson in the index.
3. Click **`✨ AI Generate Lesson Plan (from this year's TG & Pupil's Book only)`**.
4. Expand **`📖 Units available in the selected year's TG & Pupil's Book`** at any time to see exactly what that year contains.
5. Edit timings, activities and G.C./C.C.I. as needed, then **Download PDF** or **Print**.

## Development

```bash
npm test    # node:test unit + schema tests (zero dependencies)
npm run check  # syntax + JSON validation
```

Pure logic (lookup, sentence splitting, G.C./C.C.I. parsing, transcription) lives in `script.js` and is exported for Node tests via `module.exports` when required outside the browser. CI (`.github/workflows/ci.yml`) runs the same checks on every push/PR.

## Project layout

```
index.html      — single page app (form + printable preview)
script.js       — lookup engine, persistence, LLM calls, rendering, PDF export
styles.css      — all styles (single file)
syllabus.json   — indexed curriculum (12 units / 16 lessons)
vendor/         — vendored html2pdf.js bundle (offline PDF export)
test/           — node:test suites (lookup, activities, syllabus schema)
```
