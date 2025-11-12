/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export async function getBlobForAsset(src: string): Promise<Blob> {
  const response = await fetch(src);
  const blob = await response.blob();

  return blob;
}
