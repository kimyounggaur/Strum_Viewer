import { open } from 'node:fs/promises';

const PNG_SIGNATURE = '89504e470d0a1a0a';

/** PNG 헤더(IHDR)에서 폭·높이를 읽는다. 파일 전체를 읽지 않고 앞 24바이트만 읽는다. */
export async function readPngSize(filePath) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(24);
    await handle.read(buffer, 0, 24, 0);
    return parsePngHeader(buffer, filePath);
  } finally {
    await handle.close();
  }
}

export function parsePngHeader(buffer, label = 'buffer') {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error(`PNG 파일이 아닙니다: ${label}`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** 파일명 끝쪽의 `Ex01`, `EX 12`, `Ex-3` 등에서 예제 번호를 뽑는다(마지막 일치 사용). */
export function extractExerciseNo(fileName) {
  const matches = [...fileName.matchAll(/ex\s*-?\s*0*(\d+)/gi)];
  const last = matches.at(-1);
  if (!last) {
    throw new Error(`파일명에서 예제 번호(Ex01 형식)를 찾을 수 없습니다: "${fileName}"`);
  }
  return Number(last[1]);
}
