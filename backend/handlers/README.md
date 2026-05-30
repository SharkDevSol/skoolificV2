# Question Handlers

This directory contains handler classes for different question types in the AI Test Generator system. Each handler provides validation and grading functionality for its specific question type.

## Available Handlers

### MultipleChoiceHandler

Handles multiple choice questions with the following features:

- **Validation**: Validates question structure against the multiple choice schema
- **Grading**: Grades student answers with case-insensitive comparison
- **Whitespace Handling**: Automatically trims whitespace from answers
- **Feedback Generation**: Provides detailed feedback for correct/incorrect answers
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student answers are valid options
- **Statistics**: Generates question performance statistics

#### Usage Example

```javascript
const MultipleChoiceHandler = require('./handlers/MultipleChoiceHandler');

const handler = new MultipleChoiceHandler();

// Define a question
const question = {
  id: 1,
  type: 'multiple_choice',
  question: 'What is the capital of Ethiopia?',
  options: ['Addis Ababa', 'Nairobi', 'Kampala', 'Khartoum'],
  correctAnswer: 'Addis Ababa',
  marks: 2,
  explanation: 'Addis Ababa is the capital and largest city of Ethiopia.'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student answer
const result = handler.grade(question, 'Addis Ababa');
console.log('Earned marks:', result.earnedMarks);
console.log('Is correct:', result.isCorrect);
console.log('Feedback:', result.feedback);

// Grade multiple questions
const questions = [question1, question2, question3];
const studentAnswers = {
  1: 'Addis Ababa',
  2: 'Answer 2',
  3: 'Answer 3'
};
const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');

// Check if an answer is valid
const answerCheck = handler.isAnswerValid(question, 'Cairo');
console.log('Is valid:', answerCheck.valid);
console.log('Message:', answerCheck.message);

// Get question statistics
const allAnswers = ['Addis Ababa', 'Nairobi', 'Addis Ababa', 'Kampala'];
const stats = handler.getQuestionStatistics(question, allAnswers);
console.log('Correct count:', stats.correctCount);
console.log('Correct percentage:', stats.correctPercentage + '%');
console.log('Option distribution:', stats.optionDistribution);
```

#### API Reference

##### `validate(question)`

Validates a multiple choice question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `grade(question, studentAnswer)`

Grades a student's answer to a multiple choice question.

**Parameters:**
- `question` (Object): The question object containing correct answer
- `studentAnswer` (string): The student's submitted answer

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned by the student
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether the answer is correct
  - `feedback` (string): Feedback message
  - `studentAnswer` (string): The student's answer
  - `correctAnswer` (string): The correct answer
  - `explanation` (string): Explanation for the correct answer

##### `gradeMultiple(questions, studentAnswers)`

Grades multiple questions at once.

**Parameters:**
- `questions` (Array<Object>): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answers

**Returns:**
- `Object`: Overall grading results with the following properties:
  - `totalQuestions` (number): Number of questions graded
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of correct answers
  - `incorrectCount` (number): Number of incorrect answers
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Percentage score
  - `questionResults` (Array): Individual results for each question

##### `isAnswerValid(question, studentAnswer)`

Checks if a student answer is valid (exists in options).

**Parameters:**
- `question` (Object): The question object
- `studentAnswer` (string): The student's answer

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `getQuestionStatistics(question, allStudentAnswers)`

Gets question statistics for analytics.

**Parameters:**
- `question` (Object): The question object
- `allStudentAnswers` (Array<string>): Array of all student answers for this question

**Returns:**
- `Object`: Statistics with the following properties:
  - `questionId` (number): The question ID
  - `totalResponses` (number): Total number of responses
  - `correctCount` (number): Number of correct answers
  - `incorrectCount` (number): Number of incorrect answers
  - `unansweredCount` (number): Number of unanswered
  - `optionDistribution` (Object): Count of each option selected
  - `averageScore` (string): Average score across all students
  - `correctPercentage` (string): Percentage of correct answers

## Integration with Auto-Grading System

The handlers are designed to integrate seamlessly with the auto-grading engine:

```javascript
const MultipleChoiceHandler = require('./handlers/MultipleChoiceHandler');
const mcHandler = new MultipleChoiceHandler();

class AutoGradingService {
  gradeQuestion(question, studentAnswer) {
    switch (question.type) {
      case 'multiple_choice':
        return mcHandler.grade(question, studentAnswer);
      // Add other question types here
      default:
        throw new Error(`Unsupported question type: ${question.type}`);
    }
  }
}
```

## Testing

Each handler has a comprehensive test suite. Run tests with:

```bash
npm test -- MultipleChoiceHandler.test.js
```

### TrueFalseHandler

Handles true/false questions with the following features:

- **Validation**: Validates question structure against the true/false schema
- **Grading**: Grades student answers with case-insensitive comparison
- **Whitespace Handling**: Automatically trims whitespace from answers
- **Variation Support**: Handles common variations like "T"/"F", "true"/"false", "TRUE"/"FALSE", "1"/"0", "yes"/"no"
- **Feedback Generation**: Provides detailed feedback for correct/incorrect answers
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student answers are valid true/false values
- **Statistics**: Generates question performance statistics with true/false distribution

#### Usage Example

```javascript
const TrueFalseHandler = require('./handlers/TrueFalseHandler');

const handler = new TrueFalseHandler();

// Define a question
const question = {
  id: 1,
  type: 'true_false',
  question: 'Ethiopia uses the Gregorian calendar.',
  options: ['True', 'False'],
  correctAnswer: 'False',
  marks: 1,
  explanation: 'Ethiopia uses the Ethiopian calendar, which is different from the Gregorian calendar.'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student answer (handles variations)
const result1 = handler.grade(question, 'False');  // Standard
const result2 = handler.grade(question, 'f');      // Variation
const result3 = handler.grade(question, '0');      // Numeric variation
const result4 = handler.grade(question, 'no');     // Word variation

console.log('Earned marks:', result1.earnedMarks);
console.log('Is correct:', result1.isCorrect);
console.log('Feedback:', result1.feedback);

// Normalize answers
const normalized = handler.normalizeAnswer('t');  // Returns 'True'
console.log('Normalized:', normalized);

// Grade multiple questions
const questions = [question1, question2, question3];
const studentAnswers = {
  1: 'False',
  2: 'T',
  3: 'no'
};
const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');

// Check if an answer is valid
const answerCheck = handler.isAnswerValid('Maybe');
console.log('Is valid:', answerCheck.valid);
console.log('Message:', answerCheck.message);

// Get question statistics
const allAnswers = ['True', 'False', 'T', 'f'];
const stats = handler.getQuestionStatistics(question, allAnswers);
console.log('Correct count:', stats.correctCount);
console.log('True count:', stats.trueCount);
console.log('False count:', stats.falseCount);
console.log('Invalid count:', stats.invalidCount);
```

#### API Reference

##### `validate(question)`

Validates a true/false question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `normalizeAnswer(answer)`

Normalizes true/false answer to standard format. Handles variations like T/F, true/false, TRUE/FALSE, 1/0, yes/no.

**Parameters:**
- `answer` (string): The answer to normalize

**Returns:**
- `string|null`: Normalized answer ("True" or "False") or null if invalid

##### `grade(question, studentAnswer)`

Grades a student's answer to a true/false question.

**Parameters:**
- `question` (Object): The question object containing correct answer
- `studentAnswer` (string): The student's submitted answer

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned by the student
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether the answer is correct
  - `feedback` (string): Feedback message
  - `studentAnswer` (string): The student's answer
  - `correctAnswer` (string): The correct answer
  - `explanation` (string): Explanation for the correct answer

##### `gradeMultiple(questions, studentAnswers)`

Grades multiple questions at once.

**Parameters:**
- `questions` (Array<Object>): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answers

**Returns:**
- `Object`: Overall grading results with the following properties:
  - `totalQuestions` (number): Number of questions graded
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of correct answers
  - `incorrectCount` (number): Number of incorrect answers
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Percentage score
  - `questionResults` (Array): Individual results for each question

##### `isAnswerValid(studentAnswer)`

Checks if a student answer is valid (True/False or variations).

**Parameters:**
- `studentAnswer` (string): The student's answer

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `getQuestionStatistics(question, allStudentAnswers)`

Gets question statistics for analytics.

**Parameters:**
- `question` (Object): The question object
- `allStudentAnswers` (Array<string>): Array of all student answers for this question

**Returns:**
- `Object`: Statistics with the following properties:
  - `questionId` (number): The question ID
  - `totalResponses` (number): Total number of responses
  - `correctCount` (number): Number of correct answers
  - `incorrectCount` (number): Number of incorrect answers
  - `unansweredCount` (number): Number of unanswered
  - `trueCount` (number): Number of "True" answers
  - `falseCount` (number): Number of "False" answers
  - `invalidCount` (number): Number of invalid answers
  - `averageScore` (string): Average score across all students
  - `correctPercentage` (string): Percentage of correct answers

## Integration with Auto-Grading System

The handlers are designed to integrate seamlessly with the auto-grading engine:

