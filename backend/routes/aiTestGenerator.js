const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticateWithBranch } = require('../middleware/branchAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { multerFileFilter } = require('../middleware/fileValidation');


// ─── Auto Migration: Create published_ai_tests table + update student_exams ───
const runAiTestMigration = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS published_ai_tests (
        id SERIAL PRIMARY KEY,
        schema_name VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        subject_name VARCHAR(100) NOT NULL,
        class_name VARCHAR(100) NOT NULL,
        term_number INTEGER NOT NULL,
        component_name VARCHAR(100) NOT NULL,
        total_marks INTEGER DEFAULT 0,
        time_limit INTEGER DEFAULT 0,
        excluded_students JSONB DEFAULT '[]'::jsonb,
        published_by VARCHAR(100),
        published_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ published_ai_tests table ready');

    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS student_name VARCHAR(255)`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS class_name VARCHAR(100)`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS bonus_marks NUMERIC(10,2) DEFAULT 0`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS component_marks JSONB DEFAULT '{}'::jsonb`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS schema_name VARCHAR(255)`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS table_name VARCHAR(255)`);
    // AI-generator submissions have no ai_exams / students row — these ids must be nullable
    await db.query(`ALTER TABLE student_exams ALTER COLUMN exam_id DROP NOT NULL`);
    await db.query(`ALTER TABLE student_exams ALTER COLUMN student_id DROP NOT NULL`);

    // ── Publish / student-exam features ──
    await db.query(`ALTER TABLE published_ai_tests ADD COLUMN IF NOT EXISTS password VARCHAR(20)`);
    await db.query(`ALTER TABLE published_ai_tests ADD COLUMN IF NOT EXISTS allowed_students JSONB DEFAULT NULL`);
    await db.query(`ALTER TABLE published_ai_tests ADD COLUMN IF NOT EXISTS practice BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE published_ai_tests ADD COLUMN IF NOT EXISTS result_delay_minutes INTEGER DEFAULT 30`);
    await db.query(`ALTER TABLE published_ai_tests ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    await db.query(`ALTER TABLE published_ai_tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS student_username VARCHAR(255)`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS result_available_at TIMESTAMP`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS violation_ended BOOLEAN DEFAULT false`);
    await db.query(`ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS published_id INTEGER`);

    // Per-test settings (5-digit password, practice flag) — shared by every question row of a test
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_test_settings (
        schema_name VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        password VARCHAR(20),
        practice BOOLEAN DEFAULT false,
        language VARCHAR(50) DEFAULT 'English',
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (schema_name, table_name)
      )
    `);
    await db.query(`ALTER TABLE ai_test_settings ADD COLUMN IF NOT EXISTS practice BOOLEAN DEFAULT false`);
    console.log('✅ published_ai_tests / ai_test_settings columns ready');
    console.log('✅ student_exams columns ready');
  } catch (e) {
    console.error('⚠️ AI test migration warning:', e.message);
  }
};
runAiTestMigration();

// ─── Entity Decoding ──────────────────────────────────────────────────────────
// AI output (and extracted books) often contain HTML entities like &#x2F; — decode them
const decodeEntities = (s) => String(s == null ? '' : s)
  .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => { try { const c = parseInt(h, 16); return c ? String.fromCodePoint(c) : m; } catch (e) { return m; } })
  .replace(/&#(\d+);/g, (m, d) => { try { const c = parseInt(d, 10); return c ? String.fromCodePoint(c) : m; } catch (e) { return m; } })
  .replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&apos;|&rsquo;|&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

const decodeDeep = (v) => {
  if (typeof v === 'string') return decodeEntities(v);
  if (Array.isArray(v)) return v.map(decodeDeep);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = decodeDeep(v[k]);
    return o;
  }
  return v;
};

// ─── Type Normalization ───────────────────────────────────────────────────────
const TYPE_ALIASES = {
  'mcq': 'mcq', 'multiple choice': 'mcq', 'multiplechoice': 'mcq', 'multiple choices': 'mcq',
  'true false': 'true_false', 'truefalse': 'true_false', 'true or false': 'true_false', 'tf': 'true_false',
  'matching': 'matching', 'match': 'matching',
  'fill in the blank': 'fill_blank', 'fill in blanks': 'fill_blank', 'fill in blank': 'fill_blank',
  'fill blank': 'fill_blank', 'fillblank': 'fill_blank',
  'short answer': 'short_answer', 'short answers': 'short_answer', 'shortanswer': 'short_answer',
  'essay': 'essay', 'essay open ended': 'essay', 'open ended': 'essay', 'open ended question': 'essay', 'openended': 'essay',
  'numeric': 'numeric', 'numerical': 'numeric', 'numeric computational': 'numeric',
  'transformation': 'transformation', 'transformation error correction': 'transformation', 'error correction': 'transformation'
};
const typeNormalize = (t) => {
  const raw = String(t == null ? '' : t).trim();
  const s = decodeEntities(raw).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (TYPE_ALIASES[s]) return TYPE_ALIASES[s];
  const noSpace = s.replace(/ /g, '');
  if (TYPE_ALIASES[noSpace]) return TYPE_ALIASES[noSpace];
  return raw || 'mcq';
};

// ─── Answer Comparison Helpers ────────────────────────────────────────────────
const cmpText = (v) => decodeEntities(String(v == null ? '' : v)).trim().toLowerCase().replace(/\s+/g, ' ');

const TF_TRUE = new Set(['true', 't', 'yes', 'y', '1', 'correct', 'right', 'እውነት', 'ውነት', 'صواب', 'صحيح', 'sax', 'dhugaa', 'haqiiqaa']);
const TF_FALSE = new Set(['false', 'f', 'no', 'n', '0', 'incorrect', 'wrong', 'ሐሰት', 'ሸጥ', 'خطأ', 'خاطئ', 'khalad', 'khaldan', 'soba']);

const toBoolValue = (v) => {
  const s = cmpText(v);
  if (TF_TRUE.has(s)) return true;
  if (TF_FALSE.has(s)) return false;
  return null;
};

// "A) 5", "B. cat", "ለ) 5" → the part after the option letter
const stripLetterPrefix = (v) => String(v == null ? '' : v).trim().replace(/^(?:[A-Za-z]|[ሀ-፿]{1,2})\s*[).:]\s*/u, '').trim();

const splitAlts = (v) => cmpText(v).split(/\s*(?:\||;|,|\/|\s+or\s+)\s*/).map(s => s.trim()).filter(Boolean);

// ─── Option Parsing / Normalization ───────────────────────────────────────────
// The model often writes MCQ options as "A) text | B) text", but set-builder
// notation like {x | x ∈ N} also contains "|". Split ONLY at option boundaries.
const startsOptionMarker = (s) => /^(?:[A-Za-z]|[ሀ-፿]{1,2})\s*[).:]\s*\S/.test(String(s || ''));

const splitOptionsText = (optText) => {
  const raw = String(optText || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  let parts = raw.split(/\s*\|\s*(?=(?:[A-Z]|[a-d])\s*[).:])/);   // "A) x | B) y"
  if (parts.length < 2) parts = raw.split(/\s*\|\s+/);              // plain "x | y"
  if (parts.length < 2) parts = raw.split(/\s+(?=(?:[A-Z]|[a-d])\s*[).:])/); // "A) x B) y"
  return parts.map(p => p.trim()).filter(Boolean);
};

// Re-join options that were split across lines ("A) {x" + "x ∈ N}"), then strip
// the "A)" style prefixes — the player letters the options itself.
const normalizeOptions = (opts) => {
  if (!Array.isArray(opts)) return [];
  const merged = [];
  for (const raw of opts) {
    const s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (!s) continue;
    if (merged.length && !startsOptionMarker(s)) merged[merged.length - 1] += ' ' + s;
    else merged.push(s);
  }
  return merged.map(stripLetterPrefix).filter(Boolean).slice(0, 10);
};

const similarity = (a, b) => {
  const s1 = cmpText(a), s2 = cmpText(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const set1 = new Set(s1), set2 = new Set(s2);
  let inter = 0;
  set1.forEach(c => { if (set2.has(c)) inter++; });
  return (2 * inter) / (set1.size + set2.size);
};

// Returns true when the question is usable. NEVER destroys a question on failure.
const fixQuestion = (q) => {
  if (q.type === 'mcq') {
    const opts = normalizeOptions(q.options);
    if (opts.length >= 2) q.options = opts;
    if (!q.options || q.options.length < 2) return false;
    if (!q.answer || String(q.answer).trim() === '') return false;
    const ansBare = cmpText(stripLetterPrefix(q.answer));
    let hit = q.options.find(o => cmpText(stripLetterPrefix(o)) === ansBare);
    if (!hit) hit = q.options.find(o => { const ob = cmpText(stripLetterPrefix(o)); return ob && ansBare && (ob.includes(ansBare) || ansBare.includes(ob)); });
    if (!hit) {
      let best = null, bestScore = 0;
      for (const o of q.options) {
        const sc = similarity(o, q.answer);
        if (sc > bestScore) { bestScore = sc; best = o; }
      }
      if (bestScore >= 0.75) hit = best;
    }
    if (hit) q.answer = String(hit).trim();
    return true;
  }
  if (q.type === 'true_false') {
    const b = toBoolValue(q.answer);
    if (b !== null) { q.answer = b ? 'True' : 'False'; return true; }
    return false;
  }
  if (q.type === 'fill_blank' || q.type === 'short_answer') {
    q.answer = String(q.answer == null ? '' : q.answer).trim();
    return q.answer.length > 0;
  }
  if (q.type === 'matching') {
    const left = Array.isArray(q.leftColumn) ? q.leftColumn.map(x => String(x)) : [];
    const right = Array.isArray(q.rightColumn) ? q.rightColumn.map(x => String(x)) : [];
    if (!left.length || left.length !== right.length) return false;
    const matches = Array.isArray(q.correctMatches) ? q.correctMatches : [];
    const valid = matches.filter(m => m && m.left != null && m.right != null && left.includes(String(m.left)) && right.includes(String(m.right)));
    if (!valid.length) return false;
    q.leftColumn = left;
    q.rightColumn = right;
    q.correctMatches = valid;
    return true;
  }
  return true; // essay / numeric / transformation — graded manually or numerically
};

// Matching = ONE question containing N pairs (not N separate questions)
const countExpectedQuestions = (list) => (list || []).reduce((s, q) => {
  const c = parseInt(q && q.count) || 0;
  return s + (q && q.type === 'matching' ? (c > 0 ? 1 : 0) : c);
}, 0);

// Drop unusable questions, repair answers/options, apply the matching spec
function sanitizeGenerated(questions, questionTypes, bonusArr) {
  const dropped = [];
  const kept = [];
  for (const q of questions) {
    q.type = typeNormalize(q.type);
    if (!fixQuestion(q)) {
      dropped.push(`Removed a ${getTypeLabel(q.type)} question whose answer did not match any option / was missing`);
      continue;
    }
    kept.push(q);
  }

  const matchSpec = [...(questionTypes || []), ...(bonusArr || [])]
    .find(x => x && x.type === 'matching' && (parseInt(x.count) || 0) > 0);
  if (matchSpec) {
    const wantPairs = parseInt(matchSpec.count) || 0;
    const per = parseInt(matchSpec.marksPerQuestion) || 1;
    const first = kept.find(q => q.type === 'matching');
    if (first) {
      const pairs = Array.isArray(first.correctMatches) ? first.correctMatches : [];
      if (wantPairs > 0 && pairs.length > wantPairs) {
        const use = pairs.slice(0, wantPairs);
        first.correctMatches = use;
        first.leftColumn = use.map(m => String(m.left));
        const rights = [];
        use.forEach(m => { const r = String(m.right); if (!rights.includes(r)) rights.push(r); });
        first.rightColumn = rights;
      }
      first.marks = wantPairs * per;
    }
  }
  return { questions: kept, dropped };
}


// ─── In-Memory Cache ──────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(body) {
  const { subjectName, className, termNumber, componentName, totalMarks, questionTypes, difficulty, language, topic, teacherNotes, bonusQuestions, timeLimit, materialText } = body;
  const materialHash = crypto.createHash('md5').update(String(materialText || '')).digest('hex').slice(0, 16);
  const hash = crypto.createHash('md5').update(JSON.stringify({ subjectName, className, termNumber, componentName, totalMarks, questionTypes, difficulty, language, topic, teacherNotes, bonusQuestions, timeLimit, materialHash })).digest('hex');
  return hash;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  // Evict oldest entries if cache exceeds 500 items
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

// ─── Hallucination Validation ─────────────────────────────────────────────────
function validateQuestions(questions, expectedTypes) {
  const errors = [];
  const validTypes = ['mcq', 'true_false', 'matching', 'fill_blank', 'short_answer', 'essay', 'numeric', 'transformation'];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    q.type = typeNormalize(q.type);

    // Type must be valid
    if (!validTypes.includes(q.type)) {
      errors.push(`Question ${i + 1}: Invalid type "${q.type}"`);
      continue;
    }

    // Question text required
    if (!q.question || q.question.length < 5) {
      errors.push(`Question ${i + 1}: Missing or too short question text`);
      continue;
    }

    // Marks must be positive
    if (!q.marks || q.marks < 1) {
      errors.push(`Question ${i + 1}: Invalid marks value`);
    }

    // MCQ must have options and answer must be one of them
    if (q.type === 'mcq') {
      if (!q.options || q.options.length < 2) {
        errors.push(`Question ${i + 1} (MCQ): Must have at least 2 options`);
      }
      if (q.answer && q.options && q.options.length) {
        const answerUpper = q.answer.toUpperCase().trim();
        const validOptions = q.options.map((o, idx) => String.fromCharCode(65 + idx));
        const startsWithValid = validOptions.some(v => answerUpper.startsWith(v));
        const matchesOption = q.options.some(o => cmpText(o).includes(cmpText(q.answer)) || cmpText(stripLetterPrefix(o)) === cmpText(stripLetterPrefix(q.answer)));
        if (!startsWithValid && !matchesOption) {
          errors.push(`Question ${i + 1} (MCQ): Answer "${q.answer}" doesn't match any option`);
        }
      }
    }

    // True/False must have valid answer (accepts True/False in English, Amharic, Arabic, Somali, Oromo)
    if (q.type === 'true_false') {
      if (q.answer && toBoolValue(q.answer) === null) {
        errors.push(`Question ${i + 1} (True/False): Answer must be True or False`);
      }
    }

    // Fill-blank must have an answer
    if (q.type === 'fill_blank' && !q.answer) {
      errors.push(`Question ${i + 1} (Fill-in-blank): Missing answer`);
    }

    // Short answer and essay must have an answer (single-character numeric answers are fine)
    if (q.type === 'short_answer' && (!q.answer || String(q.answer).trim().length < 1)) {
      errors.push(`Question ${i + 1} (short_answer): Missing answer`);
    }
    if (q.type === 'essay' && (!q.answer || String(q.answer).trim().length < 2)) {
      errors.push(`Question ${i + 1} (essay): Answer too short or missing`);
    }

    // Matching must have valid columns and matches
    if (q.type === 'matching') {
      const minItems = (q.marks || 1) >= 2 ? 2 : 1;
      if (!q.leftColumn || !Array.isArray(q.leftColumn) || q.leftColumn.length < minItems) {
        errors.push(`Question ${i + 1} (Matching): Must have at least ${minItems} left column item(s)`);
      }
      if (!q.rightColumn || !Array.isArray(q.rightColumn) || q.rightColumn.length < minItems) {
        errors.push(`Question ${i + 1} (Matching): Must have at least ${minItems} right column item(s)`);
      }
      if (q.leftColumn && q.rightColumn && q.leftColumn.length !== q.rightColumn.length) {
        errors.push(`Question ${i + 1} (Matching): Left and right columns must have same number of items`);
      }
      if (!q.correctMatches || !Array.isArray(q.correctMatches) || q.correctMatches.length === 0) {
        errors.push(`Question ${i + 1} (Matching): Missing correct matches`);
      } else if (q.leftColumn) {
        for (const m of q.correctMatches) {
          if (!q.leftColumn.includes(m.left)) {
            errors.push(`Question ${i + 1} (Matching): Match left "${m.left}" not found in left column`);
          }
          if (!q.rightColumn?.includes(m.right)) {
            errors.push(`Question ${i + 1} (Matching): Match right "${m.right}" not found in right column`);
          }
        }
      }
    }
  }

  return errors;
}

