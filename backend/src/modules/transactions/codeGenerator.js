const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0/I/1
const CODE_LENGTH = 8;
const PREFIX = 'TR-';

export function generateCode() {
  let code = PREFIX;
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Generate a unique code — retry if collision (extremely rare)
 */
export async function generateUniqueCode(prisma) {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateCode();
    const existing = await prisma.transaction.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique transaction code after 10 attempts');
}