```javascript
const MultipleChoiceHandler = require('./handlers/MultipleChoiceHandler');
const TrueFalseHandler = require('./handlers/TrueFalseHandler');

const mcHandler = new MultipleChoiceHandler();
const tfHandler = new TrueFalseHandler();

class AutoGradingService {
  gradeQuestion(question, studentAnswer) {
    switch (question.type) {
      case 'multiple_choice':
        return mcHandler.grade(question, studentAnswer);
      case 'true_false':
        return tfHandler.grade(question, studentAnswer);
      // Add other question types here
      default:
        throw new Error(`Unsupported question type: ${question.type}`);
    }
  }
}
```

### MultipleTrueFalseHandler

Handles multiple true/false questions with the following features:

- **Validation**: Validates question structure against the multiple true/false schema
- **Grading**: Grades student answers (array of boolean values) with case-insensitive comparison
- **Whitespace Handling**: Automatically trims whitespace from answers
- **Variation Support**: Handles common variations like "T"/"F", "true"/"false", "TRUE"/"FALSE", "1"/"0", "yes"/"no"
- **Partial Credit**: Awards marks proportionally based on correct answers
- **Feedback Generation**: Provides detailed feedback for correct/incorrect answers
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student answers are valid arrays of true/false values
- **Statistics**: Generates question performance statistics with per-statement analysis

#### Usage Example

```javascript
const MultipleTrueFalseHandler = require('./handlers/MultipleTrueFalseHandler');

const handler = new MultipleTrueFalseHandler();

// Define a question
const question = {
  id: 1,
  type: 'multiple_true_false',
  question: 'Evaluate the following statements about Ethiopian geography:',
  statements: [
    'Ethiopia is landlocked',
    'The Blue Nile originates in Ethiopia',
    'Ethiopia is located in West Africa'
  ],
  correctAnswers: [true, true, false],
  marks: 3,
  explanation: 'Ethiopia is landlocked (True), the Blue Nile originates from Lake Tana (True), but Ethiopia is in East Africa, not West Africa (False).'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade student answers (handles variations)
const result1 = handler.grade(question, [true, true, false]);  // All correct
const result2 = handler.grade(question, ['T', 'T', 'F']);      // Variations
const result3 = handler.grade(question, ['1', '1', '0']);      // Numeric variations
const result4 = handler.grade(question, [true, false, false]); // Partial credit

console.log('Earned marks:', result1.earnedMarks);
console.log('Is correct:', result1.isCorrect);
console.log('Correct count:', result1.correctCount, '/', result1.totalStatements);
console.log('Feedback:', result1.feedback);

// View per-statement results
result1.statementResults.forEach((result, index) => {
  console.log(`Statement ${index + 1}:`, result.isCorrect ? '✓' : '✗');
  console.log('  Student:', result.studentAnswer);
  console.log('  Correct:', result.correctAnswer);
});

// Grade multiple questions
const questions = [question1, question2, question3];
const studentAnswers = {
  1: [true, true, false],
  2: ['T', 'F', 'T'],
  3: [false, false]
};
const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');
console.log('Fully correct:', results.correctCount);
console.log('Partially correct:', results.partiallyCorrectCount);

// Check if answers are valid
const answerCheck = handler.areAnswersValid([true, 'Maybe', false], 3);
console.log('Are valid:', answerCheck.valid);
console.log('Message:', answerCheck.message);

// Get question statistics
const allAnswers = [
  [true, true, false],
  [true, false, false],
  [false, true, false]
];
const stats = handler.getQuestionStatistics(question, allAnswers);
console.log('All correct:', stats.allCorrectCount);
console.log('Partially correct:', stats.partiallyCorrectCount);
console.log('Average score:', stats.averageScore);

// Per-statement statistics
stats.statementStats.forEach((stat, index) => {
  console.log(`Statement ${index + 1}:`);
  console.log('  Correct:', stat.correctCount);
  console.log('  Incorrect:', stat.incorrectCount);
  console.log('  Correct %:', stat.correctPercentage + '%');
});
```

#### API Reference

##### `validate(question)`

Validates a multiple true/false question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `normalizeAnswer(answer)`

Normalizes true/false answer to standard format. Handles variations like T/F, true/false, TRUE/FALSE, 1/0, yes/no, and boolean values.

**Parameters:**
- `answer` (any): The answer to normalize

**Returns:**
- `boolean|null`: Normalized answer (true or false) or null if invalid

##### `grade(question, studentAnswers)`

Grades a student's answers to a multiple true/false question with partial credit support.

**Parameters:**
- `question` (Object): The question object containing correct answers
- `studentAnswers` (Array): The student's submitted answers (array of boolean values or variations)

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned by the student (with partial credit)
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether all answers are correct
  - `feedback` (string): Feedback message
  - `correctCount` (number): Number of correct answers
  - `totalStatements` (number): Total number of statements
  - `studentAnswers` (Array<boolean>): The student's normalized answers
  - `correctAnswers` (Array<boolean>): The correct answers
  - `explanation` (string): Explanation for the correct answers
  - `statementResults` (Array): Per-statement results with isCorrect flag

##### `gradeMultiple(questions, studentAnswers)`

Grades multiple questions at once.

**Parameters:**
- `questions` (Array<Object>): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answer arrays

**Returns:**
- `Object`: Overall grading results with the following properties:
  - `totalQuestions` (number): Number of questions graded
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of fully correct questions
  - `partiallyCorrectCount` (number): Number of partially correct questions
  - `incorrectCount` (number): Number of fully incorrect questions
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Percentage score
  - `questionResults` (Array): Individual results for each question

##### `areAnswersValid(studentAnswers, expectedCount)`

Checks if student answers are valid (all are True/False or variations).

**Parameters:**
- `studentAnswers` (Array): The student's answers
- `expectedCount` (number): Expected number of answers

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `getQuestionStatistics(question, allStudentAnswers)`

Gets question statistics for analytics with per-statement breakdown.

**Parameters:**
- `question` (Object): The question object
- `allStudentAnswers` (Array<Array>): Array of all student answer arrays for this question

**Returns:**
- `Object`: Statistics with the following properties:
  - `questionId` (number): The question ID
  - `totalResponses` (number): Total number of responses
  - `allCorrectCount` (number): Number of fully correct responses
  - `partiallyCorrectCount` (number): Number of partially correct responses
  - `allIncorrectCount` (number): Number of fully incorrect responses
  - `unansweredCount` (number): Number of unanswered
  - `averageScore` (string): Average score across all students
  - `allCorrectPercentage` (string): Percentage of fully correct responses
  - `statementStats` (Array): Per-statement statistics with:
    - `statement` (string): The statement text
    - `correctAnswer` (boolean): The correct answer
    - `trueCount` (number): Number of "true" answers
    - `falseCount` (number): Number of "false" answers
    - `correctCount` (number): Number of correct answers
    - `incorrectCount` (number): Number of incorrect answers
    - `correctPercentage` (string): Percentage of correct answers

## Integration with Auto-Grading System

The handlers are designed to integrate seamlessly with the auto-grading engine:

```javascript
const MultipleChoiceHandler = require('./handlers/MultipleChoiceHandler');
const TrueFalseHandler = require('./handlers/TrueFalseHandler');
const MultipleTrueFalseHandler = require('./handlers/MultipleTrueFalseHandler');

const mcHandler = new MultipleChoiceHandler();
const tfHandler = new TrueFalseHandler();
const mtfHandler = new MultipleTrueFalseHandler();

class AutoGradingService {
  gradeQuestion(question, studentAnswer) {
    switch (question.type) {
      case 'multiple_choice':
        return mcHandler.grade(question, studentAnswer);
      case 'true_false':
        return tfHandler.grade(question, studentAnswer);
      case 'multiple_true_false':
        return mtfHandler.grade(question, studentAnswer);
      // Add other question types here
      default:
        throw new Error(`Unsupported question type: ${question.type}`);
    }
  }
}
```

## Testing

Each handler has a comprehensive test suite. Run tests with:

```bash
npm test -- MultipleChoiceHandler.test.js
npm test -- TrueFalseHandler.test.js
npm test -- MultipleTrueFalseHandler.test.js
```

## Future Handlers

The following handlers are planned for implementation:

- MatchingHandler
- NumericHandler
- FillBlankHandler
- ShortAnswerHandler
- EssayHandler
- TransformationHandler

Each handler will follow the same pattern and interface for consistency.


---

### MatchingHandler

Handles matching questions where students match items from a left column with items from a right column.

- **Validation**: Validates question structure against the matching schema
- **Grading**: Grades student answers (array of left-right pairs) with case-insensitive comparison
- **Partial Credit**: Awards marks proportionally based on correct matches
- **Whitespace Handling**: Automatically trims whitespace from answers
- **Feedback Generation**: Provides detailed feedback with per-match results
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student answers have valid format
- **Statistics**: Generates question performance statistics including per-match-pair analysis

#### Usage Example

