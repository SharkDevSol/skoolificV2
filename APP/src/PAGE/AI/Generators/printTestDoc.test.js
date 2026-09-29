import { describe, it, expect } from 'vitest';
import { esc, answerIndex, buildCopy, perPageFor, questionHtml, buildDocHtml } from './printTestDoc';

const shortMcq = (question, options, answer, marks = 1) => ({ type: 'mcq', question, options, answer, marks });

const sample = [
  shortMcq('2 + 2 = ?', ['3', '4', '5', '6'], 'B'),
  shortMcq('Which number is prime?', ['9', '13', '21', '27'], '13', 2),
  { type: 'true_false', question: 'The number 1 is a prime number.', options: [], answer: 'False', marks: 1 },
  { type: 'fill_blank', question: 'The first multiples of 6 are: ____, ____, 18.', options: [], answer: '6, 12', marks: 1 },
  {
    type: 'matching',
    question: 'Match the rule with its description.',
    options: [],
    answer: '',
    marks: 5,
    leftColumn: ['Divisible by 2', 'Divisible by 3'],
    rightColumn: ['The sum of its digits is divisible by 3', 'Its ones digit is even']
  }
];

const testRef = {
  subject: 'Mathematics',
  className: 'g1',
  termNumber: '2',
  componentName: 'mid'
};

const pageDivs = (html) => (html.match(/<div class="page( last)?"/g) || []).length;

describe('esc', () => {
  it('escapes html special characters', () => {
    expect(esc('<b> & "x"')).toBe('&lt;b&gt; &amp; &quot;x&quot;');
    expect(esc(null)).toBe('');
  });
});

describe('answerIndex', () => {
  it('reads a letter answer', () => {
    expect(answerIndex({ options: ['a', 'b', 'c', 'd'], answer: 'C' })).toBe(2);
    expect(answerIndex({ options: ['a', 'b', 'c', 'd'], answer: 'd' })).toBe(3);
  });

  it('reads a full-text answer', () => {
    expect(answerIndex({ options: ['9', '13'], answer: '13' })).toBe(1);
  });

  it('returns -1 when unusable', () => {
    expect(answerIndex({ options: [], answer: 'B' })).toBe(-1);
    expect(answerIndex({ options: ['a', 'b'], answer: 'nope' })).toBe(-1);
  });
});

describe('perPageFor', () => {
  it('uses 20 questions per page for short mcq papers', () => {
    expect(perPageFor(sample.filter((q) => q.type === 'mcq'))).toBe(20);
  });

  it('drops to 15 for text-heavy papers (matching)', () => {
    expect(perPageFor(sample)).toBe(15);
  });

  it('defaults to 20 for an empty test', () => {
    expect(perPageFor([])).toBe(20);
  });
});

describe('buildCopy', () => {
  it('keeps every question and every option', () => {
    const copy = buildCopy(sample);
    expect(copy).toHaveLength(sample.length);
    const mcq = copy.find((q) => q.question === '2 + 2 = ?');
    expect(mcq.options.slice().sort()).toEqual(['3', '4', '5', '6'].slice().sort());
  });

  it('keeps the correct option text when options are shuffled', () => {
    for (let i = 0; i < 25; i++) {
      const [c] = buildCopy([sample[1]]);
      const correctIndex = c.options.indexOf('13');
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      expect(c.correctAfterShuffle).toBe(correctIndex);
    }
  });

  it('shuffles matching column B but keeps both columns', () => {
    const [q] = buildCopy([sample[4]]);
    expect(q.leftColumn).toEqual(sample[4].leftColumn);
    expect(q.rightColumn.slice().sort()).toEqual(sample[4].rightColumn.slice().sort());
  });

  it('does not mutate the original test', () => {
    const before = JSON.stringify(sample);
    buildCopy(sample);
    expect(JSON.stringify(sample)).toBe(before);
  });
});

describe('questionHtml', () => {
  it('prints mcq options with letters and never the answer', () => {
    const html = questionHtml(sample[1], 7);
    expect(html).toContain('7.');
    expect(html).toContain('Which number is prime?');
    expect(html).toContain('(2 marks)');
    expect(html.match(/class="opt"/g)).toHaveLength(4);
    expect(html).toMatch(/class="ol">A\./);
    expect(html).not.toMatch(/correct|answer/i);
  });

  it('prints true/false as tick boxes without the answer', () => {
    const html = questionHtml(sample[2], 1);
    expect(html).toContain('True');
    expect(html).toContain('False');
    expect(html).toMatch(/class="tf"/);
    expect(html).not.toMatch(/answer/i);
  });

  it('prints matching as two numbered/lettered columns', () => {
    const html = questionHtml(sample[4], 3);
    expect(html).toContain('1. Divisible by 2');
    expect(html).toMatch(/class="mr">A\./);
    expect(html).not.toContain('correctMatches');
  });

  it('prints an answer line for written questions', () => {
    expect(questionHtml(sample[3], 2)).toContain('Answer: ___');
  });
});

