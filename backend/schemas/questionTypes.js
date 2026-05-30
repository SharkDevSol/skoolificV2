/**
 * Question Type Schema Definitions for AI Test Generator
 * 
 * This module defines schemas for all supported question types in the Skoolific V2 AI Test Generator.
 * These schemas are used for validation and processing of AI-generated questions from Gemini API.
 * 
 * Supported Question Types:
 * 1. Multiple Choice (multiple_choice)
 * 2. True/False (true_false)
 * 3. Multiple True/False (multiple_true_false)
 * 4. Matching (matching)
 * 5. Numeric Response (numeric)
 * 6. Fill-in-the-Blank (fill_blank)
 * 7. Short Answer (short_answer)
 * 8. Essay/Open-Ended (essay)
 * 9. Transformation/Error Correction (transformation)
 */

/**
 * Base Question Schema
 * Common fields shared across all question types
 */
const baseQuestionSchema = {
  id: {
    type: 'number',
    required: true,
    description: 'Unique identifier for the question within the exam'
  },
  type: {
    type: 'string',
    required: true,
    enum: [
      'multiple_choice',
      'true_false',
      'multiple_true_false',
      'matching',
      'numeric',
      'fill_blank',
      'short_answer',
      'essay',
      'transformation'
    ],
    description: 'Type of question'
  },
  question: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000,
    description: 'The question text'
  },
  marks: {
    type: 'number',
    required: true,
    min: 0.5,
    max: 100,
    description: 'Marks allocated to this question'
  },
  explanation: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 1000,
    description: 'Explanation for the correct answer'
  }
};

/**
 * 1. Multiple Choice Question Schema
 * 
 * Format:
 * {
 *   id: 1,
 *   type: "multiple_choice",
 *   question: "What is the capital of Ethiopia?",
 *   options: ["Addis Ababa", "Nairobi", "Kampala", "Khartoum"],
 *   correctAnswer: "Addis Ababa",
 *   marks: 2,
 *   explanation: "Addis Ababa is the capital and largest city of Ethiopia."
 * }
 */
const multipleChoiceSchema = {
  ...baseQuestionSchema,
  options: {
    type: 'array',
    required: true,
    minItems: 2,
    maxItems: 6,
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    description: 'Array of answer options (typically 4 options)'
  },
  correctAnswer: {
    type: 'string',
    required: true,
    description: 'The correct answer (must match one of the options exactly)'
  }
};

/**
 * 2. True/False Question Schema
 * 
 * Format:
 * {
 *   id: 2,
 *   type: "true_false",
 *   question: "Ethiopia uses the Gregorian calendar.",
 *   options: ["True", "False"],
 *   correctAnswer: "False",
 *   marks: 1,
 *   explanation: "Ethiopia uses the Ethiopian calendar, which is different from the Gregorian calendar."
 * }
 */
const trueFalseSchema = {
  ...baseQuestionSchema,
  options: {
    type: 'array',
    required: true,
    enum: [['True', 'False'], ['true', 'false']],
    description: 'Must be exactly ["True", "False"]'
  },
  correctAnswer: {
    type: 'string',
    required: true,
    enum: ['True', 'False', 'true', 'false'],
    description: 'Either "True" or "False"'
  }
};

/**
 * 3. Multiple True/False Question Schema
 * 
 * Format:
 * {
 *   id: 3,
 *   type: "multiple_true_false",
 *   question: "Evaluate the following statements about Ethiopian geography:",
 *   statements: [
 *     "Ethiopia is landlocked",
 *     "The Blue Nile originates in Ethiopia",
 *     "Ethiopia is located in West Africa"
 *   ],
 *   correctAnswers: [true, true, false],
 *   marks: 3,
 *   explanation: "Ethiopia is landlocked (True), the Blue Nile originates from Lake Tana (True), but Ethiopia is in East Africa, not West Africa (False)."
 * }
 */
const multipleTrueFalseSchema = {
  ...baseQuestionSchema,
  statements: {
    type: 'array',
    required: true,
    minItems: 2,
    maxItems: 10,
    items: {
      type: 'string',
      minLength: 5,
      maxLength: 500
    },
    description: 'Array of statements to be evaluated as true or false'
  },
  correctAnswers: {
    type: 'array',
    required: true,
    items: {
      type: 'boolean'
    },
    description: 'Array of boolean values corresponding to each statement'
  }
};