```javascript
const MatchingHandler = require('./handlers/MatchingHandler');

const handler = new MatchingHandler();

// Define a question
const question = {
  id: 1,
  type: 'matching',
  question: 'Match the Ethiopian emperors with their achievements:',
  leftColumn: ['Haile Selassie', 'Menelik II', 'Tewodros II'],
  rightColumn: ['Modernized Ethiopia', 'Defeated Italy at Adwa', 'Founded Addis Ababa'],
  correctMatches: [
    { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
    { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
    { left: 'Tewodros II', right: 'Founded Addis Ababa' }
  ],
  marks: 3,
  explanation: 'Historical achievements of Ethiopian emperors.'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student answer
const studentAnswers = [
  { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
  { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
  { left: 'Tewodros II', right: 'Wrong Answer' }
];

const result = handler.grade(question, studentAnswers);
console.log('Earned marks:', result.earnedMarks); // 2 (partial credit)
console.log('Is correct:', result.isCorrect); // false
console.log('Correct count:', result.correctCount); // 2 out of 3
console.log('Feedback:', result.feedback);
console.log('Match results:', result.matchResults); // Per-match breakdown

// Grade multiple questions
const questions = [question1, question2, question3];
const allStudentAnswers = {
  1: [
    { left: 'A', right: 'B' },
    { left: 'C', right: 'D' }
  ],
  2: [
    { left: 'X', right: 'Y' },
    { left: 'Z', right: 'W' }
  ]
};
const results = handler.gradeMultiple(questions, allStudentAnswers);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');
console.log('Partially correct:', results.partiallyCorrectCount);

// Check if answers are valid
const answerCheck = handler.areAnswersValid(studentAnswers, 3);
console.log('Is valid:', answerCheck.valid);
console.log('Message:', answerCheck.message);

// Get question statistics
const allAnswers = [
  [
    { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
    { left: 'Menelik II', right: 'Defeated Italy at Adwa' },
    { left: 'Tewodros II', right: 'Founded Addis Ababa' }
  ],
  [
    { left: 'Haile Selassie', right: 'Modernized Ethiopia' },
    { left: 'Menelik II', right: 'Wrong' },
    { left: 'Tewodros II', right: 'Founded Addis Ababa' }
  ]
];
const stats = handler.getQuestionStatistics(question, allAnswers);
console.log('All correct count:', stats.allCorrectCount);
console.log('Partially correct count:', stats.partiallyCorrectCount);
console.log('Average correct matches:', stats.averageCorrectMatches);
console.log('Match pair stats:', stats.matchPairStats); // Per-pair analysis
```

#### API Reference

##### `validate(question)`

Validates a matching question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `normalizeMatch(match)`

Normalizes a match pair for comparison (case-insensitive, trimmed).

**Parameters:**
- `match` (Object): The match object `{left, right}`

**Returns:**
- `Object|null`: Normalized match `{left, right}` or null if invalid

##### `matchesAreEqual(match1, match2)`

Checks if two matches are equal (case-insensitive).

**Parameters:**
- `match1` (Object): First match `{left, right}`
- `match2` (Object): Second match `{left, right}`

**Returns:**
- `boolean`: True if matches are equal

##### `grade(question, studentAnswers)`

Grades a student's answers to a matching question with partial credit support.

**Parameters:**
- `question` (Object): The question object containing correct matches
- `studentAnswers` (Array): Array of student match objects `[{left, right}, ...]`

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned (with partial credit)
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether all matches are correct
  - `feedback` (string): Feedback message
  - `correctCount` (number): Number of correct matches
  - `totalMatches` (number): Total number of matches
  - `matchResults` (Array): Per-match results `[{studentMatch, isCorrect}, ...]`

**Grading Logic:**
- Partial credit: `(correctCount / totalMatches) * question.marks`
- Case-insensitive comparison with whitespace trimming
- Each match is evaluated independently

##### `gradeMultiple(questions, studentAnswers)`

Grades multiple matching questions at once.

**Parameters:**
- `questions` (Array): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answer arrays

**Returns:**
- `Object`: Overall grading results with:
  - `totalQuestions` (number): Number of matching questions
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of fully correct questions
  - `partiallyCorrectCount` (number): Number of partially correct questions
  - `incorrectCount` (number): Number of incorrect questions
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Overall percentage score
  - `questionResults` (Array): Individual question results

##### `areAnswersValid(studentAnswers, expectedCount)`

Checks if student answers are valid (correct format and count).

**Parameters:**
- `studentAnswers` (Array): Array of student match objects
- `expectedCount` (number): Expected number of matches

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `getQuestionStatistics(question, allStudentAnswers)`

Generates comprehensive statistics for a matching question.

**Parameters:**
- `question` (Object): The question object
- `allStudentAnswers` (Array): Array of all student answer arrays

**Returns:**
- `Object`: Statistics with:
  - `questionId` (number): Question ID
  - `totalResponses` (number): Total number of responses
  - `allCorrectCount` (number): Number of fully correct responses
  - `partiallyCorrectCount` (number): Number of partially correct responses
  - `allIncorrectCount` (number): Number of fully incorrect responses
  - `unansweredCount` (number): Number of unanswered responses
  - `averageScore` (string): Average score across all responses
  - `averageCorrectMatches` (string): Average number of correct matches
  - `allCorrectPercentage` (string): Percentage of fully correct responses
  - `matchPairStats` (Array): Per-match-pair statistics with:
    - `correctMatch` (Object): The correct match pair
    - `correctCount` (number): How many students got this match correct
    - `incorrectCount` (number): How many students got this match incorrect
    - `correctPercentage` (string): Percentage who got this match correct

#### Partial Credit Example

```javascript
// Question worth 3 marks with 3 matches
const question = {
  marks: 3,
  correctMatches: [
    { left: 'A', right: '1' },
    { left: 'B', right: '2' },
    { left: 'C', right: '3' }
  ]
};

// Student gets 2 out of 3 correct
const studentAnswers = [
  { left: 'A', right: '1' },  // Correct
  { left: 'B', right: '2' },  // Correct
  { left: 'C', right: 'Wrong' }  // Incorrect
];

const result = handler.grade(question, studentAnswers);
// result.earnedMarks = 2 (2/3 * 3 marks)
// result.correctCount = 2
// result.isCorrect = false
```

---


---

### NumericHandler

Handles numeric/computational response questions where students provide numerical answers.

- **Validation**: Validates question structure against the numeric schema
- **Grading**: Grades student answers with exact numeric comparison
- **Acceptable Range**: Supports tolerance ranges for rounding (e.g., 3.13-3.15 for pi)
- **Unit Validation**: Optional unit checking (e.g., "cm²", "kg", "m")
- **Numeric Extraction**: Extracts numbers from various formats ("96", "96 cm²", "96cm²")
- **Feedback Generation**: Provides detailed feedback including unit errors
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student answers are valid numbers
- **Statistics**: Generates comprehensive statistics including answer distribution (min, max, mean, median)

#### Usage Example

```javascript
const NumericHandler = require('./handlers/NumericHandler');

const handler = new NumericHandler();

// Define a question with unit
const question = {
  id: 1,
  type: 'numeric',
  question: 'Calculate the area of a rectangle with length 12 cm and width 8 cm.',
  correctAnswer: '96',
  unit: 'cm²',
  marks: 2,
  explanation: 'Area = length × width = 12 × 8 = 96 cm²'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student answer
const result = handler.grade(question, '96 cm²');
console.log('Earned marks:', result.earnedMarks); // 2
console.log('Is correct:', result.isCorrect); // true
console.log('Numeric value:', result.numericValue); // 96
console.log('Unit correct:', result.unitCorrect); // true
console.log('Feedback:', result.feedback);

// Grade answer with wrong unit
const result2 = handler.grade(question, '96 m²');
console.log('Earned marks:', result2.earnedMarks); // 0
console.log('Unit correct:', result2.unitCorrect); // false
console.log('Feedback:', result2.feedback); // "Numeric value is correct, but Incorrect unit..."

// Question with acceptable range
const questionRange = {
  id: 2,
  type: 'numeric',
  question: 'Calculate the value of pi to 2 decimal places.',
  correctAnswer: '3.14',
  acceptableRange: { min: 3.13, max: 3.15 },
  marks: 2,
  explanation: 'The value of pi is approximately 3.14.'
};

console.log(handler.grade(questionRange, '3.14').isCorrect); // true
console.log(handler.grade(questionRange, '3.13').isCorrect); // true
console.log(handler.grade(questionRange, '3.15').isCorrect); // true
console.log(handler.grade(questionRange, '3.12').isCorrect); // false

// Grade multiple questions
const questions = [question1, question2, question3];
const studentAnswers = {
  1: '96 cm²',
  2: '3.14',
  3: '42'
};
const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');

// Check if an answer is valid
const answerCheck = handler.isAnswerValid('96 cm²');
console.log('Is valid:', answerCheck.valid); // true

const answerCheck2 = handler.isAnswerValid('abc');
console.log('Is valid:', answerCheck2.valid); // false

// Get question statistics
const allAnswers = ['96 cm²', '100 cm²', '96cm²', '90 cm²'];
const stats = handler.getQuestionStatistics(question, allAnswers);
console.log('Correct count:', stats.correctCount);
console.log('Correct percentage:', stats.correctPercentage + '%');
console.log('Answer distribution:', stats.answerDistribution);
// {
//   min: 90,
//   max: 100,
//   mean: '95.50',
//   median: '96.00'
// }
```

