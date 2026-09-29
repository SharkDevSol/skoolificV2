import { classIdLabel } from './classId';

describe('classIdLabel', () => {
  test('converts simple positions to single letters', () => {
    expect(classIdLabel(1)).toBe('A');
    expect(classIdLabel(2)).toBe('B');
    expect(classIdLabel(3)).toBe('C');
    expect(classIdLabel(13)).toBe('M');
    expect(classIdLabel(26)).toBe('Z');
  });

  test('converts positions past Z to double letters', () => {
    expect(classIdLabel(27)).toBe('AA');
    expect(classIdLabel(28)).toBe('AB');
    expect(classIdLabel(52)).toBe('AZ');
    expect(classIdLabel(53)).toBe('BA');
    expect(classIdLabel(702)).toBe('ZZ');
    expect(classIdLabel(703)).toBe('AAA');
  });

  test('accepts numeric strings coming from the API', () => {
    expect(classIdLabel('1')).toBe('A');
    expect(classIdLabel('26')).toBe('Z');
    expect(classIdLabel(5)).toBe('E');
  });

  test('keeps empty and invalid values readable', () => {
    expect(classIdLabel(null)).toBe('');
    expect(classIdLabel(undefined)).toBe('');
    expect(classIdLabel('')).toBe('');
    expect(classIdLabel(0)).toBe('0');
    expect(classIdLabel(-3)).toBe('-3');
    expect(classIdLabel('G1A')).toBe('G1A');
  });
});
