/**
 * Example Integration: MultipleChoiceHandler with Auto-Grading System
 * 
 * This file demonstrates how to integrate the MultipleChoiceHandler
 * with the auto-grading system for exams.
 */

const MultipleChoiceHandler = require('./MultipleChoiceHandler');

// Initialize the handler
const mcHandler = new MultipleChoiceHandler();

// Example 1: Validate and grade a single question
function exampleSingleQuestion() {
  console.log('=== Example 1: Single Question Grading ===\n');

  const question = {
    id: 1,
    type: 'multiple_choice',
    question: 'What is the capital of Ethiopia?',
    options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
    correctAnswer: 'Addis Ababa',
    marks: 2,
    explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
  };

  // Validate the question first
  const validation = mcHandler.validate(question);
  console.log('Validation result:', validation);

  if (validation.valid) {
    // Grade a correct answer
    const result1 = mcHandler.grade(question, 'Addis Ababa');
    console.log('\nCorrect answer result:', result1);

    // Grade an incorrect answer
    const result2 = mcHandler.grade(question, 'Nairobi');
    console.log('\nIncorrect answer result:', result2);

    // Grade with case variation
    const result3 = mcHandler.grade(question, 'addis ababa');
    console.log('\nCase-insensitive result:', result3);
  }
}

// Example 2: Grade multiple questions (exam scenario)
function exampleExamGrading() {
  console.log('\n\n=== Example 2: Full Exam Grading ===\n');

  const examQuestions = [
    {
      id: 1,
      type: 'multiple_choice',
      question: 'What is the capital of Ethiopia?',
      options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
      correctAnswer: 'Addis Ababa',
      marks: 2,
      explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
    },
    {
      id: 2,
      type: 'multiple_choice',
      question: 'Which river originates in Ethiopia?',
      options: ['Nile', 'Congo', 'Niger', 'Zambezi'],
      correctAnswer: 'Nile',
      marks: 2,
      explanation: 'The Blue Nile originates from Lake Tana in Ethiopia.'
    },
    {
      id: 3,
      type: 'multiple_choice',
      question: 'What is the official language of Ethiopia?',
      options: ['Amharic', 'English', 'Arabic', 'Swahili'],
      correctAnswer: 'Amharic',
      marks: 1,
      explanation: 'Amharic is the official working language of Ethiopia.'
    }
  ];

  // Student's answers
  const studentAnswers = {
    1: 'Addis Ababa',  // Correct
    2: 'Congo',        // Incorrect
    3: 'Amharic'       // Correct
  };

  // Grade all questions
  const results = mcHandler.gradeMultiple(examQuestions, studentAnswers);
  
  console.log('Exam Results:');
  console.log('-------------');
  console.log('Total Questions:', results.totalQuestions);
  console.log('Total Marks:', results.totalMarks);
  console.log('Earned Marks:', results.earnedMarks);
  console.log('Percentage:', results.percentage + '%');
  console.log('Correct:', results.correctCount);
  console.log('Incorrect:', results.incorrectCount);
  console.log('Unanswered:', results.unansweredCount);
  
  console.log('\nDetailed Results:');
  results.questionResults.forEach((result, index) => {
    console.log(`\nQuestion ${index + 1}:`);
    console.log('  Correct:', result.isCorrect);
    console.log('  Marks:', result.earnedMarks, '/', result.totalMarks);
    console.log('  Feedback:', result.feedback);
  });
}

// Example 3: Answer validation
function exampleAnswerValidation() {
  console.log('\n\n=== Example 3: Answer Validation ===\n');

  const question = {
    id: 1,
    type: 'multiple_choice',
    question: 'What is the capital of Ethiopia?',
    options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
    correctAnswer: 'Addis Ababa',
    marks: 2,
    explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
  };

  // Valid answer
  const check1 = mcHandler.isAnswerValid(question, 'Addis Ababa');
  console.log('Valid answer check:', check1);

  // Invalid answer (not in options)
  const check2 = mcHandler.isAnswerValid(question, 'Cairo');
  console.log('Invalid answer check:', check2);

  // Empty answer
  const check3 = mcHandler.isAnswerValid(question, '');
  console.log('Empty answer check:', check3);
}