#### API Reference

##### `validate(question)`

Validates a numeric question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `extractNumericValue(value)`

Extracts numeric value from various formats.

**Parameters:**
- `value` (any): The value to extract number from (string, number, etc.)

**Returns:**
- `number|null`: Extracted number or null if invalid

**Supported Formats:**
- Pure numbers: `96`, `3.14`, `-5`
- Strings: `"96"`, `"3.14"`, `"-5"`
- With units: `"96 cm²"`, `"96cm²"`, `"3.14 m"`
- Decimals: `"0.5"`, `".5"`, `"10.99"`

##### `extractUnit(answer)`

Extracts unit from a string answer.

**Parameters:**
- `answer` (string): The answer string

**Returns:**
- `string|null`: Extracted unit or null

##### `isWithinRange(value, range)`

Checks if a value is within an acceptable range.

**Parameters:**
- `value` (number): The value to check
- `range` (Object): The acceptable range `{min, max}`

**Returns:**
- `boolean`: True if within range

##### `grade(question, studentAnswer)`

Grades a student's answer to a numeric question.

**Parameters:**
- `question` (Object): The question object containing correct answer
- `studentAnswer` (any): The student's submitted answer

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned by the student
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether the answer is correct
  - `numericValue` (number): Extracted numeric value from student answer
  - `correctNumericValue` (number): Correct numeric value
  - `unitCorrect` (boolean): Whether the unit is correct (if unit required)
  - `feedback` (string): Feedback message
  - `studentAnswer` (any): The student's answer
  - `correctAnswer` (any): The correct answer
  - `explanation` (string): Explanation for the correct answer

**Grading Logic:**
- Extracts numeric value from student answer
- Compares with correct answer (exact or within acceptable range)
- If unit specified, validates unit separately
- Both numeric value AND unit must be correct for full marks
- Provides specific feedback for unit errors

##### `gradeMultiple(questions, studentAnswers)`

Grades multiple numeric questions at once.

**Parameters:**
- `questions` (Array): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answers

**Returns:**
- `Object`: Overall grading results with:
  - `totalQuestions` (number): Number of numeric questions
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of correct answers
  - `incorrectCount` (number): Number of incorrect answers
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Overall percentage score
  - `questionResults` (Array): Individual question results

##### `isAnswerValid(studentAnswer)`

Checks if a student answer is valid (can be parsed as number).

**Parameters:**
- `studentAnswer` (any): The student's answer

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `getQuestionStatistics(question, allStudentAnswers)`

Generates comprehensive statistics for a numeric question.

**Parameters:**
- `question` (Object): The question object
- `allStudentAnswers` (Array): Array of all student answers

**Returns:**
- `Object`: Statistics with:
  - `questionId` (number): Question ID
  - `totalResponses` (number): Total number of responses
  - `correctCount` (number): Number of correct responses
  - `incorrectCount` (number): Number of incorrect responses
  - `unansweredCount` (number): Number of unanswered responses
  - `invalidCount` (number): Number of invalid (non-numeric) responses
  - `averageScore` (string): Average score across all responses
  - `correctPercentage` (string): Percentage of correct responses
  - `averageStudentAnswer` (string): Average of all numeric answers
  - `correctAnswer` (number): The correct numeric answer
  - `answerDistribution` (Object): Distribution statistics:
    - `min` (number): Minimum answer value
    - `max` (number): Maximum answer value
    - `mean` (string): Mean (average) of all answers
    - `median` (string): Median of all answers

#### Acceptable Range Example

```javascript
// Question with tolerance for rounding
const question = {
  type: 'numeric',
  question: 'Calculate the value of pi to 2 decimal places.',
  correctAnswer: '3.14',
  acceptableRange: { min: 3.13, max: 3.15 },
  marks: 2,
  explanation: 'The value of pi is approximately 3.14.'
};

// All these answers are accepted
handler.grade(question, '3.13'); // Correct
handler.grade(question, '3.14'); // Correct
handler.grade(question, '3.15'); // Correct

// These are rejected
handler.grade(question, '3.12'); // Incorrect
handler.grade(question, '3.16'); // Incorrect
```

#### Unit Validation Example

```javascript
const question = {
  type: 'numeric',
  question: 'Calculate the area of a rectangle with length 12 cm and width 8 cm.',
  correctAnswer: '96',
  unit: 'cm²',
  marks: 2
};

// Correct answer with correct unit
handler.grade(question, '96 cm²');
// { earnedMarks: 2, isCorrect: true, unitCorrect: true }

// Correct number but wrong unit
handler.grade(question, '96 m²');
// { earnedMarks: 0, isCorrect: false, unitCorrect: false }
// Feedback: "Numeric value is correct, but Incorrect unit: expected 'cm²', got 'm²'."

// Correct number but missing unit
handler.grade(question, '96');
// { earnedMarks: 0, isCorrect: false, unitCorrect: false }
// Feedback: "Numeric value is correct, but Missing unit: expected 'cm²'."
```

---


---

### FillBlankHandler

Handles fill-in-the-blank questions where students provide answers for multiple blanks in a sentence or paragraph.

- **Validation**: Validates question structure against the fill-in-the-blank schema
- **Grading**: Grades student answers (array of strings for multiple blanks)
- **Partial Credit**: Awards marks proportionally based on correct blanks
- **Case-Insensitive Comparison**: Handles case variations automatically
- **Whitespace Handling**: Automatically trims whitespace from answers
- **Feedback Generation**: Provides detailed feedback with per-blank results
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student answers have valid format
- **Statistics**: Generates comprehensive statistics including per-blank analysis and common incorrect answers

#### Usage Example

```javascript
const FillBlankHandler = require('./handlers/FillBlankHandler');

const handler = new FillBlankHandler();

// Define a question
const question = {
  id: 1,
  type: 'fill_blank',
  question: 'The capital of Ethiopia is _____ and it is located at an elevation of approximately _____ meters.',
  correctAnswers: ['Addis Ababa', '2400'],
  marks: 4,
  explanation: 'Addis Ababa is the capital of Ethiopia and sits at about 2,400 meters above sea level.'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student answer
const studentAnswers = ['Addis Ababa', '2400'];
const result = handler.grade(question, studentAnswers);
console.log('Earned marks:', result.earnedMarks); // 4
console.log('Is correct:', result.isCorrect); // true
console.log('Correct count:', result.correctCount); // 2 out of 2
console.log('Feedback:', result.feedback);
console.log('Blank results:', result.blankResults); // Per-blank breakdown

// Grade with partial credit
const partialAnswers = ['Addis Ababa', '2500']; // Second blank wrong
const result2 = handler.grade(question, partialAnswers);
console.log('Earned marks:', result2.earnedMarks); // 2 (50% of 4 marks)
console.log('Is correct:', result2.isCorrect); // false
console.log('Correct count:', result2.correctCount); // 1 out of 2

// View per-blank results
result2.blankResults.forEach((blank, index) => {
  console.log(`Blank ${blank.blankNumber}:`, blank.isCorrect ? '✓' : '✗');
  console.log('  Student:', blank.studentAnswer);
  console.log('  Correct:', blank.correctAnswer);
});

// Case-insensitive and whitespace handling
const result3 = handler.grade(question, ['  addis ababa  ', '  2400  ']);
console.log('Is correct:', result3.isCorrect); // true (normalized automatically)

// Grade multiple questions
const questions = [question1, question2, question3];
const allStudentAnswers = {
  1: ['Addis Ababa', '2400'],
  2: ['Answer1', 'Answer2'],
  3: ['A', 'B', 'C']
};
const results = handler.gradeMultiple(questions, allStudentAnswers);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');
console.log('Fully correct:', results.correctCount);
console.log('Partially correct:', results.partiallyCorrectCount);

// Check if answers are valid
const answerCheck = handler.areAnswersValid(['Addis Ababa', '2400'], 2);
console.log('Are valid:', answerCheck.valid); // true
console.log('Message:', answerCheck.message);

// Get question statistics
const allAnswers = [
  ['Addis Ababa', '2400'],
  ['Addis Ababa', '2500'],
  ['Nairobi', '2400']
];
const stats = handler.getQuestionStatistics(question, allAnswers);
console.log('All correct count:', stats.allCorrectCount);
console.log('Partially correct count:', stats.partiallyCorrectCount);
console.log('Average score:', stats.averageScore);
console.log('Average correct blanks:', stats.averageCorrectBlanks);

// Per-blank statistics
stats.blankStats.forEach((stat, index) => {
  console.log(`Blank ${stat.blankNumber}:`);
  console.log('  Correct answer:', stat.correctAnswer);
  console.log('  Correct count:', stat.correctCount);
  console.log('  Incorrect count:', stat.incorrectCount);
  console.log('  Correct %:', stat.correctPercentage + '%');
  console.log('  Common incorrect:', stat.commonIncorrectAnswers);
});
```