// ─── Prompt Builder with Hallucination Guardrails ─────────────────────────────
function buildPrompt({ subjectName, className, termNumber, componentName, totalMarks, questionTypes, difficulty, language, topic, bonusQuestions, teacherNotes, materialText }) {
  const gradeLevel = className.replace(/[^0-9]/g, '') || 'appropriate';
  
  let prompt = `You are an expert Ethiopian curriculum examiner. Generate an exam for the difficulty level(s) described below.`;

  prompt += `\n\nEXAM DETAILS:`;
  prompt += `\n- Subject: ${subjectName}`;
  prompt += `\n- Grade: ${gradeLevel}`;
  prompt += `\n- Term: ${termNumber}`;
  prompt += `\n- Component: ${componentName}`;
  prompt += `\n- Language: ${language}`;
  prompt += `\n- Total Marks: ${totalMarks}`;
  if (topic) prompt += `\n- Topic/Unit: ${topic}`;
  if (teacherNotes) prompt += `\n- About Exam (the teacher's instructions — follow them exactly): ${teacherNotes}`;
  if (materialText) {
    prompt += `\n\nSOURCE MATERIAL (the teacher's uploaded book/notes — generate questions FROM this material):`;
    prompt += `\n${materialText}`;
  }

  const bonusList = bonusQuestions ? (Array.isArray(bonusQuestions) ? bonusQuestions : [bonusQuestions]) : [];
  const bonusMarks = bonusList.reduce((s, b) => s + ((parseInt(b.count) || 0) * (parseInt(b.marksPerQuestion) || 0)), 0);
  const bonusCount = countExpectedQuestions(bonusList);
  const expectedCount = countExpectedQuestions(questionTypes) + bonusCount;
  const grandTotalMarks = (parseInt(totalMarks) || 0) + bonusMarks;

  prompt += `\n\nDIFFICULTY LEVELS (selected: ${difficulty || 'medium'}):`;
  prompt += `\n- Easy: direct recall, definitions, single-step "what is / which of these" questions`;
  prompt += `\n- Medium: two-step application, short word problems, comparing and explaining`;
  prompt += `\n- Hard: multi-step reasoning, analysis, proofs, complex word problems`;
  const diffList = String(difficulty || 'medium').split(',').map(d => d.trim()).filter(Boolean);
  prompt += diffList.length > 1
    ? `\n- Distribute the questions ROUGHLY EVENLY across these difficulty levels: ${diffList.join(', ')}`
    : `\n- EVERY question must match the "${diffList[0] || 'medium'}" level above`;
  prompt += `\n- Make sure each difficulty mix is visible: no more than half of the questions should be pure memorization`;

  prompt += `\n\nQUESTION DISTRIBUTION (REQUIRED questions must total exactly ${totalMarks} marks):`;
  for (const qt of questionTypes) {
    const c = parseInt(qt.count) || 0;
    const m = parseInt(qt.marksPerQuestion) || 1;
    if (qt.type === 'matching') {
      if (c > 0) prompt += `\n- Matching: EXACTLY ONE question containing ${c} pairs × ${m} mark each = ${c * m} marks total (NOT ${c} separate questions)`;
    } else {
      prompt += `\n- ${getTypeLabel(qt.type)}: ${c} questions × ${m} marks = ${c * m}`;
    }
  }
  if (bonusList.length) {
    prompt += `\n- BONUS QUESTIONS (EXTRA marks on top of the required ${totalMarks}):`;
    bonusList.forEach(b => {
      const c = parseInt(b.count) || 0;
      const m = parseInt(b.marksPerQuestion) || 1;
      if (b.type === 'matching') prompt += `\n  - Matching: ONE question with ${c} pairs × ${m} mark = ${c * m} marks`;
      else prompt += `\n  - ${getTypeLabel(b.type)}: ${c} questions × ${m} marks = ${c * m}`;
    });
    prompt += `\n- BONUS TOTAL: ${bonusMarks} marks (extra) — grand total of the test = ${grandTotalMarks} marks`;
    prompt += `\n- Put ALL bonus questions AFTER the required questions, clearly separated`;
  }

  prompt += `\n\nEXACT OUTPUT REQUIREMENTS (MANDATORY):`;
  prompt += `\n- You MUST output EXACTLY ${expectedCount} questions in total (${grandTotalMarks} marks). This is not optional.`;
  prompt += `\n- Count your questions before finishing. If you have produced fewer than ${expectedCount}, CONTINUE generating until you reach ${expectedCount}.`;
  prompt += `\n- NEVER stop early, NEVER summarize, NEVER apologize, NEVER add comments between questions.`;
  prompt += `\n- Output ONLY [QUESTION_START] ... [QUESTION_END] blocks. No preamble, no greetings, no markdown, no code fences, no closing text.`;

  prompt += `\n\nETHIOPIAN CURRICULUM REQUIREMENTS:`;
  prompt += `\n- Questions must be appropriate for Grade ${gradeLevel} Ethiopian students`;
  prompt += `\n- Use local context (Ethiopian examples, names, places)`;
  prompt += `\n- Follow the Ethiopian Ministry of Education curriculum standards`;
  prompt += `\n- DO NOT make up facts — only include accurate information`;
  prompt += `\n- If unsure about an answer, clearly state "based on the curriculum"`;

  prompt += `\nFORMAT each question EXACTLY:`;
  prompt += `\n[QUESTION_START]`;
  prompt += `\nTYPE: [question type from the list above]`;
  prompt += `\nMARKS: [number]`;
  prompt += `\nQUESTION: [clear question text appropriate for Grade ${gradeLevel}]`;
  prompt += `\nOPTIONS: [for MCQ: A) option1 | B) option2 | C) option3 | D) option4 — write EVERYTHING on ONE single line, never break an option across lines]`;
  prompt += `\nANSWER: [correct answer - must be accurate]`;
  prompt += `\nEXPLANATION: [brief explanation of the correct answer]`;
  prompt += `\n[QUESTION_END]`;

  prompt += `\n\nMATCHING QUESTIONS ONLY: Use this format instead:`;
  prompt += `\n[QUESTION_START]`;
  prompt += `\nTYPE: matching`;
  prompt += `\nMARKS: [TOTAL marks of this one question = number of pairs × marks per pair]`;
  prompt += `\nQUESTION: [instructions like "Match each item in Column A with the correct item in Column B"]`;
  prompt += `\nLEFT_COLUMN: ["item1", "item2", "item3"]`;
  prompt += `\nRIGHT_COLUMN: ["optionA", "optionB", "optionC"]`;
  prompt += `\nCORRECT_MATCHES: [{"left":"item1","right":"optionA"}, {"left":"item2","right":"optionB"}, {"left":"item3","right":"optionC"}]`;
  prompt += `\nEXPLANATION: [brief explanation]`;
  prompt += `\n[QUESTION_END]`;
  prompt += `\nLEFT_COLUMN, RIGHT_COLUMN, and CORRECT_MATCHES must be valid JSON arrays. Same number of items in both columns. Each item in LEFT_COLUMN must appear exactly once in CORRECT_MATCHES.left.`;

  prompt += `\n\nCRITICAL LANGUAGE RULES:`;
  prompt += `\n1. The test language is ${language}. Write ALL question text, options, answers, and explanations ENTIRELY in ${language}.`;
  prompt += `\n2. The Teacher Notes / uploaded material may be written in ANY language (Amharic, Somali, Arabic, Oromo, Afaan Oromoo, English, or any other language). Understand them no matter which language they are written in and use their content.`;
  prompt += `\n3. If the Teacher Notes or source material are in a DIFFERENT language than ${language}, you MUST translate the content into ${language} for the test. NEVER copy the notes' language into the test.`;
  prompt += `\n4. Follow any targeting instructions in the Teacher Notes (e.g., generate from a specific unit, chapter, or topic — even if written in another language such as Somali or Amharic). If SOURCE MATERIAL is provided, base ALL questions on it and use the Teacher Notes to know which part of the material to use (unit/chapter/topic).`;
  prompt += `\n5. Use the native script of the test language (e.g. Amharic script for Amharic, Arabic script for Arabic). Never transliterate into Latin letters.`;

  prompt += `\n\nTEXT RULES (MANDATORY):`;
  prompt += `\n1. Write plain text only. NEVER output HTML entities such as &#x2F; or &amp; or &lt; — write the real characters instead (e.g. write 1/2 not 1&#x2F;2).`;
  prompt += `\n2. Write fractions like 1/2, decimals like 0.5, and ratios with ordinary keyboard characters.`;
  prompt += `\n3. No markdown formatting (**bold**, #, tables, code blocks) anywhere in questions, options, answers or explanations.`;
  prompt += `\n4. The ANSWER of a True/False question must be written exactly as "True" or "False" (English words) — even when the test language is not English. Do NOT translate True/False into the test language.`;
  prompt += `\n5. For MCQ, write the ANSWER as the FULL TEXT of the correct option (the very same characters as in OPTIONS) — never a bare letter like "B".`;

  prompt += `\n\nCRITICAL RULES:`;
  prompt += `\n1. The answer MUST be definitively correct — no ambiguity`;
  prompt += `\n2. For MCQ, the answer MUST be one of the provided options`;
  prompt += `\n3. Total marks of all REQUIRED questions must equal exactly ${totalMarks}. Bonus questions (if any) are EXTRA marks on top of ${totalMarks} and must be placed AFTER all required questions`;
  prompt += `\n4. Mix question types, don't group them`;
  prompt += `\n5. Each question MUST have a clear, unambiguous answer`;
  prompt += `\n6. Questions must test understanding, not just memorization`;
  prompt += `\n7. Use Ethiopian context (Birr, Ethiopian geography, history, etc.) where appropriate`;

  return prompt;
}

function getTypeLabel(type) {
  const labels = {
    'mcq': 'Multiple Choice',
    'true_false': 'True/False',
    'matching': 'Matching',
    'numeric': 'Numeric/Computational',
    'fill_blank': 'Fill-in-the-Blank',
    'short_answer': 'Short Answer',
    'essay': 'Essay / Open-Ended',
    'transformation': 'Transformation / Error Correction'
  };
  return labels[type] || type;
}

// ─── Question Parser ──────────────────────────────────────────────────────────
function parseGeneratedQuestions(text) {
  const questions = [];
  const blocks = text.split('[QUESTION_START]');
  
  for (const block of blocks) {
    if (!block.includes('[QUESTION_END]')) continue;
    const content = block.split('[QUESTION_END]')[0].trim();
    if (!content) continue;
    
    const typeMatch = content.match(/TYPE:\s*(.+)/i);
    const marksMatch = content.match(/MARKS:\s*(\d+)/i);
    
    // Extract question text (everything between QUESTION: and OPTIONS:|ANSWER:|EXPLANATION:|end)
    const questionMatch = content.match(/QUESTION:\s*(.+?)(?:\nOPTIONS:|\nANSWER:|\nEXPLANATION:|$)/is);
    if (!questionMatch) continue;
    
    const optionsMatch = content.match(/OPTIONS:\s*(.+?)(?:\nANSWER:|$)/is);
    const answerMatch = content.match(/ANSWER:\s*(.+?)(?:\nEXPLANATION:|$)/is);
    const explanationMatch = content.match(/EXPLANATION:\s*(.+)/is);
    
    // Matching-specific fields
    const leftColMatch = content.match(/LEFT_COLUMN:\s*(\[.+?\])\s*(?:\nRIGHT_COLUMN:|\nCORRECT_MATCHES:|\nEXPLANATION:|\[QUESTION_END\]|$)/is);
    const rightColMatch = content.match(/RIGHT_COLUMN:\s*(\[.+?\])\s*(?:\nCORRECT_MATCHES:|\nEXPLANATION:|\[QUESTION_END\]|$)/is);
    const correctMatchMatch = content.match(/CORRECT_MATCHES:\s*(\[.+?\])\s*(?:\nEXPLANATION:|\[QUESTION_END\]|$)/is);
    
    const type = (typeMatch?.[1] || 'mcq').trim().toLowerCase();
    const marks = parseInt(marksMatch?.[1]) || 1;
    
    let options = [];
    if (optionsMatch) {
      options = splitOptionsText(optionsMatch[1]);
    }
    
    // Clean question text - remove markdown and matching JSON artifacts
    let questionText = questionMatch[1].trim().replace(/^\*\*|\*\*$/g, '');
    questionText = questionText.replace(/LEFT_COLUMN:\s*\[.+?\]\s*/is, '').replace(/RIGHT_COLUMN:\s*\[.+?\]\s*/is, '').replace(/CORRECT_MATCHES:\s*\[.+?\]\s*/is, '').trim();
    
    // Parse matching fields
    let leftColumn, rightColumn, correctMatches;
    try { leftColumn = leftColMatch ? JSON.parse(leftColMatch[1]) : undefined; } catch(e) {}
    try { rightColumn = rightColMatch ? JSON.parse(rightColMatch[1]) : undefined; } catch(e) {}
    try { correctMatches = correctMatchMatch ? JSON.parse(correctMatchMatch[1]) : undefined; } catch(e) {}
    
    const q = {
      type,
      marks,
      question: questionText,
      options,
      answer: answerMatch?.[1]?.trim() || '',
      explanation: explanationMatch?.[1]?.trim() || '',
    };
    if (leftColumn) q.leftColumn = leftColumn;
    if (rightColumn) q.rightColumn = rightColumn;
    if (correctMatches) q.correctMatches = correctMatches;
    questions.push(decodeDeep(q));
    questions[questions.length - 1].type = typeNormalize(type);
  }
  
  return questions;
}

