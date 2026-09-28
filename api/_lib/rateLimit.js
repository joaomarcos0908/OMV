const buckets = new Map();

// janela em ms, max requisições por IP
function checkRateLimit(req, { windowMs = 60000, max = 20 } = {}) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  const key = ip + ':' + (req.url || '');
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    return false;
  }
  // limpeza periódica para não vazar memória
  if (buckets.size > 5000 && Math.random() < 0.01) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
  return true;
}

module.exports = { checkRateLimit };
