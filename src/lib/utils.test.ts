import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges basic strings', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('merges tailwind classes and resolves conflicts', () => {
    expect(cn('p-4 p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-red-500 hover:bg-blue-500', 'hover:bg-green-500')).toBe('bg-red-500 hover:bg-green-500');
  });

  it('handles array inputs', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
    expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
  });

  it('handles object inputs', () => {
    expect(cn({ 'class1': true, 'class2': false, 'class3': true })).toBe('class1 class3');
  });

  it('handles mixed inputs', () => {
    expect(cn('class1', { 'class2': true }, ['class3'])).toBe('class1 class2 class3');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
  });
});