function getQuestionTypeCounts(questions) {
  const counts = {};
  for (const q of questions) {
    counts[q.type] = (counts[q.type] || 0) + 1;
  }
  return counts;
}

// Partial credit for matching: each pair is worth marks / totalPairs
function matchingPairsScore(q, studentAnswer) {
  const pairs = Array.isArray(q.correctMatches) ? q.correctMatches : [];
  if (!pairs.length) return { matched: 0, total: 0 };
  const given = (studentAnswer && typeof studentAnswer === 'object') ? studentAnswer : {};
  const givenByNorm = {};
  Object.keys(given).forEach(k => { givenByNorm[cmpText(k)] = given[k]; });
  let matched = 0;
  for (const p of pairs) {
    const chosen = given[p.left] !== undefined ? given[p.left] : givenByNorm[cmpText(p.left)];
    if (chosen !== undefined && chosen !== null && String(chosen).trim() !== '' && cmpText(chosen) === cmpText(p.right)) matched++;
  }
  return { matched, total: pairs.length };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/ai/generate-test — Generate test questions with caching

// Upload an image for a question or an answer option.
const QUESTION_IMAGE_DIR = path.join(__dirname, '..', 'Uploads', 'ai-test-images');
if (!fs.existsSync(QUESTION_IMAGE_DIR)) fs.mkdirSync(QUESTION_IMAGE_DIR, { recursive: true });
const questionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, QUESTION_IMAGE_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    cb(null, `question-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const questionImageUpload = multer({
  storage: questionImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: multerFileFilter
}).single('image');

router.post('/upload-question-image', (req, res) => {
  questionImageUpload(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 10MB)' : (err.message || 'Upload failed');
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({
      success: true,
      url: `/Uploads/ai-test-images/${req.file.filename}`,
      filename: req.file.filename
    });
  });
});

router.post('/generate-test', async (req, res) => {
  const {
    subjectName, className, termNumber, componentName,
    totalMarks, questionTypes, difficulty, language,
    topic, bonusQuestions, timeLimit, teacherNotes, materialText
  } = req.body;

  if (!subjectName || !className || !termNumber || !componentName || !totalMarks || !questionTypes) {
    console.log('❌ generate-test 400 — MISSING FIELDS:', JSON.stringify({ subjectName: !!subjectName, className: !!className, termNumber: !!termNumber, componentName: !!componentName, totalMarks: !!totalMarks, questionTypes: !!questionTypes, bodyKeys: typeof req.body === 'object' ? Object.keys(req.body) : typeof req.body }));
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check cache first
  const cacheKey = getCacheKey(req.body);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('📦 Returning cached test result');
    return res.json({ ...cached, fromCache: true });
  }

  try {
    // Cap huge uploaded books so the prompt always fits inside the model context
    const MAX_MATERIAL_CHARS = 60000;
    let material = String(materialText || '');
    if (material.length > MAX_MATERIAL_CHARS) {
      material = material.slice(0, MAX_MATERIAL_CHARS) + `\n[NOTE: source material was truncated to its first ${MAX_MATERIAL_CHARS} characters — write questions from this part only]`;
    }

    const bonusArr = bonusQuestions ? (Array.isArray(bonusQuestions) ? bonusQuestions : [bonusQuestions]) : [];
    const expectedCount = countExpectedQuestions(questionTypes) + countExpectedQuestions(bonusArr);
    const expectedMarks = (parseInt(totalMarks) || 0) + bonusArr.reduce((s, b) => s + ((parseInt(b.count) || 0) * (parseInt(b.marksPerQuestion) || 0)), 0);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI API key not configured. Set DEEPSEEK_API_KEY in .env' });
    }

    const model = 'deepseek-v4-pro';

    const callAI = async (extraInstruction) => {
      const prompt = buildPrompt({
        subjectName, className, termNumber, componentName,
        totalMarks, questionTypes, difficulty: difficulty || 'medium',
        language: language || 'English',
        topic: topic || '',
        bonusQuestions: bonusQuestions || null,
        teacherNotes: teacherNotes || '',
        materialText: material
      }) + (extraInstruction || '');

      const started = Date.now();
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "You are an expert Ethiopian curriculum examiner. Generate accurate, curriculum-aligned exam questions. Never make up facts. Follow the requested output format and the requested number of questions EXACTLY." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3, // Lower temperature = less hallucination
          max_tokens: 32000,
          stream: false,
          thinking: { type: "enabled" },
          reasoning_effort: "high"
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('DeepSeek API error:', errorData.slice(0, 800));
        const err = new Error('AI_UNAVAILABLE');
        err.status = 502;
        throw err;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const finish = data?.choices?.[0]?.finish_reason || '';
      console.log(`⚡ generate-test: ${Date.now() - started}ms | finish=${finish} | chars=${text.length} | want=${expectedCount}q/${expectedMarks}m | lang=${language || 'English'} | material=${material.length}c`);
      return { text, finish };
    };

    let generatedText = '', finish = '', questions = [], errors = [];
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const extra = attempt === 1 ? '' : `\n\nSECOND ATTEMPT — CRITICAL: the required test is ${expectedCount} questions (${expectedMarks} marks) and your previous answer was incomplete. Output ALL ${expectedCount} questions from the beginning. ONLY [QUESTION_START]...[QUESTION_END] blocks — no thinking, no preamble, no summary.`;
      const out = await callAI(extra);
      generatedText = out.text;
      finish = out.finish;
      const san = sanitizeGenerated(parseGeneratedQuestions(generatedText), questionTypes, bonusArr);
      questions = san.questions;
      errors = [...san.dropped, ...validateQuestions(questions, questionTypes)];
      const gotMarks = questions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
      if (questions.length >= expectedCount && gotMarks >= expectedMarks) break;
    }

    if (questions.length === 0) {
      return res.status(422).json({
        error: 'AI returned no valid questions. Please try again with different settings.',
        rawText: generatedText
      });
    }

    const gotMarks = questions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
    const warnings = [...errors];
    if (questions.length < expectedCount || gotMarks < expectedMarks) {
      warnings.unshift(`The AI produced ${questions.length} of ${expectedCount} questions (${gotMarks} of ${expectedMarks} marks)${finish === 'length' ? ' because the answer was cut off' : ''} — press Regenerate to retry.`);
    }

    const result = {
      success: true,
      questions,
      rawText: generatedText,
      stats: { total: questions.length, ...getQuestionTypeCounts(questions) },
      warnings: warnings.length > 0 ? warnings : undefined
    };

    // Cache only complete results, so Regenerate can actually retry
    if (questions.length >= expectedCount && gotMarks >= expectedMarks) setCache(cacheKey, result);

    res.json(result);

  } catch (error) {
    if (error && error.status === 502) {
      return res.status(502).json({ error: 'AI service temporarily unavailable. Please try again in a moment.' });
    }
    console.error('AI test generation error:', error);
    res.status(500).json({ error: 'Failed to generate test: ' + error.message });
  }
});

// ─── Test password / scramble / mark-list helpers ─────────────────────────────
const randomTestPassword = () => String(crypto.randomInt(10000, 100000));

const hashSeed = (s) => {
  let h = 2166136261 >>> 0;
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
const mulberry32 = (a) => () => {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const seededShuffle = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const letterIndexOf = (v) => {
  const s = String(v == null ? '' : v).trim();
  if (/^[a-d]$/i.test(s)) return s.toLowerCase().charCodeAt(0) - 97;
  const m = /^([a-d])[).:]/i.exec(s);
  return m ? m[1].toLowerCase().charCodeAt(0) - 97 : -1;
};

// Per-student scramble: same questions, never the same order (and shuffled options).
// Deterministic for a given student so re-entry shows the same arrangement.
const scrambleQuestionRows = (rows, seedKey) => {
  const rnd = mulberry32(hashSeed(seedKey));
  const scrambled = rows.map((raw) => {
    const d = { ...(raw.question_data || {}) };
    const type = raw.question_type;
    if (type === 'mcq' && Array.isArray(d.options) && d.options.length > 1) {
      const li = letterIndexOf(d.answer);
      const answerText = (li >= 0 && d.options[li] != null) ? String(d.options[li]) : String(d.answer == null ? '' : d.answer);
      d.options = seededShuffle(d.options.map((o) => String(o)), rnd);
      d.answer = answerText;
      delete d.correctIndex;
    } else if (type === 'true_false') {
      if (rnd() < 0.5) { /* keep True/False order stable-ish; nothing to scramble */ }
    } else if (type === 'matching') {
      if (Array.isArray(d.leftColumn)) d.leftColumn = seededShuffle([...d.leftColumn], rnd);
      if (Array.isArray(d.rightColumn)) d.rightColumn = seededShuffle([...d.rightColumn], rnd);
    }
    return { ...raw, question_data: d };
  });
  return seededShuffle(scrambled, rnd);
};

// Hide answers from the student payload (grading happens server-side on submit)
const stripAnswersForStudent = (rows) => rows.map((raw) => {
  const d = { ...(raw.question_data || {}) };
  delete d.answer;
  delete d.correctAnswer;
  delete d.correctMatches;
  delete d.correctIndex;
  delete d.explanation;
  return {
    id: raw.id,
    type: d.type || raw.question_type,
    question: d.question || '',
    options: d.options || null,
    leftColumn: d.leftColumn || null,
    rightColumn: d.rightColumn || null,
    marks: raw.marks || d.marks || 1
  };
});

const normKey = (s) => String(s == null ? '' : s).toLowerCase().replace(/[\s\-.]+/g, '_');

// Write one student's AI-test mark into the mark list
// (subject_<subject>_schema.<class>_term_<n>, component column = the mark actually obtained)
const saveMarkToMarkList = async ({ subjectName, className, termNumber, componentName, studentName, obtained, totalMarks }) => {
  if (!subjectName || !className || !termNumber || !componentName || !studentName) return { saved: false, reason: 'missing fields' };
  const schemaName = `subject_${normKey(subjectName)}_schema`;
  const tableName = `${normKey(className)}_term_${parseInt(termNumber, 10)}`;
  try {
    const exists = await db.query(`SELECT to_regclass($1) AS t`, [`${schemaName}.${tableName}`]);
    if (!exists.rows[0] || !exists.rows[0].t) return { saved: false, reason: 'mark list table not found' };

    const cfgRes = await db.query(
      `SELECT mark_components, pass_threshold FROM ${schemaName}.form_config WHERE class_name ILIKE $1 AND term_number = $2`,
      [className, parseInt(termNumber, 10)]
    );
    if (!cfgRes.rows.length) return { saved: false, reason: 'mark form not configured' };
    const comps = cfgRes.rows[0].mark_components || [];
    const key = normKey(componentName);
    const comp = comps.find((c) => normKey(c.name) === key)
      || comps.find((c) => normKey(c.name).includes(key) || key.includes(normKey(c.name)));
    if (!comp) return { saved: false, reason: `component "${componentName}" is not part of this mark list` };

    const max = parseFloat(comp.percentage) || 0;
    // Save the mark the student obtained (7.00 for 7/12) — NOT a percentage-scaled
    // average (7/12 * 10 = 5.83). Capped at the column's own maximum so Total
    // (sum of the component columns) can never exceed 100.
    const score = Math.min(max, Math.round(Math.max(0, obtained) * 100) / 100);
    const col = normKey(comp.name);

    const stuRes = await db.query(
      `SELECT id FROM ${schemaName}.${tableName} WHERE LOWER(TRIM(student_name)) = LOWER(TRIM($1)) LIMIT 1`,
      [studentName]
    );
    if (!stuRes.rows.length) return { saved: false, reason: `student "${studentName}" is not on the mark list` };
    const rowId = stuRes.rows[0].id;

    await db.query(`UPDATE ${schemaName}.${tableName} SET "${col}" = $1, updated_at = NOW() WHERE id = $2`, [score, rowId]);

    const threshold = parseFloat(cfgRes.rows[0].pass_threshold) || 50;
    const cols = comps.map((c) => normKey(c.name));
    let totalScore = score;
    let passStatus = score >= threshold ? 'Pass' : 'Fail';
    try {
      const sumExpr = cols.map((c) => `COALESCE("${c}",0)`).join(' + ');
      const upRes = await db.query(
        `UPDATE ${schemaName}.${tableName} SET total = (${sumExpr}), pass_status = CASE WHEN (${sumExpr}) >= $1 THEN 'Pass' ELSE 'Fail' END, updated_at = NOW() WHERE id = $2 RETURNING total, pass_status`,
        [threshold, rowId]
      );
      if (upRes.rows.length) {
        totalScore = parseFloat(upRes.rows[0].total) || score;
        passStatus = upRes.rows[0].pass_status || passStatus;
      }
    } catch (e) { console.log('⚠️ total recompute skipped:', e.message); }

    // Send push notification to guardian in background
    (async () => {
      try {
        let guardianUsername = null;
        let actualStudentName = studentName;

        // 1. Try class table first
        try {
          const sanitizedClass = String(className).replace(/[^a-zA-Z0-9_]/g, '');
          const ctRes = await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' AND LOWER(table_name) = LOWER($1)`,
            [sanitizedClass]
          );
          if (ctRes.rows.length) {
            const gRes = await db.query(
              `SELECT student_name, guardian_username FROM classes_schema."${ctRes.rows[0].table_name}" 
               WHERE LOWER(TRIM(student_name)) = LOWER(TRIM($1)) 
                 AND guardian_username IS NOT NULL AND guardian_username != '' LIMIT 1`,
              [studentName]
            );
            if (gRes.rows.length && gRes.rows[0].guardian_username) {
              guardianUsername = gRes.rows[0].guardian_username;
              if (gRes.rows[0].student_name) actualStudentName = gRes.rows[0].student_name;
            }
          }
        } catch (_) {}

        // 2. Fallback: search all class tables
        if (!guardianUsername) {
          const allTables = (await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`
          )).rows;
          for (const tbl of allTables) {
            const gRes = await db.query(
              `SELECT student_name, guardian_username FROM classes_schema."${tbl.table_name}" 
               WHERE LOWER(TRIM(student_name)) = LOWER(TRIM($1)) 
                 AND guardian_username IS NOT NULL AND guardian_username != '' LIMIT 1`,
              [studentName]
            );
            if (gRes.rows.length && gRes.rows[0].guardian_username) {
              guardianUsername = gRes.rows[0].guardian_username;
              if (gRes.rows[0].student_name) actualStudentName = gRes.rows[0].student_name;
              break;
            }
          }
        }

        if (guardianUsername) {
          const { notifyGuardianPush } = require('../services/guardianPush');
          notifyGuardianPush(
            guardianUsername,
            'Exam Marks Published',
            `${actualStudentName}'s score for ${subjectName} (${comp.name}) is ${score}/${max} (Total: ${totalScore}% - ${passStatus}).`,
            {
              type: 'marks',
              studentName: actualStudentName,
              subject: subjectName,
              term: String(termNumber),
              score: String(totalScore),
              status: passStatus
            }
          ).catch(e => console.warn('AI exam mark push error:', e.message));
          console.log(`[AI Exam] Push notification sent to guardian ${guardianUsername} for ${actualStudentName}: ${score}/${max}`);
        } else {
          console.log(`[AI Exam] No guardian username found for ${studentName}`);
        }
      } catch (pushErr) {
        console.warn('AI exam guardian push warning:', pushErr.message);
      }
    })();

    return { saved: true, component: comp.name, score, max, total: totalScore, passStatus };
  } catch (e) {
    console.log('⚠️ mark list save failed:', e.message);
    return { saved: false, reason: e.message };
  }
};

