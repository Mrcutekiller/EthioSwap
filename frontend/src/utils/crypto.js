import { ethers } from 'ethers';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const base58Encode = (buffer) => {
  let digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    let carry = buffer[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let string = '';
  for (let k = 0; k < buffer.length && buffer[k] === 0; k++) {
    string += '1';
  }
  for (let q = digits.length - 1; q >= 0; q--) {
    string += BASE58_ALPHABET[digits[q]];
  }
  return string;
};

export const getTronAddress = (ethAddr) => {
  if (!ethAddr || !ethAddr.startsWith('0x') || ethAddr.length !== 42) return '';
  try {
    const rawAddressHex = '0x41' + ethAddr.substring(2);
    const hash1 = ethers.sha256(rawAddressHex);
    const hash2 = ethers.sha256(hash1);
    const checksum = hash2.substring(2, 10);
    const fullAddressHex = rawAddressHex + checksum;
    const bytes = ethers.getBytes(fullAddressHex);
    return base58Encode(bytes);
  } catch (e) {
    console.error(e);
    return 'T' + ethAddr.replace('0x', '').substring(0, 33);
  }
};

export const getAptosAddress = (ethAddr) => {
  if (!ethAddr || !ethAddr.startsWith('0x')) return '';
  try {
    const hash = ethers.sha256(ethers.toUtf8Bytes(ethAddr.toLowerCase()));
    return hash;
  } catch (e) {
    console.error(e);
    return ethAddr.padEnd(66, '0');
  }
};

export const getNetworkAddress = (networkId, ethAddr, systemSettings = null) => {
  // Check system settings for custom admin configured addresses
  const master = systemSettings?.master_wallet_address || systemSettings?.masterWalletAddress || '';
  try {
    if (master.trim().startsWith('{')) {
      const parsed = JSON.parse(master);
      const netKey = networkId?.toLowerCase()?.replace('-', '');
      if (parsed && parsed[netKey]) {
        return parsed[netKey];
      }
    } else if (master && ['erc20', 'bep20', 'erc-20', 'bsc', 'ethereum'].includes(networkId?.toLowerCase()?.replace('-', ''))) {
      // Legacy single address
      return master;
    }
  } catch (e) {}

  // Otherwise, fallback to user-specific derived valid address
  if (!ethAddr) return '';
  switch (networkId?.toLowerCase()) {
    case 'aptos':
      return getAptosAddress(ethAddr);
    case 'trc20':
    case 'trc-20':
    case 'tron':
      return getTronAddress(ethAddr);
    case 'bep20':
    case 'bsc':
    case 'erc20':
    case 'erc-20':
    case 'ethereum':
    default:
      return ethAddr;
  }
};