/**
 * 4. Matching Question Schema
 * 
 * Format:
 * {
 *   id: 4,
 *   type: "matching",
 *   question: "Match the Ethiopian emperors with their achievements:",
 *   leftColumn: ["Haile Selassie", "Menelik II", "Tewodros II"],
 *   rightColumn: ["Defeated Italy at Adwa", "Modernized Ethiopia", "Founded Addis Ababa"],
 *   correctMatches: [
 *     { left: "Haile Selassie", right: "Modernized Ethiopia" },
 *     { left: "Menelik II", right: "Defeated Italy at Adwa" },
 *     { left: "Tewodros II", right: "Founded Addis Ababa" }
 *   ],
 *   marks: 3,
 *   explanation: "Haile Selassie modernized Ethiopia, Menelik II defeated Italy at the Battle of Adwa, and Menelik II also founded Addis Ababa."
 * }
 */
const matchingSchema = {
  ...baseQuestionSchema,
  leftColumn: {
    type: 'array',
    required: true,
    minItems: 2,
    maxItems: 10,
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    description: 'Array of items in the left column'
  },
  rightColumn: {
    type: 'array',
    required: true,
    minItems: 2,
    maxItems: 10,
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    description: 'Array of items in the right column (must have same length as leftColumn)'
  },
  correctMatches: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      properties: {
        left: { type: 'string' },
        right: { type: 'string' }
      }
    },
    description: 'Array of correct left-right pairs'
  }
};

/**
 * 5. Numeric Response Question Schema
 * 
 * Format:
 * {
 *   id: 5,
 *   type: "numeric",
 *   question: "Calculate the area of a rectangle with length 12 cm and width 8 cm.",
 *   correctAnswer: "96",
 *   unit: "cm²",
 *   acceptableRange: { min: 95.5, max: 96.5 },
 *   marks: 2,
 *   explanation: "Area = length × width = 12 × 8 = 96 cm²"
 * }
 */
const numericSchema = {
  ...baseQuestionSchema,
  correctAnswer: {
    type: ['number', 'string'],
    required: true,
    description: 'The correct numeric answer (can include units)'
  },
  unit: {
    type: 'string',
    required: false,
    maxLength: 20,
    description: 'Unit of measurement (e.g., "cm", "kg", "°C")'
  },
  acceptableRange: {
    type: 'object',
    required: false,
    properties: {
      min: { type: 'number' },
      max: { type: 'number' }
    },
    description: 'Optional acceptable range for the answer (for rounding tolerance)'
  }
};

/**
 * 6. Fill-in-the-Blank Question Schema
 * 
 * Format:
 * {
 *   id: 6,
 *   type: "fill_blank",
 *   question: "The capital of Ethiopia is _____ and it is located at an elevation of approximately _____ meters.",
 *   correctAnswers: ["Addis Ababa", "2400"],
 *   marks: 2,
 *   explanation: "Addis Ababa is the capital of Ethiopia and sits at about 2,400 meters above sea level."
 * }
 */
const fillBlankSchema = {
  ...baseQuestionSchema,
  question: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 2000,
    pattern: '_____',
    description: 'Question text with _____ indicating blank spaces'
  },
  correctAnswers: {
    type: 'array',
    required: true,
    minItems: 1,
    maxItems: 10,
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    description: 'Array of correct answers for each blank (in order)'
  }
};

/**
 * 7. Short Answer Question Schema
 * 
 * Format:
 * {
 *   id: 7,
 *   type: "short_answer",
 *   question: "Explain the significance of the Battle of Adwa in Ethiopian history.",
 *   modelAnswer: "The Battle of Adwa (1896) was a decisive victory for Ethiopia against Italian colonial forces. It preserved Ethiopian independence and made Ethiopia the only African nation to successfully resist European colonization during the Scramble for Africa.",
 *   keyPoints: [
 *     "Decisive Ethiopian victory",
 *     "Defeated Italian colonization attempt",
 *     "Preserved Ethiopian independence",
 *     "Symbol of African resistance"
 *   ],
 *   marks: 5,
 *   explanation: "A complete answer should mention the victory over Italy, preservation of independence, and significance for African resistance to colonialism."
 * }
 */
const shortAnswerSchema = {
  ...baseQuestionSchema,
  modelAnswer: {
    type: 'string',
    required: true,
    minLength: 20,
    maxLength: 1000,
    description: 'Model answer for teacher reference'
  },
  keyPoints: {
    type: 'array',
    required: true,
    minItems: 2,
    maxItems: 10,
    items: {
      type: 'string',
      minLength: 5,
      maxLength: 200
    },
    description: 'Key points that should be included in a good answer'
  }
};