#### API Reference

##### `validate(question)`

Validates a fill-in-the-blank question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `normalizeAnswer(answer)`

Normalizes a blank answer for comparison (case-insensitive, trimmed).

**Parameters:**
- `answer` (string): The answer to normalize

**Returns:**
- `string|null`: Normalized answer or null if invalid

##### `answersAreEqual(answer1, answer2)`

Checks if two answers are equal (case-insensitive).

**Parameters:**
- `answer1` (string): First answer
- `answer2` (string): Second answer

**Returns:**
- `boolean`: True if answers are equal

##### `grade(question, studentAnswers)`

Grades a student's answers to a fill-in-the-blank question with partial credit support.

**Parameters:**
- `question` (Object): The question object containing correct answers
- `studentAnswers` (Array): Array of student answers (one per blank)

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned (with partial credit)
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether all blanks are correct
  - `feedback` (string): Feedback message
  - `correctCount` (number): Number of correct blanks
  - `totalBlanks` (number): Total number of blanks
  - `studentAnswers` (Array): The student's answers
  - `correctAnswers` (Array): The correct answers
  - `explanation` (string): Explanation for the correct answers
  - `blankResults` (Array): Per-blank results with:
    - `blankNumber` (number): Blank position (1-indexed)
    - `studentAnswer` (string): Student's answer for this blank
    - `correctAnswer` (string): Correct answer for this blank
    - `isCorrect` (boolean): Whether this blank is correct

**Grading Logic:**
- Partial credit: `(correctCount / totalBlanks) * question.marks`
- Case-insensitive comparison with whitespace trimming
- Each blank is evaluated independently
- Student must provide exactly the right number of answers

##### `gradeMultiple(questions, studentAnswers)`

Grades multiple fill-in-the-blank questions at once.

**Parameters:**
- `questions` (Array): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answer arrays

**Returns:**
- `Object`: Overall grading results with:
  - `totalQuestions` (number): Number of fill-in-the-blank questions
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of fully correct questions
  - `partiallyCorrectCount` (number): Number of partially correct questions
  - `incorrectCount` (number): Number of incorrect questions
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Overall percentage score
  - `questionResults` (Array): Individual question results

##### `areAnswersValid(studentAnswers, expectedCount)`

Checks if student answers are valid (correct format and count).

**Parameters:**
- `studentAnswers` (Array): Array of student answers
- `expectedCount` (number): Expected number of blanks

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `getQuestionStatistics(question, allStudentAnswers)`

Generates comprehensive statistics for a fill-in-the-blank question.

**Parameters:**
- `question` (Object): The question object
- `allStudentAnswers` (Array): Array of all student answer arrays

**Returns:**
- `Object`: Statistics with:
  - `questionId` (number): Question ID
  - `totalResponses` (number): Total number of responses
  - `allCorrectCount` (number): Number of fully correct responses
  - `partiallyCorrectCount` (number): Number of partially correct responses
  - `allIncorrectCount` (number): Number of fully incorrect responses
  - `unansweredCount` (number): Number of unanswered responses
  - `averageScore` (string): Average score across all responses
  - `averageCorrectBlanks` (string): Average number of correct blanks
  - `allCorrectPercentage` (string): Percentage of fully correct responses
  - `blankStats` (Array): Per-blank statistics with:
    - `blankNumber` (number): Blank position (1-indexed)
    - `correctAnswer` (string): The correct answer for this blank
    - `correctCount` (number): How many students got this blank correct
    - `incorrectCount` (number): How many students got this blank incorrect
    - `correctPercentage` (string): Percentage who got this blank correct
    - `commonIncorrectAnswers` (Object): Map of incorrect answers to their frequency

#### Partial Credit Example

```javascript
// Question worth 4 marks with 2 blanks
const question = {
  marks: 4,
  correctAnswers: ['Addis Ababa', '2400']
};

// Student gets 1 out of 2 correct
const studentAnswers = ['Addis Ababa', '2500'];

const result = handler.grade(question, studentAnswers);
// result.earnedMarks = 2 (1/2 * 4 marks = 50%)
// result.correctCount = 1
// result.isCorrect = false
// result.blankResults[0].isCorrect = true
// result.blankResults[1].isCorrect = false
```

#### Case-Insensitive Example

```javascript
const question = {
  type: 'fill_blank',
  question: 'The capital is _____.',
  correctAnswers: ['Addis Ababa'],
  marks: 2
};

// All these answers are accepted
handler.grade(question, ['Addis Ababa']); // Correct
handler.grade(question, ['addis ababa']); // Correct (case-insensitive)
handler.grade(question, ['ADDIS ABABA']); // Correct (case-insensitive)
handler.grade(question, ['  Addis Ababa  ']); // Correct (whitespace trimmed)
```


---

### ShortAnswerHandler

Handles short answer questions that require manual grading by teachers. Unlike other question types, short answer questions **CANNOT be auto-graded** and must be reviewed manually.

**IMPORTANT: Manual Grading Required**

Short answer questions require subjective evaluation by teachers. This handler:
- Validates question structure and student answer format
- Marks questions for manual grading (does NOT assign marks automatically)
- Provides model answers and key points to teachers for grading reference
- Generates analytics after manual grading is complete

#### Features

- **Validation**: Validates question structure against the short answer schema
- **Manual Grading Workflow**: Marks all questions for teacher review (no auto-grading)
- **Answer Format Validation**: Checks if student answers are valid (non-empty strings)
- **Teacher Reference**: Provides model answer and key points for grading guidance
- **Batch Processing**: Can process multiple questions at once
- **Statistics**: Generates performance analytics after manual grading

#### Manual Grading Workflow

1. **Student Submission**: Student submits a text answer
2. **Validation**: Handler validates answer format (non-empty string)
3. **Marked for Review**: Question is marked with `requiresManualGrading: true`
4. **Teacher Review**: Teacher reviews student answer against model answer and key points
5. **Manual Grading**: Teacher assigns marks based on answer quality
6. **Analytics**: Statistics can be generated after grading is complete

#### Usage Example

```javascript
const ShortAnswerHandler = require('./handlers/ShortAnswerHandler');

const handler = new ShortAnswerHandler();

// Define a question
const question = {
  id: 1,
  type: 'short_answer',
  question: 'Explain the significance of the Battle of Adwa in Ethiopian history.',
  modelAnswer: 'The Battle of Adwa (1896) was a decisive victory for Ethiopia against Italian colonial forces. It preserved Ethiopian independence and made Ethiopia the only African nation to successfully resist European colonization during the Scramble for Africa.',
  keyPoints: [
    'Decisive Ethiopian victory',
    'Defeated Italian colonization attempt',
    'Preserved Ethiopian independence',
    'Symbol of African resistance'
  ],
  marks: 5,
  explanation: 'A complete answer should mention the victory over Italy, preservation of independence, and significance for African resistance to colonialism.'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Process student answer (marks for manual grading)
const studentAnswer = 'The Battle of Adwa was a significant victory for Ethiopia against Italy in 1896. It helped preserve Ethiopian independence during the colonial era.';

const result = handler.grade(question, studentAnswer);
console.log('Requires manual grading:', result.requiresManualGrading); // true
console.log('Earned marks:', result.earnedMarks); // null (not auto-graded)
console.log('Total marks:', result.totalMarks); // 5
console.log('Is answered:', result.isAnswered); // true
console.log('Feedback:', result.feedback); // "Pending manual grading by teacher"

// Teacher reference for grading
console.log('Model answer:', result.modelAnswer);
console.log('Key points:', result.keyPoints);
// Teacher uses these to manually assign marks

// Check if answer format is valid
const answerCheck = handler.isAnswerValid(studentAnswer);
console.log('Is valid:', answerCheck.valid); // true
console.log('Message:', answerCheck.message); // "Answer is valid"

// Process multiple questions
const questions = [question1, question2, question3];
const studentAnswers = {
  1: 'Student answer for question 1',
  2: 'Student answer for question 2',
  3: 'Student answer for question 3'
};

const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total questions:', results.totalQuestions);
console.log('Total marks:', results.totalMarks);
console.log('Earned marks:', results.earnedMarks); // null (requires manual grading)
console.log('Answered count:', results.answeredCount);
console.log('Requires manual grading:', results.requiresManualGrading); // true

// After teacher manually grades responses, generate statistics
const gradedResponses = [
  { studentAnswer: 'Answer 1', earnedMarks: 5 },  // Teacher assigned 5/5
  { studentAnswer: 'Answer 2', earnedMarks: 4 },  // Teacher assigned 4/5
  { studentAnswer: 'Answer 3', earnedMarks: 3 }   // Teacher assigned 3/5
];

const stats = handler.getQuestionStatistics(question, gradedResponses);
console.log('Total responses:', stats.totalResponses);
console.log('Graded count:', stats.gradedCount);
console.log('Average score:', stats.averageScore);
console.log('Average percentage:', stats.averagePercentage);
console.log('Score distribution:', stats.scoreDistribution);
```

