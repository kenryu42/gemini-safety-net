import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('BeforeTool observes all tools without a matcher', async () => {
  const config = JSON.parse(
    await readFile(new URL('../hooks/hooks.json', import.meta.url), 'utf8'),
  );
  const beforeTool = config.hooks.BeforeTool;

  assert.equal(Array.isArray(beforeTool), true);
  assert.equal(beforeTool.length, 1);
  assert.equal(Object.hasOwn(beforeTool[0], 'matcher'), false);
});
