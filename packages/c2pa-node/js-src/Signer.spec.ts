// Copyright 2024 Adobe. All rights reserved.
// This file is licensed to you under the Apache License,
// Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
// or the MIT license (http://opensource.org/licenses/MIT),
// at your option.

// Unless required by applicable law or agreed to in writing,
// this software is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or
// implied. See the LICENSE-MIT and LICENSE-APACHE files for the
// specific language governing permissions and limitations under
// each license.

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CallbackSigner } from './index';
import { JsCallbackSignerConfig, SigningAlg } from 'index.node';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';

//const tempDir = join(__dirname, 'tmp');

class TestSigner {
  private privateKey: crypto.KeyObject;

  constructor(privateKey: Buffer) {
    this.privateKey = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
    });
  }

  sign = async (bytes: Buffer): Promise<Buffer> => {
    const sign = crypto.createSign('SHA256');
    sign.update(bytes);
    sign.end();
    const signature = sign.sign(this.privateKey);
    return signature;
  };
}

describe('TestSigner', () => {
  it('should sign data', async () => {
    const signer = new TestSigner(
      await fs.readFile('./tests/fixtures/certs/es256.pem'),
    );
    const bytes = Buffer.from('Hello, World!');
    const signature = await signer.sign(bytes);
    expect(signature.length).toBeGreaterThan(0);
  });
});

describe('CallbackSigner', () => {
  const config: JsCallbackSignerConfig = {
    alg: 'es256' as SigningAlg,
    certs: [fs.readFileSync('./tests/fixtures/certs/es256.pub')],
    reserveSize: 10000,
    tsaUrl: 'https://timestamp.digicert.com',
    tsaHeaders: [['Content-Type', 'application/json']],
    tsaBody: Buffer.from('{"test": "body"}'),
  };

  it('should create a new instance', () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer).toBeDefined();
  });

  it('should sign data', async () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    const data = Buffer.from('test data');
    const signature = await signer.sign(data);
    expect(signature).toBeDefined();
  });

  it('should get algorithm', () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    const alg = signer.alg();
    expect(alg).toBe('es256');
  });

  it('should return certificates', () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    const certs = signer.certs();
    expect(Array.isArray(certs)).toBe(true);
    expect(certs.length).toBeGreaterThan(0);
  });

  it('should return reserve size', () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer.reserveSize()).toBe(10000);
  });

  it('should return time authority URL when provided', () => {
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer.timeAuthorityUrl()).toBe('https://timestamp.digicert.com');
  });

  it('should return undefined for time authority URL when not provided', async () => {
    const config: JsCallbackSignerConfig = {
      alg: 'es256' as SigningAlg,
      certs: [await fs.readFile('./tests/fixtures/certs/es256.pub')],
      reserveSize: 10000,
      tsaUrl: undefined,
      tsaHeaders: undefined,
      tsaBody: undefined,
    };
    const signer = CallbackSigner.newSigner(config, async (data) => data);
    expect(signer.timeAuthorityUrl()).toBeUndefined();
  });
});