#### API Reference

##### `validate(question)`

Validates a short answer question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

**Required Fields:**
- `type`: Must be "short_answer"
- `question`: Question text (10-2000 characters)
- `modelAnswer`: Teacher's model answer (20-1000 characters)
- `keyPoints`: Array of key points (2-10 items, each 5-200 characters)
- `marks`: Marks allocated (0.5-100)
- `explanation`: Explanation text (10-1000 characters)

##### `isAnswerValid(studentAnswer)`

Checks if a student answer is valid (non-empty string).

**Parameters:**
- `studentAnswer` (any): The student's answer to validate

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

**Validation Rules:**
- Must not be null or undefined
- Must be a string
- Must not be empty or whitespace-only

##### `grade(question, studentAnswer)`

Processes a student's answer and marks it for manual grading.

**IMPORTANT: This method does NOT auto-grade. It marks the question for teacher review.**

**Parameters:**
- `question` (Object): The question object containing model answer and key points
- `studentAnswer` (string): The student's submitted answer

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether processing was successful
  - `earnedMarks` (null): Always null (requires manual grading)
  - `totalMarks` (number): Total marks for the question
  - `requiresManualGrading` (boolean): Always true
  - `isAnswered` (boolean): Whether student provided a valid answer
  - `feedback` (string): Feedback message ("Pending manual grading by teacher")
  - `studentAnswer` (string): The student's answer
  - `modelAnswer` (string): Teacher's model answer for reference
  - `keyPoints` (Array): Key points for grading reference
  - `explanation` (string): Explanation for the correct answer

**Grading Logic:**
- Validates question structure
- Validates student answer format
- Returns result marked for manual grading
- Provides model answer and key points to teacher
- **Never assigns marks automatically**

##### `gradeMultiple(questions, studentAnswers)`

Processes multiple short answer questions at once.

**IMPORTANT: All questions are marked for manual grading. No automatic marks are assigned.**

**Parameters:**
- `questions` (Array): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answers

**Returns:**
- `Object`: Overall results with:
  - `totalQuestions` (number): Number of short answer questions
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (null): Always null (requires manual grading)
  - `answeredCount` (number): Number of answered questions
  - `unansweredCount` (number): Number of unanswered questions
  - `requiresManualGrading` (boolean): Always true
  - `questionResults` (Array): Individual question results

##### `getQuestionStatistics(question, gradedResponses)`

Generates statistics for a question after manual grading is complete.

**Note: This method requires that teachers have already assigned marks to student answers.**

**Parameters:**
- `question` (Object): The question object
- `gradedResponses` (Array): Array of manually graded responses
  - Each response: `{ studentAnswer: string, earnedMarks: number }`

**Returns:**
- `Object`: Statistics with:
  - `questionId` (number): Question ID
  - `totalResponses` (number): Total number of responses
  - `gradedCount` (number): Number of graded responses
  - `ungradedCount` (number): Number of ungraded responses
  - `averageScore` (string): Average score across graded responses
  - `averagePercentage` (string): Average percentage across graded responses
  - `scoreDistribution` (Object): Distribution of scores:
    - `fullMarks` (number): Count of 100% scores
    - `threeQuarters` (number): Count of 75-99% scores
    - `half` (number): Count of 50-74% scores
    - `quarter` (number): Count of 25-49% scores
    - `zero` (number): Count of 0-24% scores
  - `modelAnswer` (string): The model answer
  - `keyPoints` (Array): The key points

#### Manual Grading Workflow Example

```javascript
// Step 1: Student submits answer
const studentAnswer = 'The Battle of Adwa was important for Ethiopian independence.';

// Step 2: Handler validates and marks for manual grading
const result = handler.grade(question, studentAnswer);
// result.requiresManualGrading = true
// result.earnedMarks = null
// result.modelAnswer = "The Battle of Adwa (1896)..."
// result.keyPoints = ['Decisive Ethiopian victory', ...]

// Step 3: Teacher reviews student answer against model answer and key points
// Teacher UI displays:
// - Student answer
// - Model answer
// - Key points to look for
// - Input field for teacher to assign marks

// Step 4: Teacher manually assigns marks (e.g., 4 out of 5)
const teacherAssignedMarks = 4;

// Step 5: After all responses are graded, generate statistics
const gradedResponses = [
  { studentAnswer: 'Answer 1', earnedMarks: 5 },
  { studentAnswer: 'Answer 2', earnedMarks: 4 },
  { studentAnswer: 'Answer 3', earnedMarks: 3 },
  { studentAnswer: 'Answer 4', earnedMarks: null } // Not yet graded
];

const stats = handler.getQuestionStatistics(question, gradedResponses);
// stats.gradedCount = 3
// stats.ungradedCount = 1
// stats.averageScore = "4.00" (average of 5, 4, 3)
// stats.scoreDistribution = { fullMarks: 1, threeQuarters: 1, half: 1, ... }
```

#### Why Manual Grading is Required

Short answer questions require subjective evaluation because:

1. **Multiple Valid Approaches**: Students may express correct ideas in different ways
2. **Partial Credit**: Teachers need to assess which key points are covered
3. **Writing Quality**: Grammar, clarity, and organization matter
4. **Context Understanding**: Teachers can evaluate depth of understanding
5. **Nuanced Scoring**: Not all key points may be equally important

The handler provides:
- **Model Answer**: Shows what a complete answer looks like
- **Key Points**: Lists specific concepts that should be mentioned
- **Explanation**: Guides teachers on what to look for

#### Integration with Auto-Grading System

```javascript
const ShortAnswerHandler = require('./handlers/ShortAnswerHandler');
const MultipleChoiceHandler = require('./handlers/MultipleChoiceHandler');
const FillBlankHandler = require('./handlers/FillBlankHandler');

const shortAnswerHandler = new ShortAnswerHandler();
const mcHandler = new MultipleChoiceHandler();
const fbHandler = new FillBlankHandler();

class AutoGradingService {
  gradeQuestion(question, studentAnswer) {
    switch (question.type) {
      case 'multiple_choice':
        return mcHandler.grade(question, studentAnswer);
      
      case 'fill_blank':
        return fbHandler.grade(question, studentAnswer);
      
      case 'short_answer':
        // Mark for manual grading
        const result = shortAnswerHandler.grade(question, studentAnswer);
        // Store in database with requiresManualGrading flag
        // Teacher will grade later through admin interface
        return result;
      
      default:
        throw new Error(`Unsupported question type: ${question.type}`);
    }
  }

  // Separate method for questions requiring manual grading
  getQuestionsForManualGrading(examId) {
    // Query database for questions where requiresManualGrading = true
    // Return list for teacher to grade
  }

  // After teacher grades, update the database
  submitManualGrade(questionId, studentId, earnedMarks) {
    // Update database with teacher-assigned marks
    // Remove requiresManualGrading flag
  }
}
```

#### Answer Validation Example

```javascript
// Valid answers
handler.isAnswerValid('This is a valid answer.');
// { valid: true, message: 'Answer is valid' }

handler.isAnswerValid('The Battle of Adwa was significant because...');
// { valid: true, message: 'Answer is valid' }

// Invalid answers
handler.isAnswerValid('');
// { valid: false, message: 'Answer cannot be empty' }

handler.isAnswerValid('   ');
// { valid: false, message: 'Answer cannot be empty' }

handler.isAnswerValid(null);
// { valid: false, message: 'Answer is required' }

handler.isAnswerValid(12345);
// { valid: false, message: 'Answer must be a string' }

handler.isAnswerValid(['answer']);
// { valid: false, message: 'Answer must be a string' }
```

#### Statistics Example

```javascript
const question = {
  id: 1,
  type: 'short_answer',
  question: 'Explain the significance of the Battle of Adwa.',
  modelAnswer: 'The Battle of Adwa was a decisive victory...',
  keyPoints: ['Victory', 'Independence', 'Resistance', 'Colonialism'],
  marks: 10,
  explanation: 'A complete answer should mention...'
};

// After teachers manually grade student responses
const gradedResponses = [
  { studentAnswer: 'Excellent answer...', earnedMarks: 10 },  // 100%
  { studentAnswer: 'Good answer...', earnedMarks: 8 },        // 80%
  { studentAnswer: 'Decent answer...', earnedMarks: 6 },      // 60%
  { studentAnswer: 'Weak answer...', earnedMarks: 3 },        // 30%
  { studentAnswer: 'Poor answer...', earnedMarks: 0 },        // 0%
  { studentAnswer: 'Not graded yet...', earnedMarks: null }   // Ungraded
];

const stats = handler.getQuestionStatistics(question, gradedResponses);

console.log('Total responses:', stats.totalResponses);        // 6
console.log('Graded:', stats.gradedCount);                    // 5
console.log('Ungraded:', stats.ungradedCount);                // 1
console.log('Average score:', stats.averageScore);            // "5.40" (27/5)
console.log('Average percentage:', stats.averagePercentage);  // "54.00"

console.log('Score distribution:');
console.log('  Full marks (100%):', stats.scoreDistribution.fullMarks);        // 1
console.log('  Three quarters (75-99%):', stats.scoreDistribution.threeQuarters); // 1
console.log('  Half (50-74%):', stats.scoreDistribution.half);                 // 1
console.log('  Quarter (25-49%):', stats.scoreDistribution.quarter);           // 1
console.log('  Zero (0-24%):', stats.scoreDistribution.zero);                  // 1
```

