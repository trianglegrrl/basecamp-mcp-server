import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

let cachedRoot: string | null = null;

export function findProjectRoot(): string {
  if (cachedRoot) return cachedRoot;
  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) {
      cachedRoot = dir;
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error('Could not locate project root: no package.json found in any ancestor directory');
}

export function projectPath(...segments: string[]): string {
  return join(findProjectRoot(), ...segments);
}
