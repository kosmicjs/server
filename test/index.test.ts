import {test, describe} from 'node:test';
import assert from 'node:assert';

void describe('helloWorld', async () => {
  await test('helloWorld is a function', (t) => {
    // just ignore the type error for this test
  });

  await test('helloWorld logs a string', (t) => {
    const mockLog = t.mock.method(globalThis.console, 'log');
    assert.equal(mockLog.mock.calls.length, 1);
    assert.equal(mockLog.mock.calls[0]?.arguments.length, 1);
    assert.equal(typeof mockLog.mock.calls[0]?.arguments[0], 'string');
    t.mock.reset();
  });
});