---

## Testing

Each handler has a comprehensive test suite. Run tests with:

```bash
npm test -- MultipleChoiceHandler.test.js
npm test -- TrueFalseHandler.test.js
npm test -- MultipleTrueFalseHandler.test.js
npm test -- MatchingHandler.test.js
npm test -- NumericHandler.test.js
npm test -- FillBlankHandler.test.js
npm test -- ShortAnswerHandler.test.js
npm test -- EssayHandler.test.js
npm test -- TransformationHandler.test.js
```

### TransformationHandler

Handles transformation/error correction questions where students transform or correct given text.

- **Validation**: Validates transformation question structure against the transformation schema
- **Grading**: Grades student transformations with case-insensitive comparison
- **Whitespace Handling**: Automatically trims and normalizes whitespace
- **Feedback Generation**: Provides detailed feedback for correct/incorrect transformations
- **Batch Grading**: Can grade multiple questions at once
- **Answer Validation**: Checks if student transformations are valid (non-empty strings)
- **Statistics**: Generates question performance statistics including common errors tracking

#### Usage Example

```javascript
const TransformationHandler = require('./handlers/TransformationHandler');

const handler = new TransformationHandler();

// Define a transformation question
const question = {
  id: 1,
  type: 'transformation',
  question: 'Correct the grammatical errors in the following sentence:',
  originalText: 'The students was going to school when it start raining.',
  correctTransformation: 'The students were going to school when it started raining.',
  marks: 2,
  explanation: 'Subject-verb agreement: "students" (plural) requires "were" not "was". Past tense consistency: "started" not "start".'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student transformation
const studentTransformation = 'The students were going to school when it started raining.';
const result = handler.grade(question, studentTransformation);
console.log('Earned marks:', result.earnedMarks); // 2
console.log('Is correct:', result.isCorrect); // true
console.log('Feedback:', result.feedback); // "Correct! Your transformation matches the expected answer."

// Grade with different case (still correct)
const result2 = handler.grade(question, 'THE STUDENTS WERE GOING TO SCHOOL WHEN IT STARTED RAINING.');
console.log('Is correct:', result2.isCorrect); // true (case-insensitive)

// Grade incorrect transformation
const result3 = handler.grade(question, 'The students was going to school when it starts raining.');
console.log('Earned marks:', result3.earnedMarks); // 0
console.log('Is correct:', result3.isCorrect); // false

// Normalize text for comparison
const normalized = handler.normalizeText('  HELLO   WORLD  \n\t');
console.log('Normalized:', normalized); // "hello world"

// Check if transformation is valid
const transformationCheck = handler.isTransformationValid(studentTransformation);
console.log('Is valid:', transformationCheck.valid); // true

// Grade multiple transformation questions
const questions = [question1, question2, question3];
const studentTransformations = {
  1: 'The students were going to school when it started raining.',
  2: 'She doesn\'t like apples.',
  3: 'They were happy.'
};
const results = handler.gradeMultiple(questions, studentTransformations);
console.log('Total marks:', results.earnedMarks, '/', results.totalMarks);
console.log('Percentage:', results.percentage + '%');
console.log('Correct count:', results.correctCount);

// Get question statistics
const allTransformations = [
  'The students were going to school when it started raining.', // Correct
  'The students was going to school when it starts raining.', // Incorrect
  'The students were going to school when it started raining.' // Correct
];
const stats = handler.getQuestionStatistics(question, allTransformations);
console.log('Correct count:', stats.correctCount); // 2
console.log('Correct percentage:', stats.correctPercentage + '%'); // 66.67%
console.log('Common errors:', stats.commonErrors); // Top 5 common incorrect transformations
```

#### API Reference

##### `validate(question)`

Validates a transformation question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `normalizeText(text)`

Normalizes text for comparison (lowercase, trimmed, whitespace-normalized).

**Parameters:**
- `text` (string): The text to normalize

**Returns:**
- `string`: Normalized text

##### `isTransformationValid(studentTransformation)`

Checks if a student transformation is valid (non-empty string).

**Parameters:**
- `studentTransformation` (any): The student's transformation to validate

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `grade(question, studentTransformation)`

Grades a student's transformation.

**Parameters:**
- `question` (Object): The question object containing correct transformation
- `studentTransformation` (string): The student's submitted transformation

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (number): Marks earned by the student
  - `totalMarks` (number): Total marks for the question
  - `isCorrect` (boolean): Whether the transformation is correct
  - `feedback` (string): Feedback message
  - `studentTransformation` (string): The student's transformation
  - `correctTransformation` (string): The correct transformation
  - `originalText` (string): The original text to transform
  - `explanation` (string): Explanation for the correct transformation

**Grading Logic:**
- Case-insensitive comparison
- Whitespace-normalized comparison
- Exact match required after normalization

##### `gradeMultiple(questions, studentTransformations)`

Grades multiple transformation questions at once.

**Parameters:**
- `questions` (Array<Object>): Array of question objects
- `studentTransformations` (Object): Object mapping question IDs to student transformations

**Returns:**
- `Object`: Overall grading results with the following properties:
  - `totalQuestions` (number): Number of transformation questions
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (number): Total marks earned
  - `correctCount` (number): Number of correct transformations
  - `incorrectCount` (number): Number of incorrect transformations
  - `unansweredCount` (number): Number of unanswered questions
  - `percentage` (string): Percentage score
  - `questionResults` (Array): Individual results for each question

##### `getQuestionStatistics(question, allStudentTransformations)`

Gets question statistics for analytics.

**Parameters:**
- `question` (Object): The question object
- `allStudentTransformations` (Array<string>): Array of all student transformations for this question

**Returns:**
- `Object`: Statistics with the following properties:
  - `questionId` (number): The question ID
  - `totalResponses` (number): Total number of responses
  - `correctCount` (number): Number of correct transformations
  - `incorrectCount` (number): Number of incorrect transformations
  - `unansweredCount` (number): Number of unanswered
  - `averageScore` (string): Average score across all students
  - `correctPercentage` (string): Percentage of correct transformations
  - `originalText` (string): The original text
  - `correctTransformation` (string): The correct transformation
  - `commonErrors` (Object): Top 5 common incorrect transformations with frequency counts

## Testing

Each handler has a comprehensive test suite. Run tests with:

```bash
npm test -- MultipleChoiceHandler.test.js
npm test -- TrueFalseHandler.test.js
npm test -- MultipleTrueFalseHandler.test.js
npm test -- MatchingHandler.test.js
npm test -- NumericHandler.test.js
npm test -- FillBlankHandler.test.js
npm test -- ShortAnswerHandler.test.js
npm test -- EssayHandler.test.js
npm test -- TransformationHandler.test.js
```

## Handler Summary

All 9 question type handlers have been implemented:

1. ✅ **MultipleChoiceHandler** - Auto-graded with case-insensitive comparison
2. ✅ **TrueFalseHandler** - Auto-graded with variation support (T/F, true/false, 1/0, yes/no)
3. ✅ **MultipleTrueFalseHandler** - Auto-graded with partial credit support
4. ✅ **MatchingHandler** - Auto-graded with partial credit support
5. ✅ **NumericHandler** - Auto-graded with unit validation and acceptable range support
6. ✅ **FillBlankHandler** - Auto-graded with partial credit support
7. ✅ **ShortAnswerHandler** - Manual grading required (provides model answer and key points)
8. ✅ **EssayHandler** - Manual grading required (provides model answer and rubric)
9. ✅ **TransformationHandler** - Auto-graded with case-insensitive, whitespace-normalized comparison

Each handler follows the same pattern and interface for consistency.

Handles essay/open-ended questions with rubric-based manual grading workflow.

- **Validation**: Validates essay question structure against the essay schema
- **Grading**: Marks questions for manual grading (does NOT auto-grade, similar to ShortAnswerHandler)
- **Answer Validation**: Checks if answer is non-empty string with minimum length (default: 50 characters)
- **Rubric Support**: Provides rubric with criteria and point allocation to teachers for grading reference
- **Model Answer**: Provides model answer for teacher reference
- **Batch Grading**: Can grade multiple questions at once
- **Statistics**: Generates question performance statistics including rubric-specific analytics (after manual grading)
- **Word Count**: Tracks word count for each essay answer

#### Usage Example

