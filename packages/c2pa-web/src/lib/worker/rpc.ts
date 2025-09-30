import { channel } from 'highgain';

// Define browser-to-worker RPC interface
const { createTx, rx } = channel<{
  initWorker: (module: WebAssembly.Module, settings?: string) => void;

  // Reader construction methods
  reader_fromBlob: (format: string, blob: Blob) => Promise<number>;
  reader_fromBlobFragment: (
    format: string,
    init: Blob,
    fragment: Blob
  ) => Promise<number>;

  // Reader methods
  reader_activeLabel: (readerId: number) => string | null;
  reader_manifestStore: (readerId: number) => any;
  reader_activeManifest: (readerId: number) => any;
  reader_json: (readerId: number) => string;
  reader_resourceToBuffer: (readerId: number, uri: string) => ArrayBuffer;
  reader_free: (readerId: number) => void;
}>();

export { createTx, rx };
