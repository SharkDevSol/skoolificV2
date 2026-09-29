// Pure helpers that build the printable Word (.doc) paper (kept out of the
// component file so they can be unit-tested).

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// which option is correct? answer is a letter ("D") or the option text itself
export const answerIndex = (q) => {
  const opts = q.options || [];
  const a = q.answer == null ? '' : String(q.answer).trim();
  if (!a || opts.length === 0) return -1;
  if (/^[A-Za-z]$/.test(a)) {
    const i = a.toUpperCase().charCodeAt(0) - 65;
    if (i >= 0 && i < opts.length) return i;
  }
  return opts.findIndex((o) => String(o).trim() === a);
};

// one scrambled copy of the test (question order + MCQ options + matching column B)
export const buildCopy = (questions) => shuffle(questions).map((q) => {
  if (q.type === 'mcq' && (q.options || []).length > 1) {
    const ai = answerIndex(q);
    const order = shuffle(q.options.map((_, i) => i));
    return {
      ...q,
      options: order.map((i) => q.options[i]),
      printedAnswerLetter: null,
      correctAfterShuffle: order.indexOf(ai)
    };
  }
  if (q.type === 'matching') {
    return { ...q, rightColumn: shuffle(q.rightColumn || []) };
  }
  return { ...q };
});

// 15 questions per page when the paper is text-heavy, otherwise 20
export const perPageFor = (questions) => {
  if (!questions || questions.length === 0) return 20;
  const heavy = questions.some((q) => q.type === 'matching' || q.type === 'essay');
  const avg = questions.reduce((s, q) => {
    const optLen = (q.options || []).reduce((a, o) => a + String(o).length, 0);
    return s + String(q.question || '').length + optLen + ((q.leftColumn || []).join(' ').length + (q.rightColumn || []).join(' ').length);
  }, 0) / questions.length;
  return (heavy || avg > 260) ? 15 : 20;
};

export const questionHtml = (q, n) => {
  const marks = Number(q.marks) || 0;
  const head = `<div class="q"><span class="qn">${n}.</span> <span class="qt">${esc(q.question)}</span>` +
    (marks ? `<span class="mk">(${marks} mark${marks === 1 ? '' : 's'})</span>` : '');

  if (q.type === 'mcq' && (q.options || []).length > 0) {
    const rows = q.options.map((o, i) =>
      `<div class="opt"><span class="ol">${LETTERS[i] || (i + 1)}.</span> ${esc(o)}</div>`
    ).join('');
    return `${head}${rows}</div>`;
  }
  if (q.type === 'true_false') {
    return `${head}<div class="tf"><span>True&nbsp;&nbsp;(&nbsp;&nbsp;&nbsp;&nbsp;)</span><span>False&nbsp;&nbsp;(&nbsp;&nbsp;&nbsp;&nbsp;)</span></div></div>`;
  }
  if (q.type === 'matching') {
    const left = (q.leftColumn || []);
    const right = (q.rightColumn || []);
    const rows = left.map((l, i) =>
      `<tr><td class="ml">${i + 1}. ${esc(l)}</td><td class="mr">${LETTERS[i] || ''}. ${esc(right[i] != null ? right[i] : '')}</td></tr>`
    ).join('');
    return `${head}<table class="mt">${rows}</table><div class="hint">Write your answer as: number &ndash; letter (e.g. 1 &ndash; C)</div></div>`;
  }
  if (q.type === 'fill_blank' || q.type === 'short_answer' || q.type === 'numeric' || q.type === 'essay') {
    const lines = q.type === 'essay' || q.type === 'short_answer'
      ? '<div class="line">&nbsp;</div><div class="line">&nbsp;</div><div class="line">&nbsp;</div>'
      : '<div class="ans">Answer: ___________________________________________</div>';
    return `${head}${lines}</div>`;
  }
  return `${head}<div class="ans">Answer: ___________________________________________</div></div>`;
};

