/**
 * Question Grouping Utility
 * 
 * This utility provides functions to group questions by type for better exam organization.
 * Questions are grouped together by their type (all MCQ together, all T/F together, etc.)
 * while maintaining the order within each type.
 * 
 * This is useful for:
 * - Organizing exam questions in a logical structure
 * - Displaying questions in sections by type
 * - Generating exam papers with grouped question types
 */

/**
 * Group questions by their type
 * 
 * Takes an array of questions and groups them by type, maintaining the order
 * within each type. Returns an object with question types as keys and arrays
 * of questions as values.
 * 
 * @param {Array<Object>} questions - Array of question objects
 * @returns {Object} - Object with question types as keys and arrays of questions as values
 * 
 * @example
 * const questions = [
 *   { id: 1, type: 'multiple_choice', question: 'Q1?' },
 *   { id: 2, type: 'true_false', question: 'Q2?' },
 *   { id: 3, type: 'multiple_choice', question: 'Q3?' }
 * ];
 * 
 * const grouped = groupByType(questions);
 * // Returns:
 * // {
 * //   multiple_choice: [{ id: 1, ... }, { id: 3, ... }],
 * //   true_false: [{ id: 2, ... }]
 * // }
 */
function groupByType(questions) {
  if (!Array.isArray(questions)) {
    throw new TypeError('Questions must be an array');
  }

  const grouped = {};

  questions.forEach(question => {
    if (!question || typeof question !== 'object') {
      return; // Skip invalid questions
    }

    const type = question.type;
    if (!type) {
      return; // Skip questions without a type
    }

    if (!grouped[type]) {
      grouped[type] = [];
    }

    grouped[type].push(question);
  });

  return grouped;
}

/**
 * Group questions by type and return as an array of sections
 * 
 * Similar to groupByType but returns an array of section objects instead of
 * a plain object. Each section has a type and an array of questions.
 * 
 * @param {Array<Object>} questions - Array of question objects
 * @returns {Array<Object>} - Array of section objects with type and questions
 * 
 * @example
 * const questions = [
 *   { id: 1, type: 'multiple_choice', question: 'Q1?' },
 *   { id: 2, type: 'true_false', question: 'Q2?' }
 * ];
 * 
 * const sections = groupByTypeAsSections(questions);
 * // Returns:
 * // [
 * //   { type: 'multiple_choice', questions: [{ id: 1, ... }] },
 * //   { type: 'true_false', questions: [{ id: 2, ... }] }
 * // ]
 */
function groupByTypeAsSections(questions) {
  const grouped = groupByType(questions);
  
  return Object.entries(grouped).map(([type, questions]) => ({
    type,
    questions,
    count: questions.length
  }));
}

/**
 * Group questions by type with custom type order
 * 
 * Groups questions by type and returns them in a specified order.
 * Types not in the order array will be appended at the end.
 * 
 * @param {Array<Object>} questions - Array of question objects
 * @param {Array<string>} typeOrder - Desired order of question types
 * @returns {Array<Object>} - Array of section objects in specified order
 * 
 * @example
 * const questions = [
 *   { id: 1, type: 'essay', question: 'Q1?' },
 *   { id: 2, type: 'multiple_choice', question: 'Q2?' },
 *   { id: 3, type: 'true_false', question: 'Q3?' }
 * ];
 * 
 * const order = ['multiple_choice', 'true_false', 'essay'];
 * const sections = groupByTypeWithOrder(questions, order);
 * // Returns sections in the specified order
 */
function groupByTypeWithOrder(questions, typeOrder) {
  if (!Array.isArray(typeOrder)) {
    throw new TypeError('Type order must be an array');
  }

  const grouped = groupByType(questions);
  const sections = [];

  // Add sections in the specified order
  typeOrder.forEach(type => {
    if (grouped[type]) {
      sections.push({
        type,
        questions: grouped[type],
        count: grouped[type].length
      });
    }
  });

  // Add remaining types not in the order
  Object.entries(grouped).forEach(([type, questions]) => {
    if (!typeOrder.includes(type)) {
      sections.push({
        type,
        questions,
        count: questions.length
      });
    }
  });

  return sections;
}

/**
 * Get question type counts
 * 
 * Returns an object with question types as keys and counts as values.
 * 
 * @param {Array<Object>} questions - Array of question objects
 * @returns {Object} - Object with question types as keys and counts as values
 * 
 * @example
 * const questions = [
 *   { id: 1, type: 'multiple_choice', question: 'Q1?' },
 *   { id: 2, type: 'multiple_choice', question: 'Q2?' },
 *   { id: 3, type: 'true_false', question: 'Q3?' }
 * ];
 * 
 * const counts = getTypeCounts(questions);
 * // Returns: { multiple_choice: 2, true_false: 1 }
 */
function getTypeCounts(questions) {
  if (!Array.isArray(questions)) {
    throw new TypeError('Questions must be an array');
  }

  const counts = {};

  questions.forEach(question => {
    if (!question || typeof question !== 'object') {
      return;
    }

    const type = question.type;
    if (!type) {
      return;
    }

    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}

/**
 * Flatten grouped questions back to a single array
 * 
 * Takes grouped questions and flattens them back to a single array,
 * maintaining the grouping order.
 * 
 * @param {Object} groupedQuestions - Object with question types as keys
 * @returns {Array<Object>} - Flattened array of questions
 * 
 * @example
 * const grouped = {
 *   multiple_choice: [{ id: 1, ... }, { id: 3, ... }],
 *   true_false: [{ id: 2, ... }]
 * };
 * 
 * const flattened = flattenGroupedQuestions(grouped);
 * // Returns: [{ id: 1, ... }, { id: 3, ... }, { id: 2, ... }]
 */
function flattenGroupedQuestions(groupedQuestions) {
  if (!groupedQuestions || typeof groupedQuestions !== 'object') {
    throw new TypeError('Grouped questions must be an object');
  }

  const flattened = [];

  Object.values(groupedQuestions).forEach(questions => {
    if (Array.isArray(questions)) {
      flattened.push(...questions);
    }
  });

  return flattened;
}

/**
 * Get question type labels
 * 
 * Returns human-readable labels for question types.
 * 
 * @param {string} type - Question type identifier
 * @returns {string} - Human-readable label
 */
function getTypeLabel(type) {
  const labels = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    multiple_true_false: 'Multiple True/False',
    matching: 'Matching',
    numeric: 'Numeric Response',
    fill_blank: 'Fill in the Blank',
    short_answer: 'Short Answer',
    essay: 'Essay',
    transformation: 'Transformation/Error Correction'
  };

  return labels[type] || type;
}

module.exports = {
  groupByType,
  groupByTypeAsSections,
  groupByTypeWithOrder,
  getTypeCounts,
  flattenGroupedQuestions,
  getTypeLabel
};