const isStudentAllowed = (pub, ident = {}) => {
  const list = pub.allowed_students;
  if (list === null || list === undefined) return true; // published to everybody
  let arr;
  try { arr = typeof list === 'string' ? JSON.parse(list) : list; } catch (e) { return true; }
  if (!Array.isArray(arr) || arr.length === 0) return true;
  const want = [ident.username, ident.schoolId, ident.name].filter(Boolean)
    .flatMap((v) => [String(v), String(v).trim().toLowerCase()]);
  return arr.some((s) => {
    const vals = typeof s === 'string' ? [s] : [s.username, s.schoolId, s.school_id, s.student_name, s.name, s.id];
    return vals.filter(Boolean).some((v) => want.includes(String(v)) || want.includes(String(v).trim().toLowerCase()));
  });
};

// POST /api/ai/save-test — Save a generated/edited test
router.post('/save-test', async (req, res) => {
  const { subjectName, className, termNumber, componentName, questions, timeLimit, language, isPublished, password, practice } = req.body;
  if (!subjectName || !className || !termNumber || !componentName || !questions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const client = await db.connect();
    try {
      const schemaName = `test_${subjectName.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`;
      const tableName = `${className.toLowerCase()}_term${termNumber}_${componentName.toLowerCase().replace(/[\s\-\.]+/g, '_')}`;
      
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      await client.query(`CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (
        id SERIAL PRIMARY KEY,
        question_data JSONB NOT NULL,
        question_type VARCHAR(50) NOT NULL,
        marks INTEGER NOT NULL DEFAULT 1,
        time_limit INTEGER,
        language VARCHAR(50) DEFAULT 'English',
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      await client.query(`DELETE FROM ${schemaName}.${tableName}`);
      
      for (const rawQ of questions) {
        const q = decodeDeep(rawQ);
        q.type = typeNormalize(q.type || rawQ.type);
        try { if (q.type === 'mcq') fixQuestion(q); } catch (e) { /* store as given */ }
        await client.query(`
          INSERT INTO ${schemaName}.${tableName} (question_data, question_type, marks, time_limit, language)
          VALUES ($1, $2, $3, $4, $5)
        `, [JSON.stringify(q), q.type, q.marks || 1, timeLimit || null, language || 'English']);
      }
      
      if (isPublished) {
        await client.query(`UPDATE ${schemaName}.${tableName} SET is_published = true`);
      }

      // Test-level settings: 5-digit password + practice flag
      const pwd = password === undefined || password === null || String(password).trim() === ''
        ? null : String(password).trim();
      if (pwd && !/^\d{4,6}$/.test(pwd)) throw new Error('Test password must be 4-6 digits');
      if (pwd) {
        await client.query(`
          INSERT INTO ai_test_settings (schema_name, table_name, password, practice, language, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (schema_name, table_name)
          DO UPDATE SET password = EXCLUDED.password, practice = EXCLUDED.practice, language = EXCLUDED.language, updated_at = NOW()
        `, [schemaName, tableName, pwd, !!practice, language || 'English']);
      } else if (practice !== undefined) {
        await client.query(`
          INSERT INTO ai_test_settings (schema_name, table_name, password, practice, language, updated_at)
          VALUES ($1, $2, NULL, $3, $4, NOW())
          ON CONFLICT (schema_name, table_name)
          DO UPDATE SET practice = EXCLUDED.practice, language = EXCLUDED.language, updated_at = NOW()
        `, [schemaName, tableName, !!practice, language || 'English']);
      }
      
      await client.query('COMMIT');
      res.json({ success: true, message: `Test saved: ${questions.length} questions`, data: { schemaName, tableName, password: pwd, practice: !!practice } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).json({ error: 'Failed to save test' });
  }
});

// GET /api/ai/get-test — Fetch questions for a saved test
router.get('/get-test', async (req, res) => {
  try {
    const { subject, className, termNumber, componentName } = req.query;
    if (!subject || !className || !termNumber || !componentName) {
      return res.status(400).json({ error: 'Missing required query params: subject, className, termNumber, componentName' });
    }
    const schemaName = `test_${subject.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term${termNumber}_${componentName.toLowerCase().replace(/[\s\-\.]+/g, '_')}`;

    // Check if table exists
    const exists = await db.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='${schemaName}' AND table_name='${tableName}')`);
    if (!exists.rows[0].exists) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const result = await db.query(`SELECT id, question_data, question_type, marks, time_limit, language FROM "${schemaName}"."${tableName}" ORDER BY id`);
    const questions = result.rows.map(r => {
      const data = decodeDeep(r.question_data || {});
      const q = {
        ...data,
        id: r.id,
        type: typeNormalize(r.question_type || data.type),
        marks: r.marks,
      };
      // Repair questions saved by older versions (split options, lettered answers)
      try { fixQuestion(q); } catch (e) { /* keep the question as stored */ }
      return q;
    });

    res.json({ success: true, data: {
      subject, className, termNumber, componentName,
      questions,
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      timeLimit: parseInt(result.rows[0]?.time_limit) || 0,
      language: result.rows[0]?.language || 'English'
    } });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test', details: error.message });
  }
});

// GET /api/ai/test-results — Teacher view: every attempt for one saved test.
// Students must wait `result_delay_minutes` before their own score unlocks; the
// teacher sees results the moment the student submits (no delay on this route).
router.get('/test-results', async (req, res) => {
  try {
    const { subject, className, termNumber, componentName } = req.query;
    if (!subject || !className || !termNumber || !componentName) {
      return res.status(400).json({ error: 'Missing required query params: subject, className, termNumber, componentName' });
    }
    const schemaName = `test_${subject.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`;
    const tableName = `${className.toLowerCase()}_term${termNumber}_${componentName.toLowerCase().replace(/[\s\-\.]+/g, '_')}`;
    const safeSchema = String(schemaName).replace(/[^a-z0-9_]/g, '');
    const safeTable = String(tableName).replace(/[^a-z0-9_]/g, '');

    const exists = await db.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
      [safeSchema, safeTable]
    );
    const testExists = !!exists.rows[0].exists;

    let published = null;
    if (testExists) {
      const pubRes = await db.query(
        `SELECT * FROM published_ai_tests WHERE schema_name = $1 AND table_name = $2 ORDER BY published_at DESC LIMIT 1`,
        [schemaName, tableName]
      );
      if (pubRes.rows[0]) {
        const p = pubRes.rows[0];
        published = {
          id: p.id,
          publishedAt: p.published_at || null,
          practice: !!p.practice,
          timeLimit: p.time_limit ?? null,
          resultDelayMinutes: p.result_delay_minutes ?? null
        };
      }
    }

    const attemptsRes = testExists
      ? await db.query(`SELECT * FROM student_exams WHERE schema_name = $1 AND table_name = $2 ORDER BY LOWER(COALESCE(student_name, ''))`, [schemaName, tableName])
      : { rows: [] };

    const now = Date.now();
    const attempts = attemptsRes.rows.map((r) => {
      let stored = [];
      try {
        const raw = typeof r.question_results === 'string' ? JSON.parse(r.question_results) : r.question_results;
        stored = Array.isArray(raw) ? raw : [];
      } catch (e) { stored = []; }
      const graded = stored.filter((q) => q && q.questionId !== undefined && q.questionId !== null);
      const correctCount = graded.filter((q) => q.isCorrect).length;
      const delayActive = r.result_available_at ? new Date(r.result_available_at).getTime() > now : false;
      return {
        id: r.id,
        studentName: r.student_name || '',
        studentUsername: r.student_username || '',
        studentId: r.student_id ?? null,
        schoolId: r.school_id ?? null,
        className: r.class_name || className,
        status: r.status || '',
        earnedMarks: r.earned_marks ?? null,
        totalMarks: r.total_marks ?? null,
        percentage: r.percentage ?? null,
        grade: r.grade ?? null,
        bonusMarks: r.bonus_marks ?? null,
        componentMarks: r.component_marks ?? null,
        startedAt: r.started_at || null,
        submittedAt: r.submitted_at || null,
        timeTaken: r.time_taken_minutes ?? null,
        violationEnded: !!r.violation_ended,
        requiresManualGrading: !!r.requires_manual_grading,
        questionCount: graded.length,
        correctCount,
        wrongCount: graded.length - correctCount,
        pending: false,
        studentDelayActive: delayActive
      };
    });

    res.json({
      success: true,
      data: {
        subject, className, termNumber, componentName,
        schemaName, tableName,
        testExists,
        published,
        attempts
      }
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results', details: error.message });
  }
});

// GET /api/ai/check-test-exists — does this subject/class/term already have tests?
// Returns every existing component (incl. copies like "final a") + a suggested copy name.
router.get('/check-test-exists', async (req, res) => {
  try {
    const { subjectName, className, termNumber, componentName } = req.query;
    if (!subjectName || !className || !termNumber) {
      return res.status(400).json({ error: 'subjectName, className, termNumber required' });
    }
    const schemaName = `test_${subjectName.toLowerCase().replace(/[\s\-\.]+/g, '_')}_schema`;
    const schemaOk = await db.query(`SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='${schemaName}')`);
    const existing = [];
    if (schemaOk.rows[0].exists) {
      const tables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='${schemaName}'`);
      const prefix = `${String(className).toLowerCase()}_term${termNumber}_`;
      for (const t of tables.rows) {
        if (!String(t.table_name).startsWith(prefix)) continue;
        const comp = String(t.table_name).slice(prefix.length);
        if (!comp) continue;
        let count = 0;
        try {
          const c = await db.query(`SELECT COUNT(*) as c FROM "${schemaName}"."${t.table_name}"`);
          count = parseInt(c.rows[0].c) || 0;
        } catch (e) { /* unreadable table */ }
        if (count > 0) existing.push({ componentName: comp, tableName: t.table_name, questionCount: count });
      }
    }

    const norm = (s) => String(s || '').toLowerCase().replace(/[\s\-\.]+/g, '_').trim();
    const base = norm(componentName);
    const exact = componentName ? existing.find(e => norm(e.componentName) === base) || null : null;

    // Suggested copy name: "final" → "final A", "final B", ... (first free letter)
    let suggestedCopy = null;
    if (componentName) {
      const taken = new Set(existing.map(e => norm(e.componentName)));
      for (let i = 0; i < 26; i++) {
        const cand = `${componentName} ${String.fromCharCode(65 + i)}`;
        if (!taken.has(norm(cand))) { suggestedCopy = cand; break; }
      }
    }

    res.json({ success: true, data: { exists: !!exact, exact, existing, suggestedCopy } });
  } catch (error) {
    console.error('check-test-exists error:', error);
    res.status(500).json({ error: 'Failed to check existing tests' });
  }
});

// POST /api/ai/publish-test — Publish a saved test to students (password + student selection)
router.post('/publish-test', async (req, res) => {
  const { schemaName, tableName, subjectName, className, termNumber, componentName, totalMarks, timeLimit,
          password, practice, students, allStudents, publishedBy, resultDelayMinutes } = req.body;
  if (!schemaName || !tableName) return res.status(400).json({ error: 'schemaName and tableName required' });
  const pwd = String(password == null ? '' : password).trim();
  if (!/^\d{5}$/.test(pwd)) return res.status(400).json({ error: 'Test password must be exactly 5 digits' });

  const allowed = (allStudents || !Array.isArray(students) || students.length === 0)
    ? null
    : students.map((s) => (typeof s === 'string'
      ? { username: s }
      : { username: s.username || null, schoolId: s.schoolId || s.school_id || null, name: s.name || s.student_name || null }));

  try {
    const chk = await db.query(`SELECT COUNT(*)::int AS c, COALESCE(SUM(marks),0)::int AS m, MAX(time_limit)::int AS tl FROM "${schemaName}"."${tableName}"`);
    if (!chk.rows[0] || !chk.rows[0].c) return res.status(400).json({ error: 'Save the test before publishing it' });
    const calcTotalMarks = parseInt(totalMarks, 10) || chk.rows[0].m || 0;
    const calcTimeLimit = parseInt(timeLimit, 10) || chk.rows[0].tl || 0;

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM published_ai_tests WHERE schema_name = $1 AND table_name = $2`, [schemaName, tableName]);
      const ins = await client.query(`
        INSERT INTO published_ai_tests
          (schema_name, table_name, subject_name, class_name, term_number, component_name, total_marks, time_limit,
           excluded_students, allowed_students, password, practice, result_delay_minutes, published_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, $9, $10, $11, $12, $13)
        RETURNING id, published_at
      `, [
        schemaName, tableName, subjectName || '', className || '', parseInt(termNumber, 10) || 1,
        componentName || '', calcTotalMarks, calcTimeLimit,
        allowed ? JSON.stringify(allowed) : null, pwd, !!practice,
        parseInt(resultDelayMinutes, 10) || 30, publishedBy || ''
      ]);

      await client.query(`
        INSERT INTO ai_test_settings (schema_name, table_name, password, practice, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (schema_name, table_name)
        DO UPDATE SET password = EXCLUDED.password, practice = EXCLUDED.practice, updated_at = NOW()
      `, [schemaName, tableName, pwd, !!practice]);

      await client.query('COMMIT');
      console.log(`📢 Published ${subjectName}/${componentName} for ${className}: ${allowed ? allowed.length + ' selected students' : 'ALL students'}${practice ? ' (PRACTICE)' : ''}`);
      res.json({
        success: true,
        message: allowed ? `Published to ${allowed.length} student(s)` : 'Published to all students',
        data: {
          id: ins.rows[0].id,
          password: pwd,
          practice: !!practice,
          allStudents: !allowed,
          students: allowed ? allowed.length : null,
          totalMarks: calcTotalMarks,
          timeLimit: calcTimeLimit,
          publishedAt: ins.rows[0].published_at
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to publish: ' + e.message });
  }
});

// POST /api/ai/unpublish-test — remove a published test from students
router.post('/unpublish-test', async (req, res) => {
  const { schemaName, tableName } = req.body;
  if (!schemaName || !tableName) return res.status(400).json({ error: 'schemaName and tableName required' });
  try {
    await db.query(`UPDATE published_ai_tests SET is_active = false, updated_at = NOW() WHERE schema_name = $1 AND table_name = $2`, [schemaName, tableName]);
    res.json({ success: true, message: 'Test unpublished' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to unpublish: ' + e.message });
  }
});

// GET /api/ai/class-students-full — full roster (username + school id) for the publish modal
router.get('/class-students-full', async (req, res) => {
  const { className } = req.query;
  if (!className) return res.status(400).json({ error: 'className required' });
  try {
    const tbl = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema' AND LOWER(table_name) = LOWER($1)`,
      [String(className).replace(/[^a-zA-Z0-9_]/g, '')]
    );
    if (!tbl.rows.length) return res.json({ success: true, data: [] });
    const r = await db.query(
      `SELECT id, school_id, class_id, student_name, username, is_active FROM classes_schema."${tbl.rows[0].table_name}"
       WHERE (is_active IS TRUE OR is_active IS NULL) ORDER BY LOWER(student_name)`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch students: ' + e.message });
  }
});

// GET /api/ai/student-tests — published tests visible to one student
router.get('/student-tests', async (req, res) => {
  const { className, studentName, studentUsername, schoolId, studentId } = req.query;
  if (!className) return res.status(400).json({ error: 'className required' });
  try {
    const pubRes = await db.query(
      `SELECT * FROM published_ai_tests
       WHERE LOWER(class_name) = LOWER($1) AND (is_active IS NULL OR is_active = true)
       ORDER BY published_at DESC`,
      [className]
    );
    const ident = { username: studentUsername, schoolId, name: studentName };
    let tests = pubRes.rows.filter((p) => {
      if (!isStudentAllowed(p, ident)) return false;
      let excluded = [];
      try { excluded = p.excluded_students ? (typeof p.excluded_students === 'string' ? JSON.parse(p.excluded_students) : p.excluded_students) : []; } catch (e) { excluded = []; }
      const blocked = [studentUsername, schoolId, studentName].filter(Boolean).map((v) => String(v).toLowerCase());
      return !excluded.some((s) => blocked.includes(String(typeof s === 'string' ? s : (s.username || s.schoolId || s.student_name || '')).toLowerCase()));
    });

    const completedMap = {};
    if (studentUsername || studentName || studentId) {
      const conds = [], params = [];
      if (studentUsername) { params.push(studentUsername); conds.push(`se.student_username = $${params.length}`); }
      if (studentName) { params.push(studentName); conds.push(`LOWER(se.student_name) = LOWER($${params.length})`); }
      if (studentId) { params.push(parseInt(studentId, 10)); conds.push(`se.student_id = $${params.length}`); }
      const ex = await db.query(`
        SELECT DISTINCT ON (se.schema_name, se.table_name)
               se.id, se.schema_name, se.table_name, se.status, se.submitted_at, se.result_available_at,
               se.violation_ended, se.earned_marks, se.percentage, se.total_marks
        FROM student_exams se
        WHERE (${conds.join(' OR ')}) AND se.status IN ('submitted','graded')
        ORDER BY se.schema_name, se.table_name, se.submitted_at DESC
      `, params);
      ex.rows.forEach((row) => { completedMap[`${row.schema_name}.${row.table_name}`] = row; });
    }

    const now = Date.now();
    tests = tests.map((t) => {
      const c = completedMap[`${t.schema_name}.${t.table_name}`];
      const availableAt = c && c.result_available_at ? new Date(c.result_available_at).getTime() : null;
      return {
        id: t.id,
        publishedId: t.id,
        schemaName: t.schema_name,
        tableName: t.table_name,
        subject: t.subject_name,
        className: t.class_name,
        termNumber: t.term_number,
        componentName: t.component_name,
        totalMarks: t.total_marks,
        timeLimit: t.time_limit,
        publishedAt: t.published_at,
        practice: !!t.practice,
        completed: !!c,
        submittedAt: c ? c.submitted_at : null,
        violationEnded: c ? !!c.violation_ended : false,
        earnedMarks: c ? c.earned_marks : null,
        percentage: c ? c.percentage : null,
        resultAvailableAt: availableAt ? new Date(availableAt).toISOString() : null,
        resultPending: !!(c && availableAt && now < availableAt)
      };
    });

    res.json({ success: true, data: tests });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tests: ' + e.message });
  }
});

// POST /api/ai/start-exam — password check + per-student scrambled questions
router.post('/start-exam', async (req, res) => {
  const { publishedId, password, studentUsername, schoolId, studentName, className } = req.body;
  if (!publishedId) return res.status(400).json({ error: 'publishedId required' });
  try {
    const pub = await db.query(`SELECT * FROM published_ai_tests WHERE id = $1`, [publishedId]);
    if (!pub.rows.length) return res.status(404).json({ error: 'Test not found or no longer published' });
    const p = pub.rows[0];
    if (p.is_active === false) return res.status(403).json({ error: 'This test is no longer available' });
    if (className && p.class_name && String(p.class_name).toLowerCase() !== String(className).toLowerCase()) {
      return res.status(403).json({ error: 'This test belongs to another class' });
    }
    if (!isStudentAllowed(p, { username: studentUsername, schoolId, name: studentName })) {
      return res.status(403).json({ error: 'This test was not published to your account' });
    }
    const pwd = String(password == null ? '' : password).trim();
    if (!p.password || p.password !== pwd) return res.status(401).json({ error: 'Incorrect test password' });

    // Already submitted? (one attempt per student)
    const conds = [], params = [p.schema_name, p.table_name];
    if (studentUsername) { params.push(studentUsername); conds.push(`student_username = $${params.length}`); }
    if (studentName) { params.push(studentName); conds.push(`LOWER(student_name) = LOWER($${params.length})`); }
    if (conds.length) {
      const done = await db.query(`
        SELECT id, submitted_at, result_available_at FROM student_exams
        WHERE schema_name = $1 AND table_name = $2 AND (${conds.join(' OR ')}) AND status IN ('submitted','graded')
        ORDER BY submitted_at DESC LIMIT 1
      `, params);
      if (done.rows.length) {
        return res.status(409).json({
          error: 'You already completed this test',
          alreadyCompleted: true,
          submittedAt: done.rows[0].submitted_at,
          resultAvailableAt: done.rows[0].result_available_at
        });
      }
    }

    const qRes = await db.query(`SELECT * FROM "${p.schema_name}"."${p.table_name}" ORDER BY id`);
    if (!qRes.rows.length) return res.status(404).json({ error: 'This test has no questions' });

    const seedKey = `${p.id}:${studentUsername || schoolId || studentName || 'anon'}`;
    const scrambled = scrambleQuestionRows(qRes.rows, seedKey);
    const language = qRes.rows[0].language || 'English';
    let timeLimit = p.time_limit || 0;
    if (!timeLimit) timeLimit = qRes.rows[0].time_limit || 0;

    res.json({
      success: true,
      data: {
        publishedId: p.id,
        schemaName: p.schema_name,
        tableName: p.table_name,
        subject: p.subject_name,
        className: p.class_name,
        termNumber: p.term_number,
        componentName: p.component_name,
        totalMarks: p.total_marks || qRes.rows.reduce((s, r) => s + (parseInt(r.marks, 10) || 1), 0),
        timeLimit: parseInt(timeLimit, 10) || 0,
        practice: !!p.practice,
        language,
        questionCount: scrambled.length,
        questions: stripAnswersForStudent(scrambled)
      }
    });
  } catch (e) {
    console.error('start-exam error:', e);
    res.status(500).json({ error: 'Failed to start exam: ' + e.message });
  }
});

// GET /api/ai/student-results — results for one student (hidden until the delay passes)
router.get('/student-results', async (req, res) => {
  const { studentName, studentUsername, studentId, className } = req.query;
  if (!studentName && !studentId && !studentUsername) return res.status(400).json({ error: 'student identity required' });
  try {
    const conds = [], params = [];
    if (studentUsername) { params.push(studentUsername); conds.push(`se.student_username = $${params.length}`); }
    if (studentName) { params.push(studentName); conds.push(`LOWER(se.student_name) = LOWER($${params.length})`); }
    if (studentId) { params.push(parseInt(studentId, 10)); conds.push(`se.student_id = $${params.length}`); }
    if (className) { params.push(className); conds.push(`LOWER(se.class_name) = LOWER($${params.length})`); }

    const query = `
      SELECT se.id, se.schema_name, se.table_name, se.status, se.earned_marks, se.total_marks, se.percentage,
             se.bonus_marks, se.component_marks, se.submitted_at, se.result_available_at, se.violation_ended, se.class_name,
             p.subject_name, p.term_number, p.component_name, p.time_limit, p.practice, p.total_marks AS published_total_marks
      FROM student_exams se
      JOIN published_ai_tests p ON p.schema_name = se.schema_name AND p.table_name = se.table_name
      WHERE ${conds.join(' AND ')}
      ORDER BY se.submitted_at DESC
    `;
    const result = await db.query(query, params);
    const now = Date.now();
    const data = result.rows.map((row) => {
      const availableAt = row.result_available_at ? new Date(row.result_available_at).getTime() : 0;
      const pending = availableAt > now;
      return {
        ...row,
        // Score is shown right away; `pending` only locks the per-question breakdown.
        pending,
        detailsLocked: pending,
        earnedMarks: row.earned_marks,
        percentage: row.percentage,
        violationEnded: !!row.violation_ended
      };
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch results: ' + e.message });
  }
});

// GET /api/ai/student-result/:examId — one result (gated until the delay passes)
router.get('/student-result/:examId', async (req, res) => {
  const { examId } = req.params;
  const { studentUsername, studentName } = req.query;
  try {
    const result = await db.query(`
      SELECT se.*, p.subject_name, p.class_name, p.term_number, p.component_name, p.total_marks as max_marks,
             p.time_limit, p.practice, p.result_delay_minutes
      FROM student_exams se
      JOIN published_ai_tests p ON p.schema_name = se.schema_name AND p.table_name = se.table_name
      WHERE se.id = $1
    `, [examId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Result not found' });
    const row = result.rows[0];

    // Only the student who took it may read it (answers + explanations are in there)
    if (studentUsername || studentName) {
      const u = String(row.student_username || '').trim().toLowerCase();
      const n = String(row.student_name || '').trim().toLowerCase();
      const ok = (studentUsername && u && u === String(studentUsername).trim().toLowerCase())
        || (studentName && n && n === String(studentName).trim().toLowerCase());
      if (!ok) return res.status(403).json({ error: 'This result does not belong to you' });
    }
    // Teacher view (Student Results tab): skip the result_delay_minutes wait.
    // That delay only protects the student's own account from seeing marks early.
    const teacherView = ['teacher', 'admin', '1', 'true'].includes(String(req.query.view || '').toLowerCase());
    const availableAt = row.result_available_at ? new Date(row.result_available_at).getTime() : 0;
    if (!teacherView && availableAt > Date.now()) {
      return res.json({
        success: true,
        data: {
          id: row.id,
          pending: true,
          detailsLocked: true,
          resultAvailableAt: row.result_available_at,
          // Score is shown immediately; the per-question breakdown waits for the delay.
          earned_marks: row.earned_marks,
          total_marks: row.total_marks,
          percentage: row.percentage,
          bonus_marks: row.bonus_marks,
          grade: row.grade,
          status: row.status,
          submitted_at: row.submitted_at,
          violation_ended: !!row.violation_ended,
          subject_name: row.subject_name,
          class_name: row.class_name,
          component_name: row.component_name,
          term_number: row.term_number
        }
      });
    }
    row.pending = false;

    // ── per-question breakdown for the student ─────────────────────────────
    // Stored grading rows carry the answers/verdicts; the question text, options
    // and matching columns are re-read from the test table so the student can see
    // every question, what they answered, the correct answer and the explanation.
    let storedResults = [];
    try {
      const raw = typeof row.question_results === 'string' ? JSON.parse(row.question_results) : row.question_results;
      storedResults = Array.isArray(raw) ? raw : [];
    } catch (e) { storedResults = []; }

    const qMeta = new Map();
    try {
      const qs = await db.query(
        `SELECT id, question_data, question_type, marks FROM "${row.schema_name}"."${row.table_name}" ORDER BY id`
      );
      qs.rows.forEach((r) => {
        let qd = r.question_data;
        try { if (typeof qd === 'string') qd = JSON.parse(qd); } catch (e) { qd = {}; }
        qMeta.set(String(r.id), { type: typeNormalize((qd && qd.type) || r.question_type), marks: r.marks, q: qd || {} });
      });
    } catch (e) { /* test table removed — keep answers only */ }

    const detail = storedResults.map((r) => {
      const meta = qMeta.get(String(r.questionId)) || {};
      const qd = meta.q || {};
      const type = r.type || meta.type || qd.type || '';
      const options = Array.isArray(qd.options) ? qd.options : [];
      const mcqText = (val) => {
        const s = val === null || val === undefined ? '' : String(val);
        if (type !== 'mcq') return s;
        const li = letterIndexOf(s);
        if (li >= 0 && options[li]) return `${s.trim()[0].toUpperCase()}. ${options[li]}`;
        const bare = s.replace(/^[a-d][).:]\s*/i, '');
        const idx = options.findIndex((o) => String(o).trim().toLowerCase() === bare.trim().toLowerCase());
        return idx >= 0 ? `${String.fromCharCode(65 + idx)}. ${options[idx]}` : s;
      };
      let correctAnswerText = mcqText(r.correctAnswer);
      if (!correctAnswerText && type === 'matching') correctAnswerText = 'see pairs below';
      let studentAnswerText = mcqText(r.studentAnswer);
      if (type === 'matching') studentAnswerText = '';
      return {
        questionId: r.questionId,
        type,
        question: qd.question || qd.text || '',
        options,
        leftColumn: Array.isArray(qd.leftColumn) ? qd.leftColumn : null,
        rightColumn: Array.isArray(qd.rightColumn) ? qd.rightColumn : null,
        marks: r.maxMarks ?? meta.marks ?? qd.marks ?? 1,
        earnedMarks: r.earnedMarks ?? 0,
        maxMarks: r.maxMarks ?? meta.marks ?? qd.marks ?? 1,
        isCorrect: !!r.isCorrect,
        studentAnswer: r.studentAnswer,
        studentAnswerText,
        correctAnswer: r.correctAnswer,
        correctAnswerText,
        correctMatches: r.correctMatches || null,
        correctPairs: r.correctPairs,
        totalPairs: r.totalPairs,
        explanation: r.explanation || qd.explanation || '',
        requiresManualGrading: !!r.requiresManualGrading,
        violationEnded: !!r.violationEnded
      };
    });

    const { question_results, ...rest } = row;
    res.json({ success: true, data: { ...rest, pending: false, results: detail } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch result: ' + e.message });
  }
});

// GET /api/ai/published-list — Teacher view: published exams with completion stats
router.get('/published-list', async (req, res) => {
  const { subjectName, className } = req.query;
  try {
    let query = `
      SELECT p.*,
        (SELECT COUNT(*) FROM student_exams se WHERE se.schema_name = p.schema_name AND se.table_name = p.table_name) as total_students,
        (SELECT COUNT(*) FROM student_exams se WHERE se.schema_name = p.schema_name AND se.table_name = p.table_name AND se.status IN ('submitted','graded')) as completed_count
      FROM published_ai_tests p
    `;
    const params = [];
    const conditions = [];
    if (subjectName) { params.push(subjectName); conditions.push(`p.subject_name = $${params.length}`); }
    if (className) { params.push(className); conditions.push(`p.class_name = $${params.length}`); }
    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY p.published_at DESC`;
    
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch published list: ' + e.message });
  }
});

// POST /api/ai/submit-exam — Student submits exam for auto-grading + mark list save
router.post('/submit-exam', async (req, res) => {
  const { schemaName, tableName, subjectName, className, termNumber, componentName, totalMarks: maxComponentMarks,
          studentId, studentName, studentUsername, answers, publishedId, violated } = req.body;
  if (!schemaName || !tableName || !answers) return res.status(400).json({ error: 'schemaName, tableName, and answers required' });

  // Published-test context for student exams: practice flag, result delay, permission check
  let pub = null;
  if (publishedId) {
    try {
      const pr = await db.query(`SELECT * FROM published_ai_tests WHERE id = $1`, [publishedId]);
      if (pr.rows.length) {
        pub = pr.rows[0];
        if (pub.is_active === false) return res.status(403).json({ error: 'This test is no longer published' });
        if (!isStudentAllowed(pub, { username: studentUsername, schoolId: null, name: studentName })) {
          return res.status(403).json({ error: 'This test was not published to your account' });
        }
      }
    } catch (e) { console.log('⚠️ publish lookup failed:', e.message); }
  }

  // Find student's school_id BEFORE transaction (to avoid transaction abort if table doesn't exist)
  let schoolId = null;
  if (studentName && className) {
    try {
      const sanitizedClass = className.replace(/[^a-zA-Z0-9_]/g, '');
      const tableCheck = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='classes_schema' AND LOWER(table_name) = LOWER($1)`,
        [sanitizedClass]
      );
      if (tableCheck.rows.length > 0) {
        const actualTable = tableCheck.rows[0].table_name;
        const studentRes = await db.query(`SELECT school_id, smachine_id FROM classes_schema."${actualTable}" WHERE student_name = $1 LIMIT 1`, [studentName]);
        if (studentRes.rows.length > 0) {
          schoolId = studentRes.rows[0].school_id || studentRes.rows[0].smachine_id;
        }
      }
    } catch(e) { /* class table may not exist */ }
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Fetch questions from the dynamic schema/table (row id = the key the player answers by)
    const questionsRes = await client.query(`SELECT * FROM "${schemaName}"."${tableName}" ORDER BY id`);
    if (questionsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Test not found' });
    }

    // ── Grading (uses module-level cmpText / toBoolValue / splitAlts / stripLetterPrefix) ──
    const letterIndex = (v) => {
      const s = String(v == null ? '' : v).trim();
      if (/^[a-d]$/i.test(s)) return s.toLowerCase().charCodeAt(0) - 97;
      const m = /^([a-d])[).:]/i.exec(s);
      return m ? m[1].toLowerCase().charCodeAt(0) - 97 : -1;
    };

    const gradeOne = (q, studentAnswer) => {
      const type = q.type;
      const correctRaw = (q.correctAnswer !== undefined && q.correctAnswer !== null && q.correctAnswer !== '') ? q.correctAnswer : (q.answer || '');
      const ans = cmpText(correctRaw);
      const stu = cmpText(studentAnswer);
      const options = Array.isArray(q.options) ? q.options : [];

      if (type === 'mcq') {
        if (!stu) return false;
        const li = letterIndex(correctRaw);
        const correctVal = (li >= 0 && options[li]) ? cmpText(options[li]) : ans;
        const stuBare = cmpText(stripLetterPrefix(studentAnswer));
        const ansBare = cmpText(stripLetterPrefix(correctRaw));
        if (stu === correctVal || stuBare === correctVal) return true;
        if (stu === ansBare || stuBare === ansBare) return true;
        const sli = letterIndex(studentAnswer);
        if (sli >= 0 && options[sli] && cmpText(options[sli]) === correctVal) return true;
        const matchingOpt = options.find(o => cmpText(stripLetterPrefix(o)) === ansBare);
        if (matchingOpt && stuBare === cmpText(stripLetterPrefix(matchingOpt))) return true;
        return false;
      }
      if (type === 'true_false') {
        const a = toBoolValue(correctRaw);
        const b = toBoolValue(studentAnswer);
        if (a !== null && b !== null) return a === b;
        return stu !== '' && stu === ans;
      }
      if (type === 'numeric') {
        const p1 = parseFloat(String(studentAnswer ?? '').replace(/[, ]/g, ''));
        const p2 = parseFloat(String(correctRaw ?? '').replace(/[, ]/g, ''));
        if (!isNaN(p1) && !isNaN(p2)) return Math.abs(p1 - p2) < 0.01 + Math.abs(p2) * 0.001;
        if (!stu) return false;
        return splitAlts(correctRaw).includes(stu);
      }
      if (type === 'fill_blank' || type === 'short_answer') {
        if (!stu) return false;
        if (splitAlts(correctRaw).includes(stu)) return true;
        if (type === 'short_answer' && ans.length > 2 && (ans.includes(stu) || stu.includes(ans))) return true;
        return false;
      }
      if (type === 'matching') {
        const { matched, total } = matchingPairsScore(q, studentAnswer);
        return total > 0 && matched === total;
      }
      return false; // essay / transformation are manually graded
    };

    // Auto-grade objective questions
    let examTotalMarks = 0, obtainedMarks = 0, manualCount = 0;
    const results = [];

    for (const raw of questionsRes.rows) {
      const data = decodeDeep(raw.question_data || {});
      const type = typeNormalize(data.type || raw.question_type);
      const q = { ...data, id: raw.id, type, marks: raw.marks || data.marks || 1 };

      const studentAnswer = answers[String(raw.id)] !== undefined ? answers[String(raw.id)] : (answers[raw.id] !== undefined ? answers[raw.id] : '');
      const isManual = type === 'essay' || type === 'transformation';
      const marks = q.marks || 1;

      let isCorrect = false, earned = 0, correctPairs = null, totalPairs = null;
      if (isManual) {
        manualCount++;
      } else if (type === 'matching') {
        const sc = matchingPairsScore(q, studentAnswer);
        correctPairs = sc.matched;
        totalPairs = sc.total;
        earned = sc.total > 0 ? Math.round((sc.matched / sc.total) * marks * 100) / 100 : 0;
        isCorrect = sc.total > 0 && sc.matched === sc.total;
      } else {
        isCorrect = gradeOne(q, studentAnswer);
        earned = isCorrect ? marks : 0;
      }

      examTotalMarks += marks;
      obtainedMarks += earned;
      results.push({
        questionId: q.id,
        type,
        studentAnswer,
        correctAnswer: q.correctAnswer || q.answer || '',
        isCorrect,
        earnedMarks: earned,
        marks: earned,
        maxMarks: marks,
        correctPairs,
        totalPairs,
        correctMatches: (type === 'matching' && Array.isArray(q.correctMatches) && q.correctMatches.length)
          ? q.correctMatches
          : (type === 'matching' && Array.isArray(q.leftColumn) && Array.isArray(q.rightColumn)
            ? q.leftColumn.map((l, i) => ({ left: l, right: q.rightColumn[i] }))
            : null),
        explanation: q.explanation || '',
        requiresManualGrading: isManual
      });
    }

    // Rule violation (student left the fullscreen exam twice) → the attempt scores 0
    if (violated) {
      obtainedMarks = 0;
      results.forEach((r) => { r.earnedMarks = 0; r.marks = 0; r.violationEnded = true; });
    }

    // Calculate bonus marks
    const rawScore = obtainedMarks;
    const componentMax = parseInt(maxComponentMarks) || examTotalMarks;
    const bonusMarks = Math.max(0, rawScore - componentMax);
    const cappedScore = Math.min(rawScore, componentMax);
    const percentage = examTotalMarks > 0 ? ((rawScore / examTotalMarks) * 100).toFixed(1) : 0;

    // Persist the submission. exam_id / student_id are NULLABLE for AI-generator tests
    // (they have no ai_exams / students row) — persistence failures must never break grading.
    const delayMinutes = pub ? (parseInt(pub.result_delay_minutes, 10) || 30) : 0;
    const resultAvailableAt = pub && delayMinutes > 0 ? new Date(Date.now() + delayMinutes * 60000) : null;
    // Only persist an attempt that belongs to a real student (published attempt or a
    // named/username'd student). Teacher previews ("Play Test") have no identity.
    const hasStudentIdentity = !!(
      publishedId ||
      studentUsername ||
      (studentName && String(studentName).trim()) ||
      (studentId && !Number.isNaN(parseInt(studentId, 10)))
    );
    try {
      let studentIdInt = null;
      const parsedSid = parseInt(studentId);
      if (parsedSid) {
        const chk = await client.query('SELECT id FROM students WHERE id = $1', [parsedSid]);
        if (chk.rows.length) studentIdInt = parsedSid;
      }
      if (hasStudentIdentity) {
        await client.query(`
          INSERT INTO student_exams
            (published_id, exam_id, schema_name, table_name, student_id, student_name, student_username, class_name, status,
             answers, question_results, total_marks, earned_marks, percentage, bonus_marks, component_marks,
             auto_graded, auto_graded_at, submitted_at, started_at, result_available_at, violation_ended)
          VALUES ($16, NULL, $1, $2, $3, $4, $5, $6, 'submitted', $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW(), NOW(), $14, $15)
        `, [
          schemaName, tableName,
          studentIdInt,
          studentName || 'Unknown', studentUsername || null, className || '',
          JSON.stringify(answers), JSON.stringify(results),
          examTotalMarks, rawScore, percentage,
          bonusMarks,
          JSON.stringify({ componentName: componentName || '', componentMax, obtained: rawScore, bonus: bonusMarks }),
          resultAvailableAt, !!violated, pub ? pub.id : null
        ]);
      }
    } catch (e) {
      console.error('⚠️ Could not persist student_exams row:', e.message);
    }

    // Save the mark into the mark list — never for practice tests or teacher previews
    // (a rule violation still writes a 0 for the attempt)
    let markSave = null;
    if (pub && !pub.practice && subjectName && className && termNumber && componentName) {
      try {
        let nameForMark = studentName || null;
        if (!nameForMark && studentUsername) {
          const tbl = await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema='classes_schema' AND LOWER(table_name) = LOWER($1)`,
            [String(className).replace(/[^a-zA-Z0-9_]/g, '')]
          );
          if (tbl.rows.length) {
            const u = await db.query(
              `SELECT student_name FROM classes_schema."${tbl.rows[0].table_name}" WHERE LOWER(username) = LOWER($1) LIMIT 1`,
              [studentUsername]
            );
            if (u.rows.length) nameForMark = u.rows[0].student_name;
          }
        }
        if (nameForMark) {
          markSave = await saveMarkToMarkList({
            subjectName, className, termNumber, componentName,
            studentName: nameForMark, obtained: rawScore, totalMarks: examTotalMarks
          });
          console.log(`📝 Mark list ${markSave.saved ? 'saved' : 'skipped'}: ${subjectName}/${componentName} ${nameForMark} = ${markSave.score || 0}${markSave.saved ? '/' + markSave.max : ' (' + (markSave.reason || '') + ')'}`);
        }
      } catch (e) { console.log('⚠️ mark list save failed:', e.message); }
    }

    await client.query('COMMIT');

    // If mark was not saved to mark list (e.g. standalone test or practice), still send push notification to guardian
    if (!markSave || !markSave.saved) {
      (async () => {
        try {
          const nameToLookup = studentName || studentUsername;
          if (!nameToLookup) return;
          let guardianUsername = null;
          let actualName = studentName || studentUsername;

          const allTables = (await db.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'classes_schema'`
          )).rows;
          for (const tbl of allTables) {
            const gRes = await db.query(
              `SELECT student_name, guardian_username FROM classes_schema."${tbl.table_name}" 
               WHERE (LOWER(TRIM(student_name)) = LOWER(TRIM($1)) OR LOWER(TRIM(username)) = LOWER(TRIM($1)))
                 AND guardian_username IS NOT NULL AND guardian_username != '' LIMIT 1`,
              [nameToLookup]
            );
            if (gRes.rows.length && gRes.rows[0].guardian_username) {
              guardianUsername = gRes.rows[0].guardian_username;
              if (gRes.rows[0].student_name) actualName = gRes.rows[0].student_name;
              break;
            }
          }

          if (guardianUsername) {
            const { notifyGuardianPush } = require('../services/guardianPush');
            const passStatus = parseFloat(percentage) >= 50 ? 'Pass' : 'Fail';
            notifyGuardianPush(
              guardianUsername,
              'Exam Completed',
              `${actualName} completed the exam with score ${rawScore}/${examTotalMarks} (${percentage}% - ${passStatus}).`,
              {
                type: 'marks',
                studentName: actualName,
                subject: subjectName || 'Exam',
                score: String(Math.round(percentage)),
                status: passStatus
              }
            ).catch(e => console.warn('Standalone exam push error:', e.message));
            console.log(`[AI Exam] Fallback push notification sent to guardian ${guardianUsername} for ${actualName}`);
          }
        } catch (e) {
          console.warn('Fallback exam push error:', e.message);
        }
      })();
    }

    // Student exam mode: the score is shown at once, the per-question
    // breakdown (which questions were right/wrong) waits for result_delay_minutes.
    if (pub) {
      const detailsHidden = delayMinutes > 0;
      const scoreLine = violated
        ? `Your test ended because you left the exam screen twice. Score: 0/${examTotalMarks}.`
        : `You scored ${rawScore}/${examTotalMarks} (${percentage}%).`;
      return res.json({
        success: true,
        submitted: true,
        obtainedMarks: rawScore,
        totalMarks: examTotalMarks,
        cappedScore,
        componentMax,
        bonusMarks,
        percentage,
        results: detailsHidden ? [] : results,
        manualGradingCount: detailsHidden ? null : manualCount,
        resultHidden: detailsHidden,
        detailsHidden,
        resultAvailableAt: (resultAvailableAt || new Date()).toISOString(),
        practice: !!pub.practice,
        violationEnded: !!violated,
        markSaved: !!(markSave && markSave.saved),
        message: detailsHidden
          ? `${scoreLine} The full breakdown unlocks in ${delayMinutes} minutes.`
          : scoreLine
      });
    }

    res.json({
      success: true,
      obtainedMarks: rawScore,
      totalMarks: examTotalMarks,
      cappedScore,
      componentMax,
      bonusMarks,
      percentage,
      results,
      manualGradingCount: manualCount,
      message: bonusMarks > 0
        ? `You scored ${rawScore}/${examTotalMarks} (${componentName||'component'} max ${componentMax}, bonus: ${bonusMarks})`
        : `You scored ${rawScore}/${examTotalMarks}${manualCount > 0 ? ` (${manualCount} question${manualCount > 1 ? 's' : ''} await teacher grading)` : ''}`
    });
  } catch(e) {
    try { await client.query('ROLLBACK'); } catch (rb) { /* already aborted */ }
    console.error('Auto-grading error:', e);
    res.status(500).json({ error: 'Grading failed: ' + e.message });
  } finally {
    client.release();
  }
});

// GET /api/ai/list-tests — List all saved tests
router.get('/list-tests', async (req, res) => {
  try {
    const byId = new Map(); // the same schema/table can exist in more than one database — never list it twice

    // Query all databases that might have test schemas
    const databases = [
      { pool: db, name: 'branch' },
      { pool: db.masterPool || db, name: 'master' }
    ];

    for (const { pool: queryPool } of databases) {
      try {
        const schemas = await queryPool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'test_%' ORDER BY schema_name");
        for (const s of schemas.rows) {
          const tables = await queryPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='${s.schema_name}'`);
          for (const t of tables.rows) {
            const count = await queryPool.query(`SELECT COUNT(*) as c FROM "${s.schema_name}"."${t.table_name}"`);
            const subject = s.schema_name.replace('test_', '').replace('_schema', '').replace(/_/g, ' ');
            const entry = {
              id: `${s.schema_name}.${t.table_name}`,
              schemaName: s.schema_name,
              tableName: t.table_name,
              subject: subject.charAt(0).toUpperCase() + subject.slice(1),
              className: t.table_name.split('_term')[0],
              termNumber: t.table_name.match(/term(\d+)/)?.[1] || '1',
              componentName: t.table_name.replace(/^[^_]+_term\d+_/, ''),
              questionCount: parseInt(count.rows[0].c)
            };
            const existing = byId.get(entry.id);
            if (!existing || entry.questionCount > existing.questionCount) byId.set(entry.id, entry);
          }
        }
      } catch (e) { /* pool may not support all features */ }
    }

    // Merge per-test settings (password / practice) + publish status
    const rows = [...byId.values()];
    try {
      const [setRes, pubRes, attRes] = await Promise.all([
        db.query(`SELECT schema_name, table_name, password, practice FROM ai_test_settings`),
        db.query(`SELECT id, schema_name, table_name, password, practice, allowed_students, published_at, is_active, result_delay_minutes FROM published_ai_tests`),
        db.query(`SELECT table_name, COUNT(*)::int AS c FROM student_exams GROUP BY table_name`)
      ]);
      const settings = new Map(setRes.rows.map((r) => [`${r.schema_name}.${r.table_name}`, r]));
      const attempts = new Map(attRes.rows.map((r) => [r.table_name, parseInt(r.c, 10) || 0]));
      const pubs = new Map();
      pubRes.rows.forEach((r) => {
        const key = `${r.schema_name}.${r.table_name}`;
        const prev = pubs.get(key);
        if (!prev || new Date(r.published_at) > new Date(prev.published_at)) pubs.set(key, r);
      });
      rows.forEach((r) => {
        const s = settings.get(r.id);
        const p = pubs.get(r.id);
        r.attemptCount = attempts.get(r.tableName) || 0;
        r.password = (s && s.password) || (p && p.password) || null;
        r.practice = !!((s && s.practice) || (p && p.practice));
        r.published = !!(p && p.is_active !== false);
        r.publishedId = p && p.is_active !== false ? p.id : null;
        r.publishedAt = p ? p.published_at : null;
        r.allStudents = p ? (p.allowed_students === null || p.allowed_students === undefined) : null;
        try {
          const arr = p && p.allowed_students ? (typeof p.allowed_students === 'string' ? JSON.parse(p.allowed_students) : p.allowed_students) : null;
          r.allowedCount = Array.isArray(arr) ? arr.length : null;
        } catch (e) { r.allowedCount = null; }
        r.resultDelayMinutes = p && p.result_delay_minutes ? parseInt(p.result_delay_minutes) : 30;
      });
    } catch (e) { console.log('⚠️ list-tests settings merge skipped:', e.message); }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error listing tests:', error);
    res.status(500).json({ error: 'Failed to list tests' });
  }
});

// POST /api/ai/clear-cache — Clear the response cache (for dev/testing)
// POST /api/ai/delete-test — remove a saved test with its publishes + student attempts
router.post('/delete-test', async (req, res) => {
  const schemaName = String(req.body.schemaName || '');
  const tableName = String(req.body.tableName || '');
  const okSchema = schemaName.startsWith('test_') && /^test_[a-z0-9_]+_schema$/.test(schemaName);
  const okTable = /^[a-z0-9_]+_term\d+_[a-z0-9_]+$/.test(tableName);
  if (!okSchema || !okTable) {
    return res.status(400).json({ error: 'Invalid test reference' });
  }
  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const att = await client.query(`DELETE FROM student_exams WHERE schema_name = $1 AND table_name = $2`, [schemaName, tableName]);
      const pubs = await client.query(`DELETE FROM published_ai_tests WHERE schema_name = $1 AND table_name = $2`, [schemaName, tableName]);
      const set = await client.query(`DELETE FROM ai_test_settings WHERE schema_name = $1 AND table_name = $2`, [schemaName, tableName]);
      await client.query(`DROP TABLE IF EXISTS "${schemaName}"."${tableName}"`);
      await client.query('COMMIT');
      res.json({
        success: true,
        data: { attempts: att.rowCount, publishes: pubs.rowCount, settings: set.rowCount, schemaName, tableName }
      });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (e2) { /* ignore */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('delete-test failed:', error.message);
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

router.post('/clear-cache', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// ─── Lesson Plan Builder Functions ─────────────────────────────────────────────
function buildLessonPlanPrompt({ topic, grade, subject, chapter, duration, language }) {
  return `You are an expert Ethiopian educator creating a detailed, classroom-ready lesson plan.

LESSON DETAILS:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}${chapter ? `\n- Chapter: ${chapter}` : ''}
- Duration: ${duration || 40} minutes
- Language: ${language || 'English'}

Generate a professional lesson plan with the following structure. Return your response as a JSON object with EXACTLY this structure:
{
  "lessonPlan": {
    "title": "${topic}",
    "grade": "${grade}",
    "subject": "${subject}",${chapter ? `\n    "chapter": "${chapter}",` : ''}
    "duration": "${duration || 40} minutes",
    "learningObjectives": ["objective 1 - measurable", "objective 2 - measurable", "objective 3 - measurable"],
    "requiredMaterials": ["material 1", "material 2"],
    "introduction": "engaging introduction paragraph (5 min)",
    "mainActivities": [
      { "step": 1, "duration": "10 min", "teacherActivity": "what teacher does", "studentActivity": "what students do" },
      { "step": 2, "duration": "10 min", "teacherActivity": "what teacher does", "studentActivity": "what students do" },
      { "step": 3, "duration": "10 min", "teacherActivity": "what teacher does", "studentActivity": "what students do" }
    ],
    "assessmentMethods": "how learning is assessed",
    "discussionQuestions": ["question 1", "question 2"],
    "summary": "wrap-up paragraph (5 min)",
    "homework": "homework assignment",
    "teacherNotes": "notes for the teacher"
  }
}

CRITICAL RULES:
1. Content must be appropriate for Grade ${grade} Ethiopian students following the national curriculum
2. Use Ethiopian context (names, places, examples) where appropriate
3. Learning objectives must be measurable and observable
4. Time allocations must be realistic for a real classroom
5. Activities must be practical and age-appropriate
6. Return ONLY valid JSON — no markdown, no extra text
7. Never make up facts — only include accurate educational content`;
}

function buildLessonNotePrompt({ topic, grade, subject, chapter, language }) {
  return `You are an expert Ethiopian educator creating detailed teacher lesson notes.

LESSON NOTE DETAILS:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}${chapter ? `\n- Chapter: ${chapter}` : ''}
- Language: ${language || 'English'}

Generate comprehensive teacher lesson notes. Return your response as a JSON object with EXACTLY this structure:
{
  "lessonNote": {
    "topic": "${topic}",
    "grade": "${grade}",
    "subject": "${subject}",${chapter ? `\n    "chapter": "${chapter}",` : ''}
    "objectives": ["objective 1", "objective 2", "objective 3"],
    "keyConcepts": [
      { "term": "concept name", "definition": "age-appropriate definition" }
    ],
    "mainExplanation": "detailed explanation of the topic in student-friendly language",
    "examples": [
      { "problem": "example question or scenario", "solution": "step-by-step solution" }
    ],
    "classroomActivities": [
      { "activity": "activity name", "instructions": "step-by-step instructions", "duration": "time" }
    ],
    "importantNotes": ["common mistakes to avoid", "key points to emphasize"],
    "summary": "concise summary of the lesson",
    "reviewQuestions": [
      { "question": "review question", "expectedAnswer": "correct answer" }
    ]
  }
}

CRITICAL RULES:
1. Content must be appropriate for Grade ${grade} Ethiopian students
2. Use Ethiopian context (names, places, examples) where appropriate
3. Explanations must be clear, student-friendly, and educationally sound
4. Key concepts must have accurate definitions
5. Return ONLY valid JSON — no markdown, no extra text
6. Never make up facts — only include accurate educational content`;
}

function callDeepSeek(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('AI API key not configured. Set DEEPSEEK_API_KEY in .env');
  }
  if (process.env.MOCK_AI === 'true') {
    return getMockResponse(prompt);
  }
  return fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [
        { role: "system", content: "You are Skoolific AI, an expert Ethiopian educator assistant. Generate accurate, curriculum-aligned educational materials. Never make up facts." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8192,
      stream: false,
      thinking: { type: "enabled" },
      reasoning_effort: "high"
    })
  });
}

// POST /api/ai/generate-lesson-plan — Generate a lesson plan using DeepSeek
router.post('/generate-lesson-plan', async (req, res) => {
  const { topic, grade, subject, chapter, duration, language } = req.body;
  if (!topic || !grade || !subject) {
    return res.status(400).json({ error: 'Missing required fields: topic, grade, subject' });
  }

  try {
    const prompt = buildLessonPlanPrompt({ topic, grade, subject, chapter, duration, language });
    const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const response = await callDeepSeek(prompt);
    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek error:', err);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, ''));

    const result = { success: true, data: json };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Lesson plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate lesson plan: ' + error.message });
  }
});

// POST /api/ai/generate-lesson-note — Generate a lesson note using DeepSeek
router.post('/generate-lesson-note', async (req, res) => {
  const { topic, grade, subject, chapter, language } = req.body;
  if (!topic || !grade || !subject) {
    return res.status(400).json({ error: 'Missing required fields: topic, grade, subject' });
  }

  try {
    const prompt = buildLessonNotePrompt({ topic, grade, subject, chapter, language });
    const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const response = await callDeepSeek(prompt);
    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek error:', err);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, ''));

    const result = { success: true, data: json };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Lesson note generation error:', error);
    res.status(500).json({ error: 'Failed to generate lesson note: ' + error.message });
  }
});

// ─── Homework Prompt Builder ──────────────────────────────────────────────────
function buildHomeworkPrompt({ topic, grade, subject, chapter, difficulty, language, questionTypes, count }) {
  const types = questionTypes || ['multiple_choice', 'short_answer', 'true_false', 'fill_blank'];
  return `You are an expert Ethiopian educator creating a homework assignment.

HOMEWORK DETAILS:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}${chapter ? `\n- Chapter: ${chapter}` : ''}
- Difficulty: ${difficulty || 'Medium'}
- Language: ${language || 'English'}
- Question Types: ${types.join(', ')}
- Number of questions per type: ${count || 5}

Generate a comprehensive homework assignment. Return JSON with EXACTLY this structure:
{
  "homework": {
    "topic": "${topic}",
    "grade": "${grade}",
    "subject": "${subject}",
    "instructions": "clear instructions for students",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "question text",
        "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
        "correctAnswer": "A",
        "explanation": "educational explanation"
      }
    ],
    "totalQuestions": number,
    "answerKey": "answer key for teacher reference"
  }
}

CRITICAL RULES:
1. Content appropriate for Grade ${grade} Ethiopian students
2. Use Ethiopian context (names, places, Birr, etc.)
3. ${types.includes('fill_blank') ? 'For fill_blank, use _____ (5 underscores)' : ''}
4. MCQ options: one clearly correct, three incorrect but plausible
5. Return ONLY valid JSON — no markdown, no extra text
6. Never make up facts`;
}

// ─── Worksheet Prompt Builder ────────────────────────────────────────────────
function buildWorksheetPrompt({ topic, grade, subject, chapter, language, activityTypes }) {
  const activities = activityTypes || ['exercises', 'matching', 'fill_blanks', 'identification'];
  return `You are an expert Ethiopian educator creating a classroom worksheet.

WORKSHEET DETAILS:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}${chapter ? `\n- Chapter: ${chapter}` : ''}
- Language: ${language || 'English'}
- Activity Types: ${activities.join(', ')}

Generate a printable worksheet. Return JSON with EXACTLY this structure:
{
  "worksheet": {
    "topic": "${topic}",
    "grade": "${grade}",
    "subject": "${subject}",
    "studentName": "____________________",
    "date": "____________________",
    "instructions": "general instructions",
    "sections": [
      {
        "title": "section title",
        "type": "exercises|matching|fill_blanks|identification",
        "instructions": "section-specific instructions",
        "questions": [
          { "id": 1, "question": "question text", "answer": "correct answer" }
        ]
      }
    ],
    "bonusChallenge": "optional extra challenge"
  }
}

CRITICAL RULES:
1. Content appropriate for Grade ${grade} Ethiopian students
2. Use Ethiopian context (names, places, examples)
3. Progressive difficulty within each section (easier → harder)
4. Return ONLY valid JSON — no markdown, no extra text
5. Never make up facts`;
}

// ─── Scramble Exam Prompt Builder ────────────────────────────────────────────
function buildScrambleExamPrompt({ topic, grade, subject, chapter, totalMarks, timeLimit, difficulty, language }) {
  return `You are an expert Ethiopian educator creating a comprehensive exam with 3 shuffled versions.

EXAM DETAILS:
- Subject: ${subject}
- Grade: ${grade}
- Topic: ${topic}${chapter ? `\n- Chapter: ${chapter}` : ''}
- Total Marks: ${totalMarks || 50}
- Time Limit: ${timeLimit || 60} minutes
- Difficulty: ${difficulty || 'Medium'}
- Language: ${language || 'English'}

Generate an exam with 3 versions (A, B, C) where questions and MCQ options are shuffled. Return JSON with EXACTLY this structure:
{
  "scrambleExam": {
    "title": "${topic} Exam",
    "grade": "${grade}",
    "subject": "${subject}",
    "totalMarks": ${totalMarks || 50},
    "timeLimit": ${timeLimit || 60},
    "instructions": "general exam instructions",
    "versions": {
      "A": { "label": "Version A", "sections": [ { "section": "A", "type": "multiple_choice", "questions": [ { "id": 1, "question": "text", "marks": number, "options": ["A. opt1","B. opt2","C. opt3","D. opt4"], "correctAnswer": "A", "explanation": "text" } ] } ] },
      "B": { "label": "Version B", "sections": [ ... same questions in DIFFERENT order, options SHUFFLED ] },
      "C": { "label": "Version C", "sections": [ ... same questions in DIFFERENT order, options SHUFFLED differently ] }
    },
    "answerKey": { "A": { "1": "A", "2": "False" }, "B": { "1": "D", "2": "True" }, "C": { "1": "B", "2": "True" } }
  }
}

CRITICAL RULES:
1. Content appropriate for Grade ${grade} Ethiopian students
2. Use Ethiopian context
3. All 3 versions must cover the SAME content at the SAME difficulty
4. Version B: reorder questions randomly, shuffle MCQ options
5. Version C: reorder differently from B, shuffle differently
6. Update correctAnswer to match shuffled options
7. Return ONLY valid JSON — no markdown, no extra text`;
}

// POST /api/ai/generate-homework — Generate homework using DeepSeek
router.post('/generate-homework', async (req, res) => {
  const { topic, grade, subject, chapter, difficulty, language, questionTypes, count } = req.body;
  if (!topic || !grade || !subject) return res.status(400).json({ error: 'topic, grade, subject required' });
  try {
    const prompt = buildHomeworkPrompt({ topic, grade, subject, chapter, difficulty, language, questionTypes, count });
    const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const response = await callDeepSeek(prompt);
    if (!response.ok) return res.status(502).json({ error: 'AI service temporarily unavailable' });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, ''));
    const result = { success: true, data: json };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Homework generation error:', error);
    res.status(500).json({ error: 'Failed to generate homework: ' + error.message });
  }
});

// POST /api/ai/generate-worksheet — Generate worksheet using DeepSeek
router.post('/generate-worksheet', async (req, res) => {
  const { topic, grade, subject, chapter, language, activityTypes } = req.body;
  if (!topic || !grade || !subject) return res.status(400).json({ error: 'topic, grade, subject required' });
  try {
    const prompt = buildWorksheetPrompt({ topic, grade, subject, chapter, language, activityTypes });
    const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const response = await callDeepSeek(prompt);
    if (!response.ok) return res.status(502).json({ error: 'AI service temporarily unavailable' });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, ''));
    const result = { success: true, data: json };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Worksheet generation error:', error);
    res.status(500).json({ error: 'Failed to generate worksheet: ' + error.message });
  }
});

// POST /api/ai/generate-scramble-exam — Generate scramble exam using DeepSeek
router.post('/generate-scramble-exam', async (req, res) => {
  const { topic, grade, subject, chapter, totalMarks, timeLimit, difficulty, language } = req.body;
  if (!topic || !grade || !subject) return res.status(400).json({ error: 'topic, grade, subject required' });
  try {
    const prompt = buildScrambleExamPrompt({ topic, grade, subject, chapter, totalMarks, timeLimit, difficulty, language });
    const cacheKey = crypto.createHash('md5').update(prompt).digest('hex');
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ ...cached, fromCache: true });

    const response = await callDeepSeek(prompt);
    if (!response.ok) return res.status(502).json({ error: 'AI service temporarily unavailable' });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, ''));
    const result = { success: true, data: json };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Scramble exam generation error:', error);
    res.status(500).json({ error: 'Failed to generate scramble exam: ' + error.message });
  }
});

// ─── Mock Response Generator (for testing without API credits) ────────────────
function getMockResponse(prompt) {
  const p = prompt.toLowerCase();
  let sample;
  if (p.includes('lesson plan') || p.includes('lessonplan')) {
    sample = JSON.stringify({
      lessonPlan: {
        title: "Sample Lesson Plan (Mock)",
        grade: "Grade 10", subject: "Science",
        duration: "40 minutes",
        learningObjectives: ["Identify key concepts", "Apply knowledge to problems", "Demonstrate understanding through practice"],
        requiredMaterials: ["Textbook", "Whiteboard", "Handout worksheets"],
        introduction: "Begin by reviewing previous lesson. Ask students what they remember.",
        mainActivities: [
          { step: 1, duration: "15 min", teacherActivity: "Present new concepts using visual aids", studentActivity: "Take notes and ask questions" },
          { step: 2, duration: "15 min", teacherActivity: "Guide students through practice exercises", studentActivity: "Complete exercises individually then discuss in pairs" },
          { step: 3, duration: "5 min", teacherActivity: "Review answers and clarify misconceptions", studentActivity: "Correct their work and ask follow-up questions" }
        ],
        assessmentMethods: "Exit ticket with 3 quick questions to check understanding",
        discussionQuestions: ["What did you find most interesting?", "How can you apply this outside the classroom?"],
        summary: "Today we covered the main concepts. Remember the key points for homework.",
        homework: "Complete worksheet pages 5-7. Due next class.",
        teacherNotes: "Ensure all students participate. Check for understanding frequently."
      }
    });
  } else if (p.includes('lesson note') || p.includes('lessonnote')) {
    sample = JSON.stringify({
      lessonNote: {
        topic: "Sample Lesson Note (Mock)", grade: "Grade 10", subject: "Science",
        objectives: ["Understand fundamental concepts", "Apply knowledge correctly"],
        keyConcepts: [{ term: "Concept 1", definition: "The primary idea of the lesson" }, { term: "Concept 2", definition: "Supporting concept that builds on Concept 1" }],
        mainExplanation: "Detailed explanation of the topic in student-friendly language. Begin with the basics, then move to more complex ideas.",
        examples: [{ problem: "Sample problem 1", solution: "Step-by-step solution here" }, { problem: "Sample problem 2", solution: "Step-by-step solution here" }],
        classroomActivities: [{ activity: "Group Discussion", instructions: "Split into groups of 4. Discuss the key concepts.", duration: "10 min" }],
        importantNotes: ["Common mistake: confusing Concept 1 and Concept 2", "Key point: Always show your work"],
        summary: "In this lesson we learned the main concepts and practiced applying them.",
        reviewQuestions: [{ question: "Define Concept 1", expectedAnswer: "The primary idea of the lesson" }]
      }
    });
  } else if (p.includes('homework')) {
    sample = JSON.stringify({
      homework: {
        topic: "Sample Homework (Mock)", grade: "Grade 10", subject: "Science",
        instructions: "Answer all questions. Show your work where applicable.",
        questions: [
          { id: 1, type: "multiple_choice", question: "What is the correct answer?", options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], correctAnswer: "B", explanation: "Because Option 2 is the most accurate" },
          { id: 2, type: "true_false", question: "This statement is true.", options: ["True", "False"], correctAnswer: "True", explanation: "The statement aligns with the lesson" },
          { id: 3, type: "short_answer", question: "Explain in your own words why Concept 1 is important.", correctAnswer: "Because it forms the foundation", explanation: "Students should demonstrate understanding" }
        ],
        totalQuestions: 3,
        answerKey: "1:B, 2:True, 3:See explanation"
      }
    });
  } else if (p.includes('worksheet')) {
    sample = JSON.stringify({
      worksheet: {
        topic: "Sample Worksheet (Mock)", grade: "Grade 10", subject: "Science",
        studentName: "____________________", date: "____________________",
        instructions: "Complete all sections. Read each instruction carefully.",
        sections: [
          { title: "Section A: Multiple Choice", type: "exercises", instructions: "Choose the best answer", questions: [{ id: 1, question: "Question 1?", answer: "Answer 1" }, { id: 2, question: "Question 2?", answer: "Answer 2" }] },
          { title: "Section B: Matching", type: "matching", instructions: "Draw lines to match", questions: [{ id: 3, question: "Match item A", answer: "Matches with X" }] }
        ],
        bonusChallenge: "⭐ Challenge: Create your own example and explain it."
      }
    });
  } else if (p.includes('scramble') || p.includes('3 versions')) {
    sample = JSON.stringify({
      scrambleExam: {
        title: "Sample Scramble Exam (Mock)", grade: "Grade 10", subject: "Science", totalMarks: 30, timeLimit: 45,
        instructions: "Read all questions carefully. Show your work.",
        versions: {
          A: { label: "Version A", sections: [{ section: "A", type: "multiple_choice", questions: [{ id: 1, question: "Q1 Version A?", marks: 2, options: ["A. Opt1","B. Opt2","C. Opt3","D. Opt4"], correctAnswer: "B", explanation: "Explanation" }] }] },
          B: { label: "Version B", sections: [{ section: "A", type: "multiple_choice", questions: [{ id: 1, question: "Q1 Version B?", marks: 2, options: ["A. Opt3","B. Opt1","C. Opt2","D. Opt4"], correctAnswer: "C", explanation: "Explanation" }] }] },
          C: { label: "Version C", sections: [{ section: "A", type: "multiple_choice", questions: [{ id: 1, question: "Q1 Version C?", marks: 2, options: ["A. Opt4","B. Opt3","C. Opt2","D. Opt1"], correctAnswer: "D", explanation: "Explanation" }] }] }
        },
        answerKey: { A: { "1": "B" }, B: { "1": "C" }, C: { "1": "D" } }
      }
    });
  } else {
    sample = JSON.stringify({
      exam: { title: "Sample Test (Mock)", totalMarks: 20,
        questions: [{ id: 1, type: "multiple_choice", question: "Sample question?", marks: 2, options: ["A. Opt1","B. Opt2","C. Opt3","D. Opt4"], correctAnswer: "B", explanation: "Explanation" }]
      }
    });
  }
  return { ok: true, json: () => Promise.resolve({ choices: [{ message: { content: sample } }] }) };
}

// GET /api/ai/list-classes — List all classes and subjects from DB
router.get('/list-classes', async (req, res) => {
  try {
    const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='classes_schema'");
    const classes = tables.rows.map(r => r.table_name);
    res.json({ success: true, data: { classes, subjects: ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Civics', 'ICT', 'Amharic', 'Arabic', 'Oromo', 'Business', 'Economics', 'General Science'] } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ai/class-students — List student names for a specific class
router.get('/class-students', async (req, res) => {
  const { className } = req.query;
  if (!className) return res.status(400).json({ error: 'className required' });
  try {
    const sanitized = className.replace(/[^a-zA-Z0-9_]/g, '');
    // Find actual table name with case-insensitive lookup
    const tableCheck = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='classes_schema' AND LOWER(table_name) = LOWER($1)`,
      [sanitized]
    );
    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ error: `Class "${className}" not found` });
    }
    const actualTable = tableCheck.rows[0].table_name;
    const result = await db.query(`SELECT student_name FROM classes_schema."${actualTable}" ORDER BY student_name`);
    const names = result.rows.map(r => r.student_name);
    res.json({ success: true, data: names });
  } catch(e) {
    console.error('Error fetching class students:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