// Example 4: Question statistics (teacher analytics)
function exampleQuestionStatistics() {
  console.log('\n\n=== Example 4: Question Statistics ===\n');

  const question = {
    id: 1,
    type: 'multiple_choice',
    question: 'What is the capital of Ethiopia?',
    options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
    correctAnswer: 'Addis Ababa',
    marks: 2,
    explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
  };

  // Simulate answers from 10 students
  const allStudentAnswers = [
    'Addis Ababa',  // Correct
    'Addis Ababa',  // Correct
    'Nairobi',      // Incorrect
    'Addis Ababa',  // Correct
    'Kampala',      // Incorrect
    'Addis Ababa',  // Correct
    '',             // Unanswered
    'Addis Ababa',  // Correct
    'Nairobi',      // Incorrect
    'Addis Ababa'   // Correct
  ];

  const stats = mcHandler.getQuestionStatistics(question, allStudentAnswers);
  
  console.log('Question Statistics:');
  console.log('-------------------');
  console.log('Total Responses:', stats.totalResponses);
  console.log('Correct:', stats.correctCount);
  console.log('Incorrect:', stats.incorrectCount);
  console.log('Unanswered:', stats.unansweredCount);
  console.log('Correct Percentage:', stats.correctPercentage + '%');
  console.log('Average Score:', stats.averageScore);
  console.log('\nOption Distribution:');
  Object.entries(stats.optionDistribution).forEach(([option, count]) => {
    console.log(`  ${option}: ${count} students`);
  });
}

// Example 5: Integration with Auto-Grading Service
class AutoGradingService {
  constructor() {
    this.mcHandler = new MultipleChoiceHandler();
    // Add other handlers here as they are implemented
  }

  /**
   * Grade a single question based on its type
   */
  gradeQuestion(question, studentAnswer) {
    switch (question.type) {
      case 'multiple_choice':
        return this.mcHandler.grade(question, studentAnswer);
      
      // Add other question types here
      // case 'true_false':
      //   return this.tfHandler.grade(question, studentAnswer);
      
      default:
        return {
          success: false,
          error: `Unsupported question type: ${question.type}`,
          earnedMarks: 0,
          totalMarks: question.marks || 0,
          isCorrect: false,
          feedback: 'This question type requires manual grading'
        };
    }
  }

  /**
   * Grade an entire exam
   */
  gradeExam(exam, studentAnswers) {
    const results = {
      examId: exam.id,
      totalMarks: 0,
      earnedMarks: 0,
      questionResults: [],
      requiresManualGrading: false
    };

    exam.questions.forEach(question => {
      const studentAnswer = studentAnswers[question.id];
      const gradeResult = this.gradeQuestion(question, studentAnswer);

      results.totalMarks += gradeResult.totalMarks;
      results.earnedMarks += gradeResult.earnedMarks;
      results.questionResults.push({
        questionId: question.id,
        ...gradeResult
      });

      // Check if manual grading is needed
      if (gradeResult.earnedMarks === null || !gradeResult.success) {
        results.requiresManualGrading = true;
      }
    });

    results.percentage = results.totalMarks > 0
      ? ((results.earnedMarks / results.totalMarks) * 100).toFixed(2)
      : 0;

    return results;
  }
}

function exampleAutoGradingService() {
  console.log('\n\n=== Example 5: Auto-Grading Service Integration ===\n');

  const gradingService = new AutoGradingService();

  const exam = {
    id: 'exam_001',
    title: 'Ethiopian Geography Quiz',
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        question: 'What is the capital of Ethiopia?',
        options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
        correctAnswer: 'Addis Ababa',
        marks: 2,
        explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question: 'Which river originates in Ethiopia?',
        options: ['Nile', 'Congo', 'Niger', 'Zambezi'],
        correctAnswer: 'Nile',
        marks: 2,
        explanation: 'The Blue Nile originates from Lake Tana in Ethiopia.'
      }
    ]
  };

  const studentAnswers = {
    1: 'Addis Ababa',
    2: 'Nile'
  };

  const examResults = gradingService.gradeExam(exam, studentAnswers);
  
  console.log('Exam Grading Results:');
  console.log('--------------------');
  console.log('Exam ID:', examResults.examId);
  console.log('Total Marks:', examResults.totalMarks);
  console.log('Earned Marks:', examResults.earnedMarks);
  console.log('Percentage:', examResults.percentage + '%');
  console.log('Requires Manual Grading:', examResults.requiresManualGrading);
  
  console.log('\nQuestion Results:');
  examResults.questionResults.forEach(result => {
    console.log(`\nQuestion ${result.questionId}:`);
    console.log('  Success:', result.success);
    console.log('  Correct:', result.isCorrect);
    console.log('  Marks:', result.earnedMarks, '/', result.totalMarks);
  });
}

// Run all examples
if (require.main === module) {
  exampleSingleQuestion();
  exampleExamGrading();
  exampleAnswerValidation();
  exampleQuestionStatistics();
  exampleAutoGradingService();
}

// Export for use in other modules
module.exports = {
  AutoGradingService,
  exampleSingleQuestion,
  exampleExamGrading,
  exampleAnswerValidation,
  exampleQuestionStatistics,
  exampleAutoGradingService
};