```javascript
const EssayHandler = require('./handlers/EssayHandler');

const handler = new EssayHandler();

// Define an essay question
const question = {
  id: 1,
  type: 'essay',
  question: 'Discuss the impact of the Ethiopian calendar system on modern Ethiopian society, including its advantages and challenges.',
  modelAnswer: 'The Ethiopian calendar, which is approximately 7-8 years behind the Gregorian calendar, has both cultural significance and practical implications for modern Ethiopian society. It preserves cultural identity and traditions, but can create challenges in international business and communication.',
  rubric: [
    { criterion: 'Understanding of calendar system', points: 3 },
    { criterion: 'Analysis of advantages', points: 3 },
    { criterion: 'Discussion of challenges', points: 3 },
    { criterion: 'Organization and clarity', points: 2 },
    { criterion: 'Use of examples', points: 2 }
  ],
  marks: 13,
  explanation: 'A strong essay should demonstrate understanding of the Ethiopian calendar, analyze both benefits and challenges, and provide specific examples.'
};

// Validate the question
const validation = handler.validate(question);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Grade a student answer (marks for manual grading)
const studentAnswer = 'The Ethiopian calendar is a unique timekeeping system that differs from the Gregorian calendar by approximately 7-8 years. This calendar has deep cultural roots in Ethiopian society and plays a significant role in religious observances and national celebrations. One major advantage is that it preserves Ethiopian cultural identity and provides a sense of continuity with historical traditions. However, it also presents challenges in international business, where coordination with the Gregorian calendar is necessary for scheduling and communication.';

const result = handler.grade(question, studentAnswer);
console.log('Earned marks:', result.earnedMarks); // null - requires manual grading
console.log('Requires manual grading:', result.requiresManualGrading); // true
console.log('Is answered:', result.isAnswered); // true
console.log('Word count:', result.wordCount); // 89
console.log('Feedback:', result.feedback); // "Pending manual grading by teacher using rubric"
console.log('Rubric:', result.rubric); // Array of rubric criteria

// Validate answer format
const answerCheck = handler.isAnswerValid(studentAnswer);
console.log('Is valid:', answerCheck.valid); // true

// Check with custom minimum length
const shortAnswer = 'This is a short answer';
const shortCheck = handler.isAnswerValid(shortAnswer, 100);
console.log('Is valid:', shortCheck.valid); // false
console.log('Message:', shortCheck.message); // "Answer must be at least 100 characters"

// Grade multiple essay questions
const questions = [question1, question2, question3];
const studentAnswers = {
  1: 'Long essay answer for question 1...',
  2: 'Long essay answer for question 2...',
  3: 'Long essay answer for question 3...'
};
const results = handler.gradeMultiple(questions, studentAnswers);
console.log('Total questions:', results.totalQuestions);
console.log('Total marks:', results.totalMarks);
console.log('Answered count:', results.answeredCount);
console.log('Requires manual grading:', results.requiresManualGrading); // true

// Get question statistics (after manual grading)
const gradedResponses = [
  { 
    studentAnswer: 'Essay 1...', 
    earnedMarks: 11,
    rubricScores: {
      'Understanding of calendar system': 3,
      'Analysis of advantages': 2,
      'Discussion of challenges': 3,
      'Organization and clarity': 2,
      'Use of examples': 1
    }
  },
  { 
    studentAnswer: 'Essay 2...', 
    earnedMarks: 9,
    rubricScores: {
      'Understanding of calendar system': 2,
      'Analysis of advantages': 2,
      'Discussion of challenges': 2,
      'Organization and clarity': 2,
      'Use of examples': 1
    }
  }
];

const stats = handler.getQuestionStatistics(question, gradedResponses);
console.log('Average score:', stats.averageScore); // "10.00"
console.log('Average percentage:', stats.averagePercentage); // "76.92%"
console.log('Average word count:', stats.averageWordCount);
console.log('Score distribution:', stats.scoreDistribution);
console.log('Rubric stats:', stats.rubricStats);
// Rubric stats show average score per criterion

// Validate rubric structure
const rubricValidation = handler.validateRubric(question);
console.log('Rubric valid:', rubricValidation.valid); // true
console.log('Total points:', rubricValidation.totalPoints); // 13
```

#### API Reference

##### `validate(question)`

Validates an essay question structure.

**Parameters:**
- `question` (Object): The question object to validate

**Returns:**
- `Object`: `{ valid: boolean, errors: Array<string> }`

##### `isAnswerValid(studentAnswer, minLength = 50)`

Checks if a student answer is valid (non-empty string with minimum length).

**Parameters:**
- `studentAnswer` (any): The student's answer to validate
- `minLength` (number): Minimum required length in characters (default: 50)

**Returns:**
- `Object`: `{ valid: boolean, message: string }`

##### `grade(question, studentAnswer, minLength = 50)`

Grades a student's answer to an essay question.

**IMPORTANT**: This method does NOT auto-grade. It marks the question for manual grading. Teachers must review the student answer against the model answer and rubric criteria.

**Parameters:**
- `question` (Object): The question object containing model answer and rubric
- `studentAnswer` (string): The student's submitted answer
- `minLength` (number): Minimum required answer length (default: 50)

**Returns:**
- `Object`: Grading result with the following properties:
  - `success` (boolean): Whether grading was successful
  - `earnedMarks` (null): Always null (cannot auto-grade)
  - `totalMarks` (number): Total marks for the question
  - `requiresManualGrading` (boolean): Always true
  - `isAnswered` (boolean): Whether the answer meets minimum requirements
  - `feedback` (string): Feedback message
  - `studentAnswer` (string): The student's answer
  - `modelAnswer` (string): The model answer for reference
  - `rubric` (Array): Rubric criteria for grading
  - `explanation` (string): Explanation for the question
  - `wordCount` (number): Word count of the student's answer

##### `gradeMultiple(questions, studentAnswers, minLength = 50)`

Grades multiple essay questions at once.

**IMPORTANT**: This method marks all questions for manual grading. No automatic marks are assigned.

**Parameters:**
- `questions` (Array<Object>): Array of question objects
- `studentAnswers` (Object): Object mapping question IDs to student answers
- `minLength` (number): Minimum required answer length (default: 50)

**Returns:**
- `Object`: Overall grading results with the following properties:
  - `totalQuestions` (number): Number of essay questions
  - `totalMarks` (number): Total marks available
  - `earnedMarks` (null): Always null (cannot auto-grade)
  - `answeredCount` (number): Number of answered questions
  - `unansweredCount` (number): Number of unanswered questions
  - `requiresManualGrading` (boolean): Always true
  - `questionResults` (Array): Individual results for each question

##### `getQuestionStatistics(question, gradedResponses)`

Gets question statistics for analytics.

**Note**: This method analyzes manually graded results. It requires that teachers have already assigned marks to student answers using the rubric.

**Parameters:**
- `question` (Object): The question object
- `gradedResponses` (Array<Object>): Array of manually graded responses
  - Each response should have: `{ studentAnswer: string, earnedMarks: number, rubricScores: Object }`

**Returns:**
- `Object`: Statistics with the following properties:
  - `questionId` (number): The question ID
  - `totalResponses` (number): Total number of responses
  - `gradedCount` (number): Number of graded responses
  - `ungradedCount` (number): Number of ungraded responses
  - `averageScore` (string): Average score across all graded responses
  - `averagePercentage` (string): Average percentage score
  - `averageWordCount` (string): Average word count
  - `scoreDistribution` (Object): Distribution of scores (fullMarks, threeQuarters, half, quarter, zero)
  - `rubricStats` (Object): Per-criterion statistics with averageScore and averagePercentage
  - `modelAnswer` (string): The model answer
  - `rubric` (Array): The rubric criteria

##### `validateRubric(question)`

Validates rubric structure and ensures rubric points sum to question marks.

**Parameters:**
- `question` (Object): The question object with rubric

**Returns:**
- `Object`: `{ valid: boolean, message: string, totalPoints: number }`

## Testing

Each handler has a comprehensive test suite. Run tests with:

```bash
npm test -- MultipleChoiceHandler.test.js
npm test -- TrueFalseHandler.test.js
npm test -- MultipleTrueFalseHandler.test.js
npm test -- MatchingHandler.test.js
npm test -- NumericHandler.test.js
npm test -- FillBlankHandler.test.js
npm test -- ShortAnswerHandler.test.js
npm test -- EssayHandler.test.js
npm test -- TransformationHandler.test.js
```

## Handler Summary

All 9 question type handlers have been implemented:

1. ✅ **MultipleChoiceHandler** - Auto-graded with case-insensitive comparison
2. ✅ **TrueFalseHandler** - Auto-graded with variation support (T/F, true/false, 1/0, yes/no)
3. ✅ **MultipleTrueFalseHandler** - Auto-graded with partial credit support
4. ✅ **MatchingHandler** - Auto-graded with partial credit support
5. ✅ **NumericHandler** - Auto-graded with unit validation and acceptable range support
6. ✅ **FillBlankHandler** - Auto-graded with partial credit support
7. ✅ **ShortAnswerHandler** - Manual grading required (provides model answer and key points)
8. ✅ **EssayHandler** - Manual grading required (provides model answer and rubric)
9. ✅ **TransformationHandler** - Auto-graded with case-insensitive, whitespace-normalized comparison

Each handler follows the same pattern and interface for consistency.
