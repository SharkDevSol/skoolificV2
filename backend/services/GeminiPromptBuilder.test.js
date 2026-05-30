/**
 * GeminiPromptBuilder Tests
 * 
 * Tests for Task 3.2.1: Create GeminiPromptBuilder class
 * 
 * Test Coverage:
 * 1. buildExamPrompt() method with valid configuration
 * 2. formatQuestionTypes() helper method
 * 3. PTCF framework structure validation
 */

const GeminiPromptBuilder = require('./GeminiPromptBuilder');

describe('GeminiPromptBuilder', () => {
  let promptBuilder;

  beforeEach(() => {
    promptBuilder = new GeminiPromptBuilder();
  });

  // ============================================================================
  // TEST SUITE 1: formatQuestionTypes() method
  // ============================================================================
  describe('1. formatQuestionTypes() method', () => {
    test('1.1 Should format single question type correctly', () => {
      const questionTypes = [
        { count: 5, type: 'multiple_choice', marksEach: 2 }
      ];

      const result = promptBuilder.formatQuestionTypes(questionTypes);

      expect(result).toBe('5 multiple_choice questions (2 marks each)');
    });

    test('1.2 Should format multiple question types correctly', () => {
      const questionTypes = [
        { count: 5, type: 'multiple_choice', marksEach: 2 },
        { count: 3, type: 'true_false', marksEach: 1 },
        { count: 2, type: 'essay', marksEach: 10 }
      ];

      const result = promptBuilder.formatQuestionTypes(questionTypes);

      expect(result).toBe(
        '5 multiple_choice questions (2 marks each), 3 true_false questions (1 marks each), 2 essay questions (10 marks each)'
      );
    });

    test('1.3 Should handle empty question types array', () => {
      const questionTypes = [];

      const result = promptBuilder.formatQuestionTypes(questionTypes);

      expect(result).toBe('');
    });
  });

  // ============================================================================
  // TEST SUITE 2: buildExamPrompt() method
  // ============================================================================
  describe('2. buildExamPrompt() method', () => {
    test('2.1 Should build prompt with all required parameters', () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'Mathematics',
        unit: 'Unit 1: Algebra',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 3, type: 'true_false', marksEach: 1 }
        ],
        difficulty: 'Medium',
        totalMarks: 13,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      // Verify PERSONA section
      expect(prompt).toContain('**PERSONA**');
      expect(prompt).toContain('expert Ethiopian educator');
      expect(prompt).toContain('Mathematics');
      expect(prompt).toContain('Grade 9');
      expect(prompt).toContain('Ethiopian National Curriculum');

      // Verify TASK section
      expect(prompt).toContain('**TASK**');
      expect(prompt).toContain('Unit Test');
      expect(prompt).toContain('Unit 1: Algebra');
      expect(prompt).toContain('Total Marks: 13');
      expect(prompt).toContain('Difficulty Level: Medium');
      expect(prompt).toContain('Language: English');
      expect(prompt).toContain('5 multiple_choice questions (2 marks each)');
      expect(prompt).toContain('3 true_false questions (1 marks each)');

      // Verify CONTEXT section
      expect(prompt).toContain('**CONTEXT**');
      expect(prompt).toContain('Ethiopian students');
      expect(prompt).toContain('Ethiopian Ministry of Education');
      expect(prompt).toContain('culturally appropriate');

      // Verify FORMAT section
      expect(prompt).toContain('**FORMAT**');
      expect(prompt).toContain('JSON object');
      expect(prompt).toContain('"exam"');
      expect(prompt).toContain('"questions"');

      // Verify REQUIREMENTS section
      expect(prompt).toContain('**REQUIREMENTS**');
      expect(prompt).toContain('Group all questions by type');
      expect(prompt).toContain('Ensure total marks sum to 13');
    });

    test('2.2 Should build prompt with different subject and grade', () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Physics',
        unit: 'Unit 2: Motion',
        language: 'Amharic',
        questionTypes: [
          { count: 4, type: 'short_answer', marksEach: 5 }
        ],
        difficulty: 'Hard',
        totalMarks: 20,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Physics');
      expect(prompt).toContain('Grade 10');
      expect(prompt).toContain('Unit 2: Motion');
      expect(prompt).toContain('Language: Amharic');
      expect(prompt).toContain('Difficulty Level: Hard');
      expect(prompt).toContain('Total Marks: 20');
      expect(prompt).toContain('Final Exam');
      expect(prompt).toContain('4 short_answer questions (5 marks each)');
    });

    test('2.3 Should include all question type formats in prompt', () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Biology',
        unit: 'Unit 3: Cells',
        language: 'English',
        questionTypes: [
          { count: 2, type: 'multiple_choice', marksEach: 3 },
          { count: 2, type: 'true_false', marksEach: 1 },
          { count: 1, type: 'matching', marksEach: 5 },
          { count: 1, type: 'fill_blank', marksEach: 2 },
          { count: 1, type: 'short_answer', marksEach: 4 },
          { count: 1, type: 'essay', marksEach: 10 },
          { count: 1, type: 'numeric', marksEach: 2 }
        ],
        difficulty: 'Easy',
        totalMarks: 29,
        componentType: 'Quiz'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('multiple_choice');
      expect(prompt).toContain('true_false');
      expect(prompt).toContain('matching');
      expect(prompt).toContain('fill_blank');
      expect(prompt).toContain('short_answer');
      expect(prompt).toContain('essay');
      expect(prompt).toContain('numeric');
    });
  });

  // ============================================================================
  // TEST SUITE 3: PTCF Framework Structure
  // ============================================================================
  describe('3. PTCF Framework Structure', () => {
    test('3.1 Should contain all four PTCF components', () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'Chemistry',
        unit: 'Unit 1: Matter',
        language: 'English',
        questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
        difficulty: 'Medium',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      // Verify all PTCF components are present
      expect(prompt).toContain('**PERSONA**');
      expect(prompt).toContain('**TASK**');
      expect(prompt).toContain('**CONTEXT**');
      expect(prompt).toContain('**FORMAT**');
    });

    test('3.2 Should include Ethiopian curriculum context', () => {
      const examConfig = {
        grade: 'Grade 11',
        subject: 'History',
        unit: 'Unit 4: Ethiopian History',
        language: 'Amharic',
        questionTypes: [{ count: 3, type: 'essay', marksEach: 10 }],
        difficulty: 'Hard',
        totalMarks: 30,
        componentType: 'Midterm Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Ethiopian National Curriculum');
      expect(prompt).toContain('Ethiopian Ministry of Education');
      expect(prompt).toContain('Ethiopian students');
      expect(prompt).toContain('Ethiopian textbooks');
      expect(prompt).toContain('culturally appropriate for Ethiopian context');
    });

    test('3.3 Should specify JSON response format', () => {
      const examConfig = {
        grade: 'Grade 7',
        subject: 'Geography',
        unit: 'Unit 1: Maps',
        language: 'English',
        questionTypes: [{ count: 4, type: 'multiple_choice', marksEach: 2 }],
        difficulty: 'Easy',
        totalMarks: 8,
        componentType: 'Quiz'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('JSON object');
      expect(prompt).toContain('"exam"');
      expect(prompt).toContain('"title"');
      expect(prompt).toContain('"instructions"');
      expect(prompt).toContain('"totalMarks"');
      expect(prompt).toContain('"questions"');
      expect(prompt).toContain('"type"');
      expect(prompt).toContain('"question"');
      expect(prompt).toContain('"marks"');
      expect(prompt).toContain('"correctAnswer"');
      expect(prompt).toContain('"explanation"');
      expect(prompt).toContain('Return ONLY valid JSON');
    });

    test('3.4 Should include all requirements', () => {
      const examConfig = {
        grade: 'Grade 12',
        subject: 'Economics',
        unit: 'Unit 2: Market Systems',
        language: 'English',
        questionTypes: [{ count: 5, type: 'short_answer', marksEach: 4 }],
        difficulty: 'Hard',
        totalMarks: 20,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Group all questions by type');
      expect(prompt).toContain('Ensure total marks sum to');
      expect(prompt).toContain('Provide clear, unambiguous questions');
      expect(prompt).toContain('Include detailed explanations');
      expect(prompt).toContain('For matching questions');
      expect(prompt).toContain('For fill-in-the-blank');
    });
  });

  // ============================================================================
  // TEST SUITE 4: Difficulty Level Guidance
  // ============================================================================
  describe('4. Difficulty Level Guidance', () => {
    test('4.1 Should include Easy difficulty guidance in prompt', () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'Mathematics',
        unit: 'Unit 1: Algebra',
        language: 'English',
        questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
        difficulty: 'Easy',
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Difficulty Level Guidance:');
      expect(prompt).toContain('basic recall');
      expect(prompt).toContain('simple concepts');
      expect(prompt).toContain('straightforward');
      expect(prompt).toContain('minimal multi-step reasoning');
    });

    test('4.2 Should include Medium difficulty guidance in prompt', () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Physics',
        unit: 'Unit 2: Motion',
        language: 'English',
        questionTypes: [{ count: 4, type: 'short_answer', marksEach: 5 }],
        difficulty: 'Medium',
        totalMarks: 20,
        componentType: 'Midterm Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Difficulty Level Guidance:');
      expect(prompt).toContain('application of concepts');
      expect(prompt).toContain('moderate complexity');
      expect(prompt).toContain('some multi-step reasoning');
      expect(prompt).toContain('connections between ideas');
    });

    test('4.3 Should include Hard difficulty guidance in prompt', () => {
      const examConfig = {
        grade: 'Grade 11',
        subject: 'Chemistry',
        unit: 'Unit 3: Chemical Reactions',
        language: 'English',
        questionTypes: [{ count: 3, type: 'essay', marksEach: 10 }],
        difficulty: 'Hard',
        totalMarks: 30,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Difficulty Level Guidance:');
      expect(prompt).toContain('complex analysis');
      expect(prompt).toContain('synthesis of multiple concepts');
      expect(prompt).toContain('advanced reasoning');
      expect(prompt).toContain('problem-solving');
      expect(prompt).toContain('critical thinking');
    });

    test('4.4 Should default to Medium guidance for unknown difficulty', () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Biology',
        unit: 'Unit 1: Cells',
        language: 'English',
        questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
        difficulty: 'Unknown',
        totalMarks: 10,
        componentType: 'Quiz'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Difficulty Level Guidance:');
      expect(prompt).toContain('application of concepts');
      expect(prompt).toContain('moderate complexity');
    });

    test('4.5 Should include different guidance for each difficulty level', () => {
      const baseConfig = {
        grade: 'Grade 9',
        subject: 'Mathematics',
        unit: 'Unit 1: Algebra',
        language: 'English',
        questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
        totalMarks: 10,
        componentType: 'Unit Test'
      };

      const easyPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, difficulty: 'Easy' });
      const mediumPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, difficulty: 'Medium' });
      const hardPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, difficulty: 'Hard' });

      // Verify each prompt has unique guidance
      expect(easyPrompt).toContain('basic recall');
      expect(easyPrompt).not.toContain('synthesis of multiple concepts');
      
      expect(mediumPrompt).toContain('application of concepts');
      expect(mediumPrompt).not.toContain('basic recall');
      expect(mediumPrompt).not.toContain('synthesis of multiple concepts');
      
      expect(hardPrompt).toContain('synthesis of multiple concepts');
      expect(hardPrompt).not.toContain('basic recall');
    });
  });

  // ============================================================================
  // TEST SUITE 5: Module Export
  // ============================================================================
  describe('5. Module Export', () => {
    test('5.1 Should export GeminiPromptBuilder class', () => {
      expect(GeminiPromptBuilder).toBeDefined();
      expect(typeof GeminiPromptBuilder).toBe('function');
    });

    test('5.2 Should be instantiable', () => {
      const instance = new GeminiPromptBuilder();
      expect(instance).toBeInstanceOf(GeminiPromptBuilder);
    });

    test('5.3 Should have buildExamPrompt method', () => {
      const instance = new GeminiPromptBuilder();
      expect(typeof instance.buildExamPrompt).toBe('function');
    });

    test('5.4 Should have formatQuestionTypes method', () => {
      const instance = new GeminiPromptBuilder();
      expect(typeof instance.formatQuestionTypes).toBe('function');
    });
  });

  // ============================================================================
  // TEST SUITE 6: Language-Specific Prompt Variations
  // ============================================================================
  describe('6. Language-Specific Prompt Variations', () => {
    const baseConfig = {
      grade: 'Grade 9',
      subject: 'Mathematics',
      unit: 'Unit 1: Algebra',
      questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
      difficulty: 'Medium',
      totalMarks: 10,
      componentType: 'Unit Test'
    };

    test('6.1 Should include English language guidance in prompt', () => {
      const examConfig = { ...baseConfig, language: 'English' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('standard English');
      expect(prompt).toContain('clear and formal academic language');
      expect(prompt).toContain('proper grammar, spelling, and punctuation');
    });

    test('6.2 Should include Arabic language guidance in prompt', () => {
      const examConfig = { ...baseConfig, language: 'Arabic' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('Modern Standard Arabic');
      expect(prompt).toContain('الفصحى');
      expect(prompt).toContain('right-to-left text');
      expect(prompt).toContain('Arabic numerals');
    });

    test('6.3 Should include Amharic language guidance in prompt', () => {
      const examConfig = { ...baseConfig, language: 'Amharic' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('Amharic script');
      expect(prompt).toContain('አማርኛ');
      expect(prompt).toContain('Amharic academic terminology');
      expect(prompt).toContain('Ge\'ez numerals');
    });

    test('6.4 Should include Oromo language guidance in prompt', () => {
      const examConfig = { ...baseConfig, language: 'Oromo' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('Oromo language');
      expect(prompt).toContain('Afaan Oromoo');
      expect(prompt).toContain('Latin script');
      expect(prompt).toContain('Oromo terminology');
    });

    test('6.5 Should include Somali language guidance in prompt', () => {
      const examConfig = { ...baseConfig, language: 'Somali' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('Somali language');
      expect(prompt).toContain('Af-Soomaali');
      expect(prompt).toContain('Latin script');
      expect(prompt).toContain('Somali terminology');
    });

    test('6.6 Should include French language guidance in prompt', () => {
      const examConfig = { ...baseConfig, language: 'French' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('standard French');
      expect(prompt).toContain('formal academic language');
      expect(prompt).toContain('French grammar');
      expect(prompt).toContain('French academic conventions');
    });

    test('6.7 Should default to English guidance for unknown language', () => {
      const examConfig = { ...baseConfig, language: 'Unknown' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('standard English');
      expect(prompt).toContain('clear and formal academic language');
    });

    test('6.8 Should include different guidance for each language', () => {
      const englishPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, language: 'English' });
      const arabicPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, language: 'Arabic' });
      const amharicPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, language: 'Amharic' });
      const oromoPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, language: 'Oromo' });
      const somaliPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, language: 'Somali' });
      const frenchPrompt = promptBuilder.buildExamPrompt({ ...baseConfig, language: 'French' });

      // Verify each prompt has unique language-specific content
      expect(englishPrompt).toContain('standard English');
      expect(englishPrompt).not.toContain('الفصحى');
      expect(englishPrompt).not.toContain('አማርኛ');

      expect(arabicPrompt).toContain('الفصحى');
      expect(arabicPrompt).toContain('right-to-left');
      expect(arabicPrompt).not.toContain('Ge\'ez numerals');

      expect(amharicPrompt).toContain('አማርኛ');
      expect(amharicPrompt).toContain('Ge\'ez numerals');
      expect(amharicPrompt).not.toContain('الفصحى');

      expect(oromoPrompt).toContain('Afaan Oromoo');
      expect(oromoPrompt).toContain('Oromo terminology');
      expect(oromoPrompt).not.toContain('Somali');

      expect(somaliPrompt).toContain('Af-Soomaali');
      expect(somaliPrompt).toContain('Somali terminology');
      expect(somaliPrompt).not.toContain('Oromo');

      expect(frenchPrompt).toContain('standard French');
      expect(frenchPrompt).toContain('French academic conventions');
      expect(frenchPrompt).not.toContain('English');
    });

    test('6.9 Should include language guidance in CONTEXT section', () => {
      const examConfig = { ...baseConfig, language: 'Arabic' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      // Verify language guidance appears in CONTEXT section
      const contextSection = prompt.split('**CONTEXT**:')[1].split('**FORMAT**:')[0];
      expect(contextSection).toContain('Language Guidance:');
      expect(contextSection).toContain('Modern Standard Arabic');
    });

    test('6.10 Should include both difficulty and language guidance', () => {
      const examConfig = { ...baseConfig, language: 'Amharic', difficulty: 'Hard' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      // Verify both types of guidance are present
      expect(prompt).toContain('Difficulty Level Guidance:');
      expect(prompt).toContain('complex analysis');
      expect(prompt).toContain('Language Guidance:');
      expect(prompt).toContain('Amharic script');
    });

    test('6.11 Should maintain language specification in TASK section', () => {
      const examConfig = { ...baseConfig, language: 'French' };
      const prompt = promptBuilder.buildExamPrompt(examConfig);

      // Verify language is specified in TASK section
      const taskSection = prompt.split('**TASK**:')[1].split('**CONTEXT**:')[0];
      expect(taskSection).toContain('Language: French');
    });

    test('6.12 Should work with all supported languages and different subjects', () => {
      const languages = ['English', 'Arabic', 'Amharic', 'Oromo', 'Somali', 'French'];
      const subjects = ['Mathematics', 'Physics', 'Biology', 'History'];

      languages.forEach(language => {
        subjects.forEach(subject => {
          const examConfig = { ...baseConfig, language, subject };
          const prompt = promptBuilder.buildExamPrompt(examConfig);

          expect(prompt).toContain(`Language: ${language}`);
          expect(prompt).toContain('Language Guidance:');
          expect(prompt).toContain(subject);
        });
      });
    });
  });

  // ============================================================================
  // TEST SUITE 7: Cross-Subject and Cross-Grade Testing
  // ============================================================================
  describe('7. Cross-Subject and Cross-Grade Testing', () => {
    test('7.1 Should generate prompts for elementary Mathematics (Grade 1)', () => {
      const examConfig = {
        grade: 'Grade 1',
        subject: 'Mathematics',
        unit: 'Unit 1: Numbers 1-10',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 3, type: 'fill_blank', marksEach: 1 }
        ],
        difficulty: 'Easy',
        totalMarks: 13,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 1');
      expect(prompt).toContain('Mathematics');
      expect(prompt).toContain('Numbers 1-10');
      expect(prompt).toContain('basic recall');
      expect(prompt).toContain('Total Marks: 13');
    });

    test('7.2 Should generate prompts for elementary Science (Grade 4)', () => {
      const examConfig = {
        grade: 'Grade 4',
        subject: 'Science',
        unit: 'Unit 2: Plants and Animals',
        language: 'Amharic',
        questionTypes: [
          { count: 4, type: 'true_false', marksEach: 1 },
          { count: 3, type: 'short_answer', marksEach: 3 }
        ],
        difficulty: 'Easy',
        totalMarks: 13,
        componentType: 'Quiz'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 4');
      expect(prompt).toContain('Science');
      expect(prompt).toContain('Plants and Animals');
      expect(prompt).toContain('Amharic');
      expect(prompt).toContain('አማርኛ');
    });

    test('7.3 Should generate prompts for middle school Mathematics (Grade 5)', () => {
      const examConfig = {
        grade: 'Grade 5',
        subject: 'Mathematics',
        unit: 'Unit 3: Fractions and Decimals',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 2, type: 'numeric', marksEach: 3 }
        ],
        difficulty: 'Medium',
        totalMarks: 16,
        componentType: 'Midterm Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 5');
      expect(prompt).toContain('Mathematics');
      expect(prompt).toContain('Fractions and Decimals');
      expect(prompt).toContain('application of concepts');
      expect(prompt).toContain('moderate complexity');
    });

    test('7.4 Should generate prompts for middle school Social Studies (Grade 7)', () => {
      const examConfig = {
        grade: 'Grade 7',
        subject: 'Social Studies',
        unit: 'Unit 1: Ethiopian Geography',
        language: 'Oromo',
        questionTypes: [
          { count: 3, type: 'matching', marksEach: 4 },
          { count: 2, type: 'short_answer', marksEach: 5 }
        ],
        difficulty: 'Medium',
        totalMarks: 22,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 7');
      expect(prompt).toContain('Social Studies');
      expect(prompt).toContain('Ethiopian Geography');
      expect(prompt).toContain('Oromo');
      expect(prompt).toContain('Afaan Oromoo');
    });

    test('7.5 Should generate prompts for middle school English (Grade 8)', () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'English',
        unit: 'Unit 4: Reading Comprehension',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 2, type: 'essay', marksEach: 10 }
        ],
        difficulty: 'Medium',
        totalMarks: 30,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 8');
      expect(prompt).toContain('English');
      expect(prompt).toContain('Reading Comprehension');
      expect(prompt).toContain('standard English');
    });

    test('7.6 Should generate prompts for high school Mathematics (Grade 9)', () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'Mathematics',
        unit: 'Unit 2: Quadratic Equations',
        language: 'English',
        questionTypes: [
          { count: 4, type: 'multiple_choice', marksEach: 3 },
          { count: 3, type: 'short_answer', marksEach: 5 },
          { count: 1, type: 'essay', marksEach: 10 }
        ],
        difficulty: 'Hard',
        totalMarks: 37,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 9');
      expect(prompt).toContain('Mathematics');
      expect(prompt).toContain('Quadratic Equations');
      expect(prompt).toContain('complex analysis');
      expect(prompt).toContain('synthesis of multiple concepts');
    });

    test('7.7 Should generate prompts for high school Physics (Grade 10)', () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'Physics',
        unit: 'Unit 3: Forces and Motion',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 3, type: 'numeric', marksEach: 4 },
          { count: 2, type: 'short_answer', marksEach: 6 }
        ],
        difficulty: 'Hard',
        totalMarks: 34,
        componentType: 'Midterm Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 10');
      expect(prompt).toContain('Physics');
      expect(prompt).toContain('Forces and Motion');
      expect(prompt).toContain('problem-solving');
    });

    test('7.8 Should generate prompts for high school Chemistry (Grade 11)', () => {
      const examConfig = {
        grade: 'Grade 11',
        subject: 'Chemistry',
        unit: 'Unit 1: Atomic Structure',
        language: 'Arabic',
        questionTypes: [
          { count: 6, type: 'multiple_choice', marksEach: 2 },
          { count: 2, type: 'matching', marksEach: 5 },
          { count: 2, type: 'essay', marksEach: 8 }
        ],
        difficulty: 'Hard',
        totalMarks: 38,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 11');
      expect(prompt).toContain('Chemistry');
      expect(prompt).toContain('Atomic Structure');
      expect(prompt).toContain('Arabic');
      expect(prompt).toContain('الفصحى');
      expect(prompt).toContain('right-to-left');
    });

    test('7.9 Should generate prompts for high school Biology (Grade 12)', () => {
      const examConfig = {
        grade: 'Grade 12',
        subject: 'Biology',
        unit: 'Unit 4: Genetics and Evolution',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 3 },
          { count: 3, type: 'short_answer', marksEach: 6 },
          { count: 2, type: 'essay', marksEach: 12 }
        ],
        difficulty: 'Hard',
        totalMarks: 57,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 12');
      expect(prompt).toContain('Biology');
      expect(prompt).toContain('Genetics and Evolution');
      expect(prompt).toContain('critical thinking');
    });

    test('7.10 Should generate prompts for high school History (Grade 10)', () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'History',
        unit: 'Unit 2: Ethiopian History',
        language: 'Amharic',
        questionTypes: [
          { count: 4, type: 'true_false', marksEach: 2 },
          { count: 3, type: 'short_answer', marksEach: 5 },
          { count: 2, type: 'essay', marksEach: 10 }
        ],
        difficulty: 'Medium',
        totalMarks: 43,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 10');
      expect(prompt).toContain('History');
      expect(prompt).toContain('Ethiopian History');
      expect(prompt).toContain('Amharic');
    });

    test('7.11 Should generate prompts for high school Geography (Grade 11)', () => {
      const examConfig = {
        grade: 'Grade 11',
        subject: 'Geography',
        unit: 'Unit 3: Climate and Weather',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 3, type: 'matching', marksEach: 4 },
          { count: 2, type: 'short_answer', marksEach: 6 }
        ],
        difficulty: 'Medium',
        totalMarks: 34,
        componentType: 'Midterm Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 11');
      expect(prompt).toContain('Geography');
      expect(prompt).toContain('Climate and Weather');
    });

    test('7.12 Should generate prompts for high school Economics (Grade 12)', () => {
      const examConfig = {
        grade: 'Grade 12',
        subject: 'Economics',
        unit: 'Unit 1: Market Systems',
        language: 'English',
        questionTypes: [
          { count: 4, type: 'multiple_choice', marksEach: 3 },
          { count: 3, type: 'short_answer', marksEach: 6 },
          { count: 2, type: 'essay', marksEach: 12 }
        ],
        difficulty: 'Hard',
        totalMarks: 54,
        componentType: 'Final Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 12');
      expect(prompt).toContain('Economics');
      expect(prompt).toContain('Market Systems');
      expect(prompt).toContain('advanced reasoning');
    });

    test('7.13 Should handle combinations of different subjects, grades, and languages', () => {
      const testCases = [
        { grade: 'Grade 1', subject: 'Mathematics', language: 'English', difficulty: 'Easy' },
        { grade: 'Grade 5', subject: 'Science', language: 'Amharic', difficulty: 'Medium' },
        { grade: 'Grade 9', subject: 'Physics', language: 'English', difficulty: 'Hard' },
        { grade: 'Grade 12', subject: 'Chemistry', language: 'Arabic', difficulty: 'Hard' }
      ];

      testCases.forEach(testCase => {
        const examConfig = {
          ...testCase,
          unit: 'Unit 1: Test Unit',
          questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
          totalMarks: 10,
          componentType: 'Unit Test'
        };

        const prompt = promptBuilder.buildExamPrompt(examConfig);

        expect(prompt).toContain(testCase.grade);
        expect(prompt).toContain(testCase.subject);
        expect(prompt).toContain(`Language: ${testCase.language}`);
        expect(prompt).toContain(`Difficulty Level: ${testCase.difficulty}`);
      });
    });

    test('7.14 Should generate appropriate difficulty guidance for different grade levels', () => {
      const elementaryConfig = {
        grade: 'Grade 2',
        subject: 'Mathematics',
        unit: 'Unit 1: Addition',
        language: 'English',
        questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
        difficulty: 'Easy',
        totalMarks: 10,
        componentType: 'Quiz'
      };

      const highSchoolConfig = {
        grade: 'Grade 12',
        subject: 'Physics',
        unit: 'Unit 5: Quantum Mechanics',
        language: 'English',
        questionTypes: [{ count: 5, type: 'essay', marksEach: 10 }],
        difficulty: 'Hard',
        totalMarks: 50,
        componentType: 'Final Exam'
      };

      const elementaryPrompt = promptBuilder.buildExamPrompt(elementaryConfig);
      const highSchoolPrompt = promptBuilder.buildExamPrompt(highSchoolConfig);

      expect(elementaryPrompt).toContain('basic recall');
      expect(elementaryPrompt).toContain('straightforward');
      
      expect(highSchoolPrompt).toContain('complex analysis');
      expect(highSchoolPrompt).toContain('synthesis of multiple concepts');
    });

    test('7.15 Should maintain Ethiopian curriculum context across all subjects and grades', () => {
      const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'English'];
      const grades = ['Grade 1', 'Grade 5', 'Grade 9', 'Grade 12'];

      subjects.forEach(subject => {
        grades.forEach(grade => {
          const examConfig = {
            grade,
            subject,
            unit: 'Unit 1: Test',
            language: 'English',
            questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
            difficulty: 'Medium',
            totalMarks: 10,
            componentType: 'Unit Test'
          };

          const prompt = promptBuilder.buildExamPrompt(examConfig);

          expect(prompt).toContain('Ethiopian National Curriculum');
          expect(prompt).toContain('Ethiopian Ministry of Education');
          expect(prompt).toContain('Ethiopian students');
          expect(prompt).toContain('culturally appropriate for Ethiopian context');
        });
      });
    });

    test('7.16 Should generate prompts with multiple question types across subjects', () => {
      const examConfig = {
        grade: 'Grade 9',
        subject: 'Biology',
        unit: 'Unit 2: Cell Biology',
        language: 'English',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 3, type: 'true_false', marksEach: 1 },
          { count: 2, type: 'matching', marksEach: 4 },
          { count: 2, type: 'fill_blank', marksEach: 2 },
          { count: 2, type: 'short_answer', marksEach: 5 },
          { count: 1, type: 'essay', marksEach: 10 }
        ],
        difficulty: 'Medium',
        totalMarks: 45,
        componentType: 'Midterm Exam'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('5 multiple_choice questions (2 marks each)');
      expect(prompt).toContain('3 true_false questions (1 marks each)');
      expect(prompt).toContain('2 matching questions (4 marks each)');
      expect(prompt).toContain('2 fill_blank questions (2 marks each)');
      expect(prompt).toContain('2 short_answer questions (5 marks each)');
      expect(prompt).toContain('1 essay questions (10 marks each)');
    });

    test('7.17 Should handle French language for various subjects', () => {
      const examConfig = {
        grade: 'Grade 10',
        subject: 'History',
        unit: 'Unit 3: World History',
        language: 'French',
        questionTypes: [
          { count: 4, type: 'multiple_choice', marksEach: 3 },
          { count: 2, type: 'essay', marksEach: 10 }
        ],
        difficulty: 'Medium',
        totalMarks: 32,
        componentType: 'Unit Test'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 10');
      expect(prompt).toContain('History');
      expect(prompt).toContain('Language: French');
      expect(prompt).toContain('standard French');
      expect(prompt).toContain('French academic conventions');
    });

    test('7.18 Should handle Somali language for various subjects', () => {
      const examConfig = {
        grade: 'Grade 8',
        subject: 'Geography',
        unit: 'Unit 1: Physical Geography',
        language: 'Somali',
        questionTypes: [
          { count: 5, type: 'multiple_choice', marksEach: 2 },
          { count: 3, type: 'short_answer', marksEach: 4 }
        ],
        difficulty: 'Medium',
        totalMarks: 22,
        componentType: 'Quiz'
      };

      const prompt = promptBuilder.buildExamPrompt(examConfig);

      expect(prompt).toContain('Grade 8');
      expect(prompt).toContain('Geography');
      expect(prompt).toContain('Language: Somali');
      expect(prompt).toContain('Af-Soomaali');
      expect(prompt).toContain('Somali terminology');
    });

    test('7.19 Should verify all PTCF components for cross-subject tests', () => {
      const subjects = ['Mathematics', 'Physics', 'Biology', 'History'];
      
      subjects.forEach(subject => {
        const examConfig = {
          grade: 'Grade 10',
          subject,
          unit: 'Unit 1: Test',
          language: 'English',
          questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: 2 }],
          difficulty: 'Medium',
          totalMarks: 10,
          componentType: 'Unit Test'
        };

        const prompt = promptBuilder.buildExamPrompt(examConfig);

        expect(prompt).toContain('**PERSONA**');
        expect(prompt).toContain('**TASK**');
        expect(prompt).toContain('**CONTEXT**');
        expect(prompt).toContain('**FORMAT**');
        expect(prompt).toContain(subject);
      });
    });

    test('7.20 Should generate correct total marks for various combinations', () => {
      const testCases = [
        { grade: 'Grade 3', totalMarks: 15 },
        { grade: 'Grade 7', totalMarks: 30 },
        { grade: 'Grade 10', totalMarks: 50 },
        { grade: 'Grade 12', totalMarks: 100 }
      ];

      testCases.forEach(testCase => {
        const examConfig = {
          grade: testCase.grade,
          subject: 'Mathematics',
          unit: 'Unit 1: Test',
          language: 'English',
          questionTypes: [{ count: 5, type: 'multiple_choice', marksEach: testCase.totalMarks / 5 }],
          difficulty: 'Medium',
          totalMarks: testCase.totalMarks,
          componentType: 'Unit Test'
        };

        const prompt = promptBuilder.buildExamPrompt(examConfig);

        expect(prompt).toContain(`Total Marks: ${testCase.totalMarks}`);
        expect(prompt).toContain(`Ensure total marks sum to ${testCase.totalMarks}`);
      });
    });
  });
});