/**
 * 8. Essay/Open-Ended Question Schema
 * 
 * Format:
 * {
 *   id: 8,
 *   type: "essay",
 *   question: "Discuss the impact of the Ethiopian calendar system on modern Ethiopian society, including its advantages and challenges.",
 *   modelAnswer: "The Ethiopian calendar, which is approximately 7-8 years behind the Gregorian calendar, has both cultural significance and practical implications...",
 *   rubric: [
 *     { criterion: "Understanding of calendar system", points: 3 },
 *     { criterion: "Analysis of advantages", points: 3 },
 *     { criterion: "Discussion of challenges", points: 3 },
 *     { criterion: "Organization and clarity", points: 2 },
 *     { criterion: "Use of examples", points: 2 }
 *   ],
 *   marks: 13,
 *   explanation: "A strong essay should demonstrate understanding of the Ethiopian calendar, analyze both benefits and challenges, and provide specific examples."
 * }
 */
const essaySchema = {
  ...baseQuestionSchema,
  modelAnswer: {
    type: 'string',
    required: true,
    minLength: 50,
    maxLength: 5000,
    description: 'Model answer for teacher reference'
  },
  rubric: {
    type: 'array',
    required: true,
    minItems: 2,
    maxItems: 10,
    items: {
      type: 'object',
      properties: {
        criterion: {
          type: 'string',
          minLength: 5,
          maxLength: 200
        },
        points: {
          type: 'number',
          min: 0.5,
          max: 50
        }
      },
      required: ['criterion', 'points']
    },
    description: 'Grading rubric with criteria and point allocation'
  }
};

/**
 * 9. Transformation/Error Correction Question Schema
 * 
 * Format:
 * {
 *   id: 9,
 *   type: "transformation",
 *   question: "Correct the grammatical errors in the following sentence:",
 *   originalText: "The students was going to school when it start raining.",
 *   correctTransformation: "The students were going to school when it started raining.",
 *   marks: 2,
 *   explanation: "Subject-verb agreement: 'students' (plural) requires 'were' not 'was'. Past tense consistency: 'started' not 'start'."
 * }
 */
const transformationSchema = {
  ...baseQuestionSchema,
  originalText: {
    type: 'string',
    required: true,
    minLength: 5,
    maxLength: 1000,
    description: 'The original text to be transformed or corrected'
  },
  correctTransformation: {
    type: 'string',
    required: true,
    minLength: 5,
    maxLength: 1000,
    description: 'The correct transformation or corrected version'
  }
};

/**
 * Question Type Schema Map
 * Maps question type identifiers to their respective schemas
 */
const questionTypeSchemas = {
  multiple_choice: multipleChoiceSchema,
  true_false: trueFalseSchema,
  multiple_true_false: multipleTrueFalseSchema,
  matching: matchingSchema,
  numeric: numericSchema,
  fill_blank: fillBlankSchema,
  short_answer: shortAnswerSchema,
  essay: essaySchema,
  transformation: transformationSchema
};

/**
 * Validation Functions
 */

/**
 * Validate a single question against its schema
 * @param {Object} question - The question object to validate
 * @returns {Object} - { valid: boolean, errors: Array<string> }
 */
