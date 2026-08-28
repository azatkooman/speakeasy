import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * This project shipped for months with eleven dependencies declared as
 * "latest", left over from the AI Studio scaffold. That is a live hazard for an
 * app people rely on to speak: a fresh `npm install` could pull a new major of
 * React or of a Capacitor plugin, and the first sign of it would be a build
 * that no longer matches the one that was tested. The lockfile hid the problem
 * rather than solving it.
 *
 * These tests keep the declarations honest, because the mistake is silent and
 * easy to reintroduce.
 */

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf8'),
) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines?: { node?: string };
  scripts: Record<string, string>;
};

const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

describe('dependency declarations', () => {
  it('pins every dependency to a version range, never a moving tag', () => {
    const moving = Object.entries(allDeps).filter(([, range]) =>
      ['latest', '*', 'next', 'canary', ''].includes(range.trim()),
    );
    expect(moving, 'a moving tag resolves differently on every clean install').toEqual([]);
  });

  it('declares no dependency from a git or http source', () => {
    // Those bypass the registry, so `npm ci` reproducibility depends on a
    // third party not moving a branch.
    const remote = Object.entries(allDeps).filter(([, range]) =>
      /^(git|github:|https?:|file:)/.test(range.trim()),
    );
    expect(remote).toEqual([]);
  });

  it('starts every range with a digit, ^ or ~', () => {
    const odd = Object.entries(allDeps).filter(
      ([, range]) => !/^[\^~]?\d+\.\d+\.\d+/.test(range.trim()),
    );
    expect(odd).toEqual([]);
  });

  it('keeps the Capacitor packages on one major', () => {
    // A plugin on a different major than @capacitor/core fails at runtime on
    // the device, not at build time on this machine.
    const majors = new Set(
      Object.entries(allDeps)
        .filter(([name]) => name.startsWith('@capacitor/'))
        .map(([, range]) => range.replace(/^[\^~]/, '').split('.')[0]),
    );
    expect(majors.size, `found Capacitor majors: ${[...majors].join(', ')}`).toBe(1);
  });

  it('states a Node floor, so CI and a contributor agree on one', () => {
    expect(pkg.engines?.node).toBeTruthy();
  });

  it('type-checks as part of build, so a type error cannot reach production', () => {
    // Vite transpiles without consulting the type checker.
    expect(pkg.scripts.build).toMatch(/tsc --noEmit/);
  });
});
