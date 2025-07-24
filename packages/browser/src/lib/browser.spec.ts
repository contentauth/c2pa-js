import { foobar } from './browser.js';

describe('browser', () => {
  it('should work', async () => {
    expect(await foobar()).toEqual('foobarfoobar');
  });
});
