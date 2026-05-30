/**
 * Test Suite for Question Grouping Utility
 * 
 * Tests the question grouping functions for organizing exam questions by type.
 */

const {
  groupByType,
  groupByTypeAsSections,
  groupByTypeWithOrder,
  getTypeCounts,
  flattenGroupedQuestions,
  getTypeLabel
} = require('./questionGrouping');

describe('Question Grouping Utility', () => {
  const sampleQuestions = [
    { id: 1, type: 'multiple_choice', question: 'Q1?', marks: 2 },
    { id: 2, type: 'true_false', question: 'Q2?', marks: 1 },
    { id: 3, type: 'multiple_choice', question: 'Q3?', marks: 2 },
    { id: 4, type: 'essay', question: 'Q4?', marks: 10 },
    { id: 5, type: 'true_false', question: 'Q5?', marks: 1 },
    { id: 6, type: 'matching', question: 'Q6?', marks: 3 }
  ];

  describe('groupByType()', () => {
    test('should group questions by type', () => {
      const grouped = groupByType(sampleQuestions);

      expect(grouped).toHaveProperty('multiple_choice');
      expect(grouped).toHaveProperty('true_false');
      expect(grouped).toHaveProperty('essay');
      expect(grouped).toHaveProperty('matching');
      
      expect(grouped.multiple_choice).toHaveLength(2);
      expect(grouped.true_false).toHaveLength(2);
      expect(grouped.essay).toHaveLength(1);
      expect(grouped.matching).toHaveLength(1);
    });

    test('should maintain order within each type', () => {
      const grouped = groupByType(sampleQuestions);

      expect(grouped.multiple_choice[0].id).toBe(1);
      expect(grouped.multiple_choice[1].id).toBe(3);
      expect(grouped.true_false[0].id).toBe(2);
      expect(grouped.true_false[1].id).toBe(5);
    });

    test('should handle empty array', () => {
      const grouped = groupByType([]);

      expect(grouped).toEqual({});
    });

    test('should throw error for non-array input', () => {
      expect(() => groupByType('not an array')).toThrow(TypeError);
      expect(() => groupByType(null)).toThrow(TypeError);
      expect(() => groupByType(123)).toThrow(TypeError);
    });

    test('should skip invalid questions', () => {
      const questions = [
        { id: 1, type: 'multiple_choice', question: 'Q1?' },
        null,
        undefined,
        'invalid',
        { id: 2, type: 'true_false', question: 'Q2?' }
      ];

      const grouped = groupByType(questions);

      expect(grouped.multiple_choice).toHaveLength(1);
      expect(grouped.true_false).toHaveLength(1);
    });

    test('should skip questions without type', () => {
      const questions = [
        { id: 1, type: 'multiple_choice', question: 'Q1?' },
        { id: 2, question: 'Q2?' }, // No type
        { id: 3, type: 'true_false', question: 'Q3?' }
      ];

      const grouped = groupByType(questions);

      expect(grouped.multiple_choice).toHaveLength(1);
      expect(grouped.true_false).toHaveLength(1);
      expect(Object.keys(grouped)).toHaveLength(2);
    });

    test('should handle single question type', () => {
      const questions = [
        { id: 1, type: 'multiple_choice', question: 'Q1?' },
        { id: 2, type: 'multiple_choice', question: 'Q2?' }
      ];

      const grouped = groupByType(questions);

      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped.multiple_choice).toHaveLength(2);
    });
  });

  describe('groupByTypeAsSections()', () => {
    test('should return array of section objects', () => {
      const sections = groupByTypeAsSections(sampleQuestions);

      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
      
      sections.forEach(section => {
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('questions');
        expect(section).toHaveProperty('count');
        expect(Array.isArray(section.questions)).toBe(true);
      });
    });

    test('should include correct counts', () => {
      const sections = groupByTypeAsSections(sampleQuestions);

      const mcSection = sections.find(s => s.type === 'multiple_choice');
      expect(mcSection.count).toBe(2);
      expect(mcSection.questions).toHaveLength(2);

      const tfSection = sections.find(s => s.type === 'true_false');
      expect(tfSection.count).toBe(2);
      expect(tfSection.questions).toHaveLength(2);
    });

    test('should handle empty array', () => {
      const sections = groupByTypeAsSections([]);

      expect(sections).toEqual([]);
    });
  });

  describe('groupByTypeWithOrder()', () => {
    test('should return sections in specified order', () => {
      const order = ['essay', 'multiple_choice', 'true_false', 'matching'];
      const sections = groupByTypeWithOrder(sampleQuestions, order);

      expect(sections[0].type).toBe('essay');
      expect(sections[1].type).toBe('multiple_choice');
      expect(sections[2].type).toBe('true_false');
      expect(sections[3].type).toBe('matching');
    });

    test('should append types not in order at the end', () => {
      const order = ['multiple_choice', 'true_false'];
      const sections = groupByTypeWithOrder(sampleQuestions, order);

      expect(sections[0].type).toBe('multiple_choice');
      expect(sections[1].type).toBe('true_false');
      // essay and matching should be at the end
      expect(sections.length).toBe(4);
    });

    test('should handle empty order array', () => {
      const sections = groupByTypeWithOrder(sampleQuestions, []);

      // All types should be included
      expect(sections.length).toBe(4);
    });

    test('should throw error for non-array order', () => {
      expect(() => groupByTypeWithOrder(sampleQuestions, 'not an array')).toThrow(TypeError);
      expect(() => groupByTypeWithOrder(sampleQuestions, null)).toThrow(TypeError);
    });

    test('should skip types in order that don\'t exist in questions', () => {
      const order = ['multiple_choice', 'numeric', 'true_false'];
      const sections = groupByTypeWithOrder(sampleQuestions, order);

      // numeric doesn't exist in questions, so it should be skipped
      expect(sections.find(s => s.type === 'numeric')).toBeUndefined();
    });

    test('should include counts in sections', () => {
      const order = ['multiple_choice', 'true_false'];
      const sections = groupByTypeWithOrder(sampleQuestions, order);

      expect(sections[0].count).toBe(2);
      expect(sections[1].count).toBe(2);
    });
  });

  describe('getTypeCounts()', () => {
    test('should return correct counts for each type', () => {
      const counts = getTypeCounts(sampleQuestions);

      expect(counts.multiple_choice).toBe(2);
      expect(counts.true_false).toBe(2);
      expect(counts.essay).toBe(1);
      expect(counts.matching).toBe(1);
    });

    test('should handle empty array', () => {
      const counts = getTypeCounts([]);

      expect(counts).toEqual({});
    });

    test('should throw error for non-array input', () => {
      expect(() => getTypeCounts('not an array')).toThrow(TypeError);
      expect(() => getTypeCounts(null)).toThrow(TypeError);
    });

    test('should skip invalid questions', () => {
      const questions = [
        { id: 1, type: 'multiple_choice', question: 'Q1?' },
        null,
        { id: 2, type: 'multiple_choice', question: 'Q2?' },
        undefined
      ];

      const counts = getTypeCounts(questions);

      expect(counts.multiple_choice).toBe(2);
    });

    test('should skip questions without type', () => {
      const questions = [
        { id: 1, type: 'multiple_choice', question: 'Q1?' },
        { id: 2, question: 'Q2?' }, // No type
        { id: 3, type: 'multiple_choice', question: 'Q3?' }
      ];

      const counts = getTypeCounts(questions);

      expect(counts.multiple_choice).toBe(2);
      expect(Object.keys(counts)).toHaveLength(1);
    });
  });

  describe('flattenGroupedQuestions()', () => {
    test('should flatten grouped questions to array', () => {
      const grouped = {
        multiple_choice: [
          { id: 1, type: 'multiple_choice', question: 'Q1?' },
          { id: 3, type: 'multiple_choice', question: 'Q3?' }
        ],
        true_false: [
          { id: 2, type: 'true_false', question: 'Q2?' }
        ]
      };

      const flattened = flattenGroupedQuestions(grouped);

      expect(Array.isArray(flattened)).toBe(true);
      expect(flattened).toHaveLength(3);
      expect(flattened.find(q => q.id === 1)).toBeDefined();
      expect(flattened.find(q => q.id === 2)).toBeDefined();
      expect(flattened.find(q => q.id === 3)).toBeDefined();
    });

    test('should handle empty grouped object', () => {
      const flattened = flattenGroupedQuestions({});

      expect(flattened).toEqual([]);
    });

    test('should throw error for non-object input', () => {
      expect(() => flattenGroupedQuestions('not an object')).toThrow(TypeError);
      expect(() => flattenGroupedQuestions(null)).toThrow(TypeError);
      expect(() => flattenGroupedQuestions(123)).toThrow(TypeError);
    });

    test('should skip non-array values', () => {
      const grouped = {
        multiple_choice: [
          { id: 1, type: 'multiple_choice', question: 'Q1?' }
        ],
        invalid: 'not an array',
        true_false: [
          { id: 2, type: 'true_false', question: 'Q2?' }
        ]
      };

      const flattened = flattenGroupedQuestions(grouped);

      expect(flattened).toHaveLength(2);
    });

    test('should maintain order of groups', () => {
      const grouped = groupByType(sampleQuestions);
      const flattened = flattenGroupedQuestions(grouped);

      expect(flattened).toHaveLength(sampleQuestions.length);
    });
  });

  describe('getTypeLabel()', () => {
    test('should return correct labels for known types', () => {
      expect(getTypeLabel('multiple_choice')).toBe('Multiple Choice');
      expect(getTypeLabel('true_false')).toBe('True/False');
      expect(getTypeLabel('multiple_true_false')).toBe('Multiple True/False');
      expect(getTypeLabel('matching')).toBe('Matching');
      expect(getTypeLabel('numeric')).toBe('Numeric Response');
      expect(getTypeLabel('fill_blank')).toBe('Fill in the Blank');
      expect(getTypeLabel('short_answer')).toBe('Short Answer');
      expect(getTypeLabel('essay')).toBe('Essay');
      expect(getTypeLabel('transformation')).toBe('Transformation/Error Correction');
    });

    test('should return type itself for unknown types', () => {
      expect(getTypeLabel('unknown_type')).toBe('unknown_type');
      expect(getTypeLabel('custom')).toBe('custom');
    });

    test('should handle empty string', () => {
      expect(getTypeLabel('')).toBe('');
    });
  });

  describe('Integration tests', () => {
    test('should group, flatten, and regroup correctly', () => {
      const grouped1 = groupByType(sampleQuestions);
      const flattened = flattenGroupedQuestions(grouped1);
      const grouped2 = groupByType(flattened);

      expect(Object.keys(grouped1)).toEqual(Object.keys(grouped2));
      Object.keys(grouped1).forEach(type => {
        expect(grouped1[type].length).toBe(grouped2[type].length);
      });
    });

    test('should work with all grouping functions together', () => {
      const grouped = groupByType(sampleQuestions);
      const sections = groupByTypeAsSections(sampleQuestions);
      const counts = getTypeCounts(sampleQuestions);

      expect(Object.keys(grouped).length).toBe(sections.length);
      expect(Object.keys(grouped).length).toBe(Object.keys(counts).length);

      sections.forEach(section => {
        expect(section.count).toBe(counts[section.type]);
        expect(section.questions.length).toBe(grouped[section.type].length);
      });
    });
  });
});