describe('buildDocHtml', () => {
  const opts = {
    test: testRef,
    questions: sample,
    schoolName: 'Iqra School',
    logoUrl: 'https://iqra.skoolific.com/uploads/branding/icon.png',
    componentMarks: 25,
    timeLimit: 30,
    perPage: 15,
    copiesAvailable: 1
  };

  it('builds a Word-compatible A4 document', () => {
    const { html } = buildDocHtml(opts);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
    expect(html).toContain('@page { size: 21cm 29.7cm;');
    expect(html).toContain('page-break-after: always');
  });

  it('prints the required header line, logo and copy number', () => {
    const { html, title } = buildDocHtml(opts);
    expect(title).toBe('Exam of Mathematics G1 MID from 25 marks Term 2');
    expect(html).toContain('Exam of Mathematics G1 MID from 25 marks Term 2');
    expect(html).toContain('Iqra School');
    expect(html).toContain('src="https://iqra.skoolific.com/uploads/branding/icon.png"');
    expect(html).toContain('Copy 1 of 1');
    expect(html).toContain('30 minutes');
  });

  it('breaks pages every N questions', () => {
    const many = [];
    for (let i = 0; i < 25; i++) many.push(shortMcq(`Question ${i + 1}?`, ['a', 'b'], 'a'));
    const { html } = buildDocHtml({ ...opts, questions: many, perPage: 20 });
    expect(pageDivs(html)).toBe(2);
    expect(html).toContain('Page 1 of 2');
    expect(html).toContain('Page 2 of 2');
    expect(html).toContain('>21.</span>');
    expect(html.match(/class="page last"/g)).toHaveLength(1);
  });

  it('makes one numbered copy per requested copy', () => {
    const { html, copiesCount } = buildDocHtml({ ...opts, perPage: 100, copiesAvailable: 4 });
    expect(copiesCount).toBe(4);
    expect(html).toContain('Copy 1 of 4');
    expect(html).toContain('Copy 4 of 4');
    expect(pageDivs(html)).toBe(4);
    expect(html.match(/class="page last"/g)).toHaveLength(1);
  });

  it('uses the compact layout: 10pt text, small logo, slim margins', () => {
    const { html } = buildDocHtml(opts);
    expect(html).toContain('font-size: 10pt');
    expect(html).toContain('margin: 0.9cm 1.1cm;');
    expect(html).toContain('width="54" height="54"');
    expect(html).toContain('width="72"');
    expect(html).toContain('width="95"');
  });

  it('flow mode fills the page instead of forcing breaks', () => {
    const many = [];
    for (let i = 0; i < 25; i++) many.push(shortMcq(`Question ${i + 1}?`, ['a', 'b'], 'a'));
    const { html } = buildDocHtml({ ...opts, questions: many, perPage: 0 });
    expect(pageDivs(html)).toBe(1);
    expect(html).not.toContain('Page 1 of');
    expect(html).toContain('>25.</span>');
    expect(html.match(/class="page last"/g)).toHaveLength(1);
  });

  it('flow mode still separates copies with a page break', () => {
    const { html } = buildDocHtml({ ...opts, perPage: 0, copiesAvailable: 2 });
    expect(pageDivs(html)).toBe(2);
    expect(html).toContain('Copy 1 of 2');
    expect(html).toContain('Copy 2 of 2');
    expect(html.match(/class="page last"/g)).toHaveLength(1);
  });

  it('is paper-safe: no answer data ever reaches the paper', () => {
    const { html } = buildDocHtml(opts);
    expect(html).not.toMatch(/correctAnswer/);
    expect(html).not.toMatch(/explanation/i);
    expect(html).not.toMatch(/class="correct/i);
    expect(html).not.toContain('"answer"');
  });

  it('escapes question text', () => {
    const { html } = buildDocHtml({
      ...opts,
      questions: [{ type: 'fill_blank', question: 'Use <script> tags', options: [], answer: 'x', marks: 1 }]
    });
    expect(html).toContain('Use &lt;script&gt; tags');
    expect(html).not.toContain('<script>');
  });
});