// Build the Word (.doc) HTML for the whole print job — pure, exported for tests
// perPage <= 0 → "flow" mode: no forced breaks inside a copy, Word fills every
// page to the bottom (breaks only appear between copies).
export const buildDocHtml = ({ test, questions, schoolName, logoUrl, componentMarks, timeLimit, perPage, copiesAvailable }) => {
  const compName = String(test.componentName || '').replace(/_/g, ' ').toUpperCase();
  const cls = String(test.className || '').toUpperCase();
  const markLabel = componentMarks != null ? componentMarks : (questions.reduce((s, q) => s + (Number(q.marks) || 0), 0) || '');
  const title = `Exam of ${test.subject} ${cls} ${compName} from ${markLabel} marks Term ${test.termNumber}`;
  const copies = [];
  for (let c = 0; c < copiesAvailable; c++) copies.push(buildCopy(questions));

  const flow = !perPage || perPage <= 0;
  const pagesPerCopy = Math.max(1, Math.ceil(questions.length / (flow ? perPageFor(questions) : perPage)));

  const headerFor = (ci) => `
            <table class="hdr"><tr>
              <td class="logoCell" width="72" valign="middle">${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" width="54" height="54" border="0" alt="">` : ''}</td>
              <td class="ttlCell" valign="middle">
                <div class="school">${esc(schoolName || '')}</div>
                <div class="exam">${esc(title)}</div>
                <div class="sub">${esc(test.subject)} &middot; Class ${esc(cls)} &middot; ${esc(compName)} &middot; Term ${esc(String(test.termNumber))}${timeLimit ? ` &middot; ${timeLimit} minutes` : ''}</div>
              </td>
              <td class="copyCell" width="95" valign="top">Copy ${ci + 1} of ${copies.length}</td>
            </tr></table>
            <table class="info"><tr>
              <td>Name: ______________________</td>
              <td>Date: ______________</td>
              <td>Marks: ________ / ${esc(String(markLabel))}</td>
            </tr></table><hr class="rule">`;

  let body = '';
  copies.forEach((qs, ci) => {
    if (flow) {
      const isLastCopy = ci === copies.length - 1;
      const nums = qs.map((q, i) => questionHtml(q, i + 1)).join('');
      body += `<div class="page${isLastCopy ? ' last' : ''}">${headerFor(ci)}
            <div class="pageMeta">${esc(title)} &middot; Copy ${ci + 1} of ${copies.length}</div>
            ${nums}</div>`;
      return;
    }
    for (let p = 0; p * perPage < qs.length; p++) {
      const slice = qs.slice(p * perPage, (p + 1) * perPage);
      const isLastPageOfDoc = (ci === copies.length - 1) && ((p + 1) * perPage >= qs.length);
      const header = p === 0 ? headerFor(ci) : '';
      const from = p * perPage + 1;
      const nums = slice.map((q, i) => questionHtml(q, from + i)).join('');
      body += `<div class="page${isLastPageOfDoc ? ' last' : ''}">${header}
            <div class="pageMeta">${esc(title)} &middot; Copy ${ci + 1} of ${copies.length} &middot; Page ${p + 1} of ${pagesPerCopy}</div>
            ${nums}</div>`;
    }
  });

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="iqra-test-printer">
<title>${esc(title)}</title>
<style>
  @page { size: 21cm 29.7cm; margin: 0.9cm 1.1cm; }
  body { font-family: Arial, "Segoe UI", Helvetica, sans-serif; font-size: 10pt; color: #000; margin: 0; line-height: 1.15; }
  .page { page-break-after: always; }
  .page.last { page-break-after: auto; }
  table.hdr { width: 100%; border-collapse: collapse; margin-bottom: 3pt; }
  td.logoCell { width: 72px; vertical-align: middle; text-align: center; }
  img.logo { width: 1.45cm; height: 1.45cm; }
  td.ttlCell { vertical-align: middle; text-align: center; }
  .school { font-size: 9pt; font-weight: bold; letter-spacing: .3pt; }
  .exam { font-size: 11.5pt; font-weight: bold; margin-top: 1pt; }
  .sub { font-size: 8.5pt; color: #333; margin-top: 1pt; }
  td.copyCell { width: 95px; vertical-align: top; text-align: right; font-size: 9pt; font-weight: bold; }
  table.info { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 3pt; }
  table.info td { padding: 2pt 4pt; }
  hr.rule { border: none; border-top: 1.4pt solid #000; margin: 3pt 0 7pt 0; }
  .pageMeta { display: none; }
  .q { margin: 0 0 7pt 0; page-break-inside: avoid; }
  .qn { font-weight: bold; }
  .mk { font-size: 8pt; color: #444; margin-left: 5pt; }
  .opt { margin: 2pt 0 0 18pt; }
  .ol { font-weight: bold; }
  .tf { margin: 3pt 0 0 18pt; }
  .tf span { margin-right: 34pt; }
  .ans { margin: 4pt 0 0 18pt; }
  .line { margin: 9pt 0 0 18pt; border-bottom: .8pt dotted #000; }
  .hint { margin: 3pt 0 0 18pt; font-size: 8.5pt; color: #333; }
  table.mt { border-collapse: collapse; margin: 4pt 0 0 18pt; }
  td.ml, td.mr { padding: 3pt 8pt; border-bottom: .7pt solid #999; width: 7.9cm; vertical-align: top; font-size: 9.5pt; }
  td.ml { border-right: .7pt solid #999; }
</style>
</head>
<body>${body}</body></html>`;

  return { html, title, copiesCount: copies.length, pagesPerCopy };
};

