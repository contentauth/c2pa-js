/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export type SigningAlg =
  | 'es256'
  | 'es384'
  | 'es512'
  | 'ps256'
  | 'ps384'
  | 'ps512'
  | 'ed25519';

export type SignerCertificate =
  | string
  | ArrayBuffer
  | ArrayBufferView;

export type SerializedSignerCertificate =
  | string
  | Uint8Array<ArrayBuffer>;

export interface Signer {
  sign: (
    data: Uint8Array<ArrayBuffer>,
    reserveSize: number
  ) => Promise<Uint8Array<ArrayBuffer>>;
  reserveSize: () => Promise<number>;
  alg: SigningAlg;
  certs?: () => Promise<SignerCertificate[]>;
  directCoseHandling?: boolean;
  timeAuthorityUrl?: string;
  timeAuthorityHeaders?: Array<[string, string]>;
  timeAuthorityBody?: string | ArrayBuffer | ArrayBufferView;
}

export interface SerializableSigningPayload {
  reserveSize: number;
  alg: SigningAlg;
  certs?: SerializedSignerCertificate[];
  directCoseHandling?: boolean;
  tsaUrl?: string;
  tsaHeaders?: Array<[string, string]>;
  tsaBody?: Uint8Array<ArrayBuffer> | string;
}

export async function getSerializablePayload(
  signer: Signer
): Promise<SerializableSigningPayload> {
  const { alg } = signer;
  const reserveSize = await signer.reserveSize();
  const certificates = signer.certs
    ? await signer.certs()
    : undefined;
  const directCoseHandling = signer.directCoseHandling
    ? signer.directCoseHandling
    : false;
  const tsaUrl = signer.timeAuthorityUrl
    ? signer.timeAuthorityUrl
    : undefined;
  const tsaHeaders = signer.timeAuthorityHeaders
    ? signer.timeAuthorityHeaders
    : undefined;
  const tsaBodyRaw = signer.timeAuthorityBody
    ? signer.timeAuthorityBody
    : undefined;

  const normalizedCertificates = certificates?.map((certificate, index) => {
    if (typeof certificate === 'string') {
      return certificate;
    }

    if (certificate instanceof ArrayBuffer) {
      return new Uint8Array(certificate.slice(0));
    }

    if (ArrayBuffer.isView(certificate)) {
      const view = certificate as ArrayBufferView;
      // Only accept ArrayBuffer, not SharedArrayBuffer
      if (!(view.buffer instanceof ArrayBuffer)) {
        throw new TypeError(
          `Unsupported certificate buffer type at index ${index}. Only ArrayBuffer is supported.`
        );
      }
      return new Uint8Array(
        view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
      );
    }

    throw new TypeError(
      `Unsupported certificate type at index ${index}. Certificates must be provided as PEM strings or ArrayBuffer views.`
    );
  });

  let normalizedTsaBody: Uint8Array<ArrayBuffer> | string | undefined;
  if (tsaBodyRaw !== undefined) {
    if (typeof tsaBodyRaw === 'string') {
      normalizedTsaBody = tsaBodyRaw;
    } else if (tsaBodyRaw instanceof ArrayBuffer) {
      normalizedTsaBody = new Uint8Array(tsaBodyRaw.slice(0));
    } else if (ArrayBuffer.isView(tsaBodyRaw)) {
      const view = tsaBodyRaw as ArrayBufferView;
      if (!(view.buffer instanceof ArrayBuffer)) {
        throw new TypeError('Unsupported TSA body buffer type. Only ArrayBuffer is supported.');
      }
      normalizedTsaBody = new Uint8Array(
        view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
      );
    } else {
      throw new TypeError('Unsupported TSA body type. Expected string or ArrayBuffer view.');
    }
  }

  return {
    reserveSize,
    alg,
    certs: normalizedCertificates,
    directCoseHandling,
    tsaUrl,
    tsaHeaders,
    tsaBody: normalizedTsaBody,
  };
}
