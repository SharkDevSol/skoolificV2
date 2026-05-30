/**
 * Test file for Question Type Schemas
 * 
 * This file contains basic tests to verify the question type schemas
 * and validation functions work correctly.
 */

const {
  validateQuestion,
  validateExam,
  getSupportedQuestionTypes,
  isQuestionTypeSupported,
  getQuestionSchema
} = require('./questionTypes');

// Test 1: Verify all question types are supported
console.log('Test 1: Supported Question Types');
const supportedTypes = getSupportedQuestionTypes();
console.log('Supported types:', supportedTypes);
console.log('Expected 9 types:', supportedTypes.length === 9 ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 2: Validate a correct Multiple Choice question
console.log('Test 2: Valid Multiple Choice Question');
const validMCQ = {
  id: 1,
  type: 'multiple_choice',
  question: 'What is the capital of Ethiopia?',
  options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
  correctAnswer: 'Addis Ababa',
  marks: 2,
  explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
};
const mcqValidation = validateQuestion(validMCQ);
console.log('Valid MCQ:', mcqValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!mcqValidation.valid) {
  console.log('Errors:', mcqValidation.errors);
}
console.log('');

// Test 3: Validate an invalid Multiple Choice question (missing required field)
console.log('Test 3: Invalid Multiple Choice Question (missing options)');
const invalidMCQ = {
  id: 2,
  type: 'multiple_choice',
  question: 'What is 2+2?',
  correctAnswer: '4',
  marks: 1,
  explanation: 'Basic arithmetic'
};
const invalidMcqValidation = validateQuestion(invalidMCQ);
console.log('Should be invalid:', !invalidMcqValidation.valid ? '✓ PASS' : '✗ FAIL');
console.log('Errors:', invalidMcqValidation.errors);
console.log('');

// Test 4: Validate a True/False question
console.log('Test 4: Valid True/False Question');
const validTF = {
  id: 3,
  type: 'true_false',
  question: 'Ethiopia uses the Gregorian calendar.',
  options: ['True', 'False'],
  correctAnswer: 'False',
  marks: 1,
  explanation: 'Ethiopia uses the Ethiopian calendar.'
};
const tfValidation = validateQuestion(validTF);
console.log('Valid T/F:', tfValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!tfValidation.valid) {
  console.log('Errors:', tfValidation.errors);
}
console.log('');

// Test 5: Validate a Matching question
console.log('Test 5: Valid Matching Question');
const validMatching = {
  id: 4,
  type: 'matching',
  question: 'Match the Ethiopian emperors with their achievements:',
  leftColumn: ['Haile Selassie', 'Menelik II', 'Tewodros II'],
  rightColumn: ['Modernized Ethiopia', 'Defeated Italy at Adwa', 'United Ethiopia'],
  correctMatches: [
    { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
    { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
    { left: 'Tewodros II', right: 'United Ethiopia' }
  ],
  marks: 3,
  explanation: 'Historical achievements of Ethiopian emperors.'
};
const matchingValidation = validateQuestion(validMatching);
console.log('Valid Matching:', matchingValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!matchingValidation.valid) {
  console.log('Errors:', matchingValidation.errors);
}
console.log('');

// Test 6: Validate a Fill-in-the-Blank question
console.log('Test 6: Valid Fill-in-the-Blank Question');
const validFillBlank = {
  id: 5,
  type: 'fill_blank',
  question: 'The capital of Ethiopia is _____ and it is located at approximately _____ meters elevation.',
  correctAnswers: ['Addis Ababa', '2400'],
  marks: 2,
  explanation: 'Addis Ababa is at about 2,400 meters above sea level.'
};
const fillBlankValidation = validateQuestion(validFillBlank);
console.log('Valid Fill Blank:', fillBlankValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!fillBlankValidation.valid) {
  console.log('Errors:', fillBlankValidation.errors);
}
console.log('');

// Test 7: Validate a Numeric question
console.log('Test 7: Valid Numeric Question');
const validNumeric = {
  id: 6,
  type: 'numeric',
  question: 'Calculate the area of a rectangle with length 12 cm and width 8 cm.',
  correctAnswer: '96',
  unit: 'cm²',
  marks: 2,
  explanation: 'Area = length × width = 12 × 8 = 96 cm²'
};
const numericValidation = validateQuestion(validNumeric);
console.log('Valid Numeric:', numericValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!numericValidation.valid) {
  console.log('Errors:', numericValidation.errors);
}
console.log('');

// Test 8: Validate a Short Answer question
console.log('Test 8: Valid Short Answer Question');
const validShortAnswer = {
  id: 7,
  type: 'short_answer',
  question: 'Explain the significance of the Battle of Adwa.',
  modelAnswer: 'The Battle of Adwa was a decisive Ethiopian victory against Italy that preserved Ethiopian independence.',
  keyPoints: [
    'Decisive Ethiopian victory',
    'Defeated Italian colonization',
    'Preserved independence'
  ],
  marks: 5,
  explanation: 'Should mention victory, independence, and African resistance.'
};
const shortAnswerValidation = validateQuestion(validShortAnswer);
console.log('Valid Short Answer:', shortAnswerValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!shortAnswerValidation.valid) {
  console.log('Errors:', shortAnswerValidation.errors);
}
console.log('');

// Test 9: Validate an Essay question
console.log('Test 9: Valid Essay Question');
const validEssay = {
  id: 8,
  type: 'essay',
  question: 'Discuss the impact of the Ethiopian calendar on modern society.',
  modelAnswer: 'The Ethiopian calendar has both cultural significance and practical implications for modern Ethiopian society...',
  rubric: [
    { criterion: 'Understanding of calendar', points: 3 },
    { criterion: 'Analysis of impact', points: 3 },
    { criterion: 'Organization', points: 2 }
  ],
  marks: 8,
  explanation: 'Should demonstrate understanding and provide examples.'
};
const essayValidation = validateQuestion(validEssay);
console.log('Valid Essay:', essayValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!essayValidation.valid) {
  console.log('Errors:', essayValidation.errors);
}
console.log('');

// Test 10: Validate a Transformation question
console.log('Test 10: Valid Transformation Question');
const validTransformation = {
  id: 9,
  type: 'transformation',
  question: 'Correct the grammatical errors in the following sentence:',
  originalText: 'The students was going to school.',
  correctTransformation: 'The students were going to school.',
  marks: 2,
  explanation: 'Subject-verb agreement: students (plural) requires were.'
};
const transformationValidation = validateQuestion(validTransformation);
console.log('Valid Transformation:', transformationValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!transformationValidation.valid) {
  console.log('Errors:', transformationValidation.errors);
}
console.log('');

// Test 11: Validate an entire exam
console.log('Test 11: Valid Exam with Multiple Questions');
const validExam = {
  title: 'Sample Math Test',
  totalMarks: 10,
  questions: [
    validMCQ,
    validTF,
    validNumeric,
    validFillBlank
  ]
};
const examValidation = validateExam(validExam);
console.log('Valid Exam:', examValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!examValidation.valid) {
  console.log('Errors:', examValidation.errors);
  console.log('Question Errors:', examValidation.questionErrors);
}
console.log('');

// Test 12: Validate exam with mismatched total marks
console.log('Test 12: Invalid Exam (mismatched total marks)');
const invalidExam = {
  title: 'Invalid Test',
  totalMarks: 100, // Should be 7
  questions: [
    validMCQ, // 2 marks
    validTF,  // 1 mark
    validNumeric, // 2 marks
    validFillBlank // 2 marks
  ]
};
const invalidExamValidation = validateExam(invalidExam);
console.log('Should be invalid:', !invalidExamValidation.valid ? '✓ PASS' : '✗ FAIL');
console.log('Errors:', invalidExamValidation.errors);
console.log('');

// Test 13: Check if question type is supported
console.log('Test 13: Check Question Type Support');
console.log('multiple_choice supported:', isQuestionTypeSupported('multiple_choice') ? '✓ PASS' : '✗ FAIL');
console.log('invalid_type supported:', !isQuestionTypeSupported('invalid_type') ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 14: Get schema for a specific question type
console.log('Test 14: Get Question Schema');
const mcqSchema = getQuestionSchema('multiple_choice');
console.log('MCQ schema exists:', mcqSchema !== null ? '✓ PASS' : '✗ FAIL');
console.log('MCQ schema has options field:', mcqSchema && mcqSchema.options ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 15: Validate Multiple True/False question
console.log('Test 15: Valid Multiple True/False Question');
const validMultipleTF = {
  id: 10,
  type: 'multiple_true_false',
  question: 'Evaluate the following statements:',
  statements: [
    'Ethiopia is landlocked',
    'The Blue Nile originates in Ethiopia',
    'Ethiopia is in West Africa'
  ],
  correctAnswers: [true, true, false],
  marks: 3,
  explanation: 'Ethiopia is landlocked (True), Blue Nile originates from Lake Tana (True), but Ethiopia is in East Africa (False).'
};
const multipleTFValidation = validateQuestion(validMultipleTF);
console.log('Valid Multiple T/F:', multipleTFValidation.valid ? '✓ PASS' : '✗ FAIL');
if (!multipleTFValidation.valid) {
  console.log('Errors:', multipleTFValidation.errors);
}
console.log('');

console.log('='.repeat(50));
console.log('All tests completed!');
console.log('='.repeat(50));
