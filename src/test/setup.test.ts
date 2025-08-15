import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run basic assertions', () => {
    expect(true).toBe(true);
    expect(2 + 2).toBe(4);
    expect('hello').toMatch(/ello/);
  });

  it('should handle async operations', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    const start = Date.now();
    await delay(10);
    const end = Date.now();
    
    expect(end - start).toBeGreaterThanOrEqual(10);
  });

  it('should work with objects and arrays', () => {
    const user = { name: 'John', age: 30 };
    expect(user).toEqual({ name: 'John', age: 30 });
    
    const numbers = [1, 2, 3];
    expect(numbers).toHaveLength(3);
    expect(numbers).toContain(2);
  });

  it('should handle errors', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    
    expect(throwError).toThrow('Test error');
  });
});

describe('Environment Variables', () => {
  it('should access process.env', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

describe('TypeScript Features', () => {
  it('should work with types', () => {
    interface User {
      name: string;
      age: number;
    }
    
    const user: User = { name: 'Alice', age: 25 };
    expect(user.name).toBe('Alice');
    expect(user.age).toBe(25);
  });

  it('should work with generics', () => {
    function identity<T>(arg: T): T {
      return arg;
    }
    
    expect(identity('hello')).toBe('hello');
    expect(identity(42)).toBe(42);
  });
});
