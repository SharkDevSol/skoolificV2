/**
 * TrueFalseHandler Integration Example
 * 
 * This example demonstrates how to use the TrueFalseHandler
 * in the AI Test Generator system.
 */

const TrueFalseHandler = require('./TrueFalseHandler');

// Initialize the handler
const handler = new TrueFalseHandler();

console.log('=== TrueFalseHandler Integration Example ===\n');

// Example 1: Basic Question Validation
console.log('Example 1: Question Validation');
console.log('--------------------------------');

const question1 = {
  id: 1,
  type: 'true_false',
  question: 'Ethiopia uses the Gregorian calendar.',
  options: ['True', 'False'],
  correctAnswer: 'False',
  marks: 1,
  explanation: 'Ethiopia uses the Ethiopian calendar, which is different from the Gregorian calendar.'
};

const validation = handler.validate(question1);
console.log('Question:', question1.question);
console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);
console.log();

// Example 2: Grading with Standard Answers
console.log('Example 2: Grading Standard Answers');
console.log('------------------------------------');

const result1 = handler.grade(question1, 'False');
console.log('Student Answer: "False"');
console.log('Is Correct:', result1.isCorrect);
console.log('Earned Marks:', result1.earnedMarks, '/', result1.totalMarks);
console.log('Feedback:', result1.feedback);
console.log();

const result2 = handler.grade(question1, 'True');
console.log('Student Answer: "True"');
console.log('Is Correct:', result2.isCorrect);
console.log('Earned Marks:', result2.earnedMarks, '/', result2.totalMarks);
console.log('Feedback:', result2.feedback);
console.log();

// Example 3: Handling Answer Variations
console.log('Example 3: Answer Variations');
console.log('----------------------------');

const variations = ['f', 'F', 'false', 'FALSE', '0', 'no', 'No'];
console.log('Testing variations for correct answer "False":');

variations.forEach(variation => {
  const result = handler.grade(question1, variation);
  console.log(`  "${variation}" -> ${result.isCorrect ? '✓ Correct' : '✗ Incorrect'} (${result.earnedMarks} marks)`);
});
console.log();

// Example 4: Normalizing Answers
console.log('Example 4: Answer Normalization');
console.log('--------------------------------');

const testAnswers = ['True', 't', 'T', '1', 'yes', 'False', 'f', 'F', '0', 'no', 'Maybe'];
console.log('Normalizing various answers:');

testAnswers.forEach(answer => {
  const normalized = handler.normalizeAnswer(answer);
  console.log(`  "${answer}" -> ${normalized || 'Invalid'}`);
});
console.log();

// Example 5: Grading Multiple Questions
console.log('Example 5: Grading Multiple Questions');
console.log('--------------------------------------');

const questions = [
  {
    id: 1,
    type: 'true_false',
    question: 'Ethiopia uses the Gregorian calendar.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    marks: 1,
    explanation: 'Ethiopia uses the Ethiopian calendar.'
  },
  {
    id: 2,
    type: 'true_false',
    question: 'Addis Ababa is the capital of Ethiopia.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    marks: 1,
    explanation: 'Addis Ababa is indeed the capital.'
  },
  {
    id: 3,
    type: 'true_false',
    question: 'Ethiopia is located in West Africa.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    marks: 1,
    explanation: 'Ethiopia is in East Africa.'
  }
];

const studentAnswers = {
  1: 'f',      // Correct (variation)
  2: 'True',   // Correct
  3: 'T'       // Incorrect (True instead of False)
};

const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total Questions:', results.totalQuestions);
console.log('Total Marks:', results.totalMarks);
console.log('Earned Marks:', results.earnedMarks);
console.log('Correct:', results.correctCount);
console.log('Incorrect:', results.incorrectCount);
console.log('Unanswered:', results.unansweredCount);
console.log('Percentage:', results.percentage + '%');
console.log();

// Example 6: Answer Validation
console.log('Example 6: Answer Validation');
console.log('----------------------------');

const testValidation = ['True', 'false', 'T', 'f', 'Maybe', '', '123'];
console.log('Validating various answers:');

testValidation.forEach(answer => {
  const check = handler.isAnswerValid(answer);
  console.log(`  "${answer}" -> ${check.valid ? '✓ Valid' : '✗ Invalid'} - ${check.message}`);
});
console.log();

// Example 7: Question Statistics
console.log('Example 7: Question Statistics');
console.log('------------------------------');

const allAnswers = [
  'True',   // Incorrect
  'False',  // Correct
  'f',      // Correct
  'True',   // Incorrect
  'False',  // Correct
  '',       // Unanswered
  'Maybe'   // Invalid
];

const stats = handler.getQuestionStatistics(question1, allAnswers);
console.log('Question:', question1.question);
console.log('Total Responses:', stats.totalResponses);
console.log('Correct:', stats.correctCount);
console.log('Incorrect:', stats.incorrectCount);
console.log('Unanswered:', stats.unansweredCount);
console.log('True Count:', stats.trueCount);
console.log('False Count:', stats.falseCount);
console.log('Invalid Count:', stats.invalidCount);
console.log('Average Score:', stats.averageScore);
console.log('Correct Percentage:', stats.correctPercentage + '%');
console.log();

// Example 8: Integration with Auto-Grading System
console.log('Example 8: Auto-Grading Integration');
console.log('------------------------------------');

class AutoGradingService {
  constructor() {
    this.tfHandler = new TrueFalseHandler();
  }

  gradeQuestion(question, studentAnswer) {
    if (question.type === 'true_false') {
      return this.tfHandler.grade(question, studentAnswer);
    }
    throw new Error(`Unsupported question type: ${question.type}`);
  }

  gradeExam(exam, studentAnswers) {
    const results = {
      totalMarks: 0,
      earnedMarks: 0,
      questions: []
    };

    exam.questions.forEach(question => {
      const answer = studentAnswers[question.id];
      const result = this.gradeQuestion(question, answer);
      
      results.totalMarks += result.totalMarks;
      results.earnedMarks += result.earnedMarks;
      results.questions.push({
        questionId: question.id,
        ...result
      });
    });

    results.percentage = ((results.earnedMarks / results.totalMarks) * 100).toFixed(2);
    return results;
  }
}

const gradingService = new AutoGradingService();

const exam = {
  title: 'Ethiopian Geography Quiz',
  questions: questions
};

const examAnswers = {
  1: 'False',
  2: 'T',
  3: 'f'
};

const examResults = gradingService.gradeExam(exam, examAnswers);
console.log('Exam:', exam.title);
console.log('Total Marks:', examResults.earnedMarks, '/', examResults.totalMarks);
console.log('Percentage:', examResults.percentage + '%');
console.log('Question Results:');
examResults.questions.forEach((result, index) => {
  console.log(`  Q${index + 1}: ${result.isCorrect ? '✓' : '✗'} ${result.earnedMarks}/${result.totalMarks} marks`);
});
console.log();

console.log('=== Example Complete ===');