function validateQuestion(question) {
  const errors = [];

  // Check if question type exists
  if (!question.type) {
    errors.push('Question type is required');
    return { valid: false, errors };
  }

  // Check if schema exists for this type
  const schema = questionTypeSchemas[question.type];
  if (!schema) {
    errors.push(`Unknown question type: ${question.type}`);
    return { valid: false, errors };
  }

  // Validate each field in the schema
  for (const [field, rules] of Object.entries(schema)) {
    const value = question[field];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required for ${question.type} questions`);
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const expectedTypes = Array.isArray(rules.type) ? rules.type : [rules.type];
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (!expectedTypes.includes(actualType)) {
        errors.push(`Field '${field}' must be of type ${expectedTypes.join(' or ')}, got ${actualType}`);
      }
    }

    // String length validation
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Field '${field}' must not exceed ${rules.maxLength} characters`);
      }
    }

    // Number range validation
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field '${field}' must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field '${field}' must not exceed ${rules.max}`);
      }
    }

    // Array validation
    if (Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`Field '${field}' must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`Field '${field}' must not exceed ${rules.maxItems} items`);
      }
    }

    // Enum validation
    if (rules.enum) {
      let isValid = false;
      
      // Check if enum is an array of arrays (for options like [['True', 'False']])
      if (Array.isArray(rules.enum[0])) {
        isValid = rules.enum.some(validSet => 
          JSON.stringify(validSet) === JSON.stringify(value)
        );
      } 
      // Check if enum is a simple array of values
      else if (Array.isArray(rules.enum)) {
        isValid = rules.enum.includes(value);
      }
      
      if (!isValid) {
        errors.push(`Field '${field}' must be one of: ${JSON.stringify(rules.enum)}`);
      }
    }

    // Pattern validation (for fill_blank)
    if (rules.pattern && typeof value === 'string') {
      if (!value.includes(rules.pattern)) {
        errors.push(`Field '${field}' must contain '${rules.pattern}' to indicate blank spaces`);
      }
    }
  }

  // Type-specific validations
  if (question.type === 'multiple_choice') {
    if (question.options && question.correctAnswer) {
      if (!question.options.includes(question.correctAnswer)) {
        errors.push('correctAnswer must be one of the provided options');
      }
    }
  }

  if (question.type === 'matching') {
    if (question.leftColumn && question.rightColumn) {
      if (question.leftColumn.length !== question.rightColumn.length) {
        errors.push('leftColumn and rightColumn must have the same number of items');
      }
    }
  }

  if (question.type === 'multiple_true_false') {
    if (question.statements && question.correctAnswers) {
      if (question.statements.length !== question.correctAnswers.length) {
        errors.push('correctAnswers array must have the same length as statements array');
      }
    }
  }

  if (question.type === 'essay') {
    if (question.rubric) {
      const totalRubricPoints = question.rubric.reduce((sum, item) => sum + (item.points || 0), 0);
      if (Math.abs(totalRubricPoints - question.marks) > 0.1) {
        errors.push(`Rubric points (${totalRubricPoints}) must sum to question marks (${question.marks})`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate an entire exam
 * @param {Object} exam - The exam object containing questions array
 * @returns {Object} - { valid: boolean, errors: Array<string>, questionErrors: Object }
 */
function validateExam(exam) {
  const errors = [];
  const questionErrors = {};

  if (!exam) {
    return { valid: false, errors: ['Exam object is required'], questionErrors: {} };
  }

  if (!exam.questions || !Array.isArray(exam.questions)) {
    return { valid: false, errors: ['Exam must contain a questions array'], questionErrors: {} };
  }

  if (exam.questions.length === 0) {
    return { valid: false, errors: ['Exam must contain at least one question'], questionErrors: {} };
  }

  // Validate each question
  exam.questions.forEach((question, index) => {
    const validation = validateQuestion(question);
    if (!validation.valid) {
      questionErrors[`question_${index + 1}`] = validation.errors;
      errors.push(`Question ${index + 1} has validation errors`);
    }
  });

  // Validate total marks
  if (exam.totalMarks !== undefined) {
    const calculatedTotal = exam.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    if (Math.abs(calculatedTotal - exam.totalMarks) > 0.1) {
      errors.push(`Total marks mismatch: declared ${exam.totalMarks}, calculated ${calculatedTotal}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    questionErrors
  };
}

/**
 * Get schema for a specific question type
 * @param {string} questionType - The question type identifier
 * @returns {Object|null} - The schema object or null if not found
 */
function getQuestionSchema(questionType) {
  return questionTypeSchemas[questionType] || null;
}

/**
 * Get all supported question types
 * @returns {Array<string>} - Array of question type identifiers
 */
function getSupportedQuestionTypes() {
  return Object.keys(questionTypeSchemas);
}

/**
 * Check if a question type is supported
 * @param {string} questionType - The question type to check
 * @returns {boolean} - True if supported, false otherwise
 */
function isQuestionTypeSupported(questionType) {
  return questionTypeSchemas.hasOwnProperty(questionType);
}

// Export schemas and validation functions
module.exports = {
  // Schemas
  baseQuestionSchema,
  multipleChoiceSchema,
  trueFalseSchema,
  multipleTrueFalseSchema,
  matchingSchema,
  numericSchema,
  fillBlankSchema,
  shortAnswerSchema,
  essaySchema,
  transformationSchema,
  questionTypeSchemas,

  // Validation functions
  validateQuestion,
  validateExam,
  getQuestionSchema,
  getSupportedQuestionTypes,
  isQuestionTypeSupported
};
