export function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  const getFractionalBits = (n: number) => {
    return ((n - Math.floor(n)) * maxWord) | 0;
  };

  let candidate = 2;
  while (primeCounter < 64) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = getFractionalBits(mathPow(candidate, 1 / 2));
      }
      k[primeCounter] = getFractionalBits(mathPow(candidate, 1 / 3));
      primeCounter++;
    }
    candidate++;
  }

  const asciiBytes: number[] = [];
  for (i = 0; i < ascii[lengthProperty]; i++) {
    const code = ascii.charCodeAt(i);
    if (code < 128) {
      asciiBytes.push(code);
    } else if (code < 2048) {
      asciiBytes.push((code >> 6) | 192);
      asciiBytes.push((code & 63) | 128);
    } else {
      asciiBytes.push((code >> 12) | 224);
      asciiBytes.push(((code >> 6) & 63) | 128);
      asciiBytes.push((code & 63) | 128);
    }
  }

  const byteLength = asciiBytes[lengthProperty];
  asciiBytes.push(0x80);
  
  while ((asciiBytes[lengthProperty] + 8) % 64 !== 0) {
    asciiBytes.push(0);
  }

  const bitsLength = byteLength * 8;
  const bitsLengthHex = bitsLength.toString(16).padStart(16, '0');
  for (i = 0; i < 8; i++) {
    asciiBytes.push(parseInt(bitsLengthHex.substring(i * 2, i * 2 + 2), 16));
  }

  const words: number[] = [];
  for (i = 0; i < asciiBytes[lengthProperty]; i += 4) {
    words.push(
      (asciiBytes[i] << 24) |
      (asciiBytes[i + 1] << 16) |
      (asciiBytes[i + 2] << 8) |
      asciiBytes[i + 3]
    );
  }

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    for (j = 0; j < 64; j++) {
      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  let finalHash = '';
  for (i = 0; i < 8; i++) {
    finalHash += (hash[i] >>> 0).toString(16).padStart(8, '0');
  }
  return finalHash;
}
