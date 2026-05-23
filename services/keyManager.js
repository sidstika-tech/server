// ═══════════════════════════════════════════════════════════════════
//  services/keyManager.js
//  API Key Pool — automatic rotation + fallback for all providers
//
//  HOW TO ADD KEYS IN VERCEL:
//    OPENROUTER_API_KEYS = sk-or-key1,sk-or-key2,sk-or-key3,sk-or-key4,sk-or-key5
//    GEMINI_API_KEYS     = AIzaSy-key1,AIzaSy-key2,AIzaSy-key3,AIzaSy-key4,AIzaSy-key5
//
//  If you only have 1 key, the old single-key vars still work as fallback:
//    OPENROUTER_API_KEY  = sk-or-key1
//    GEMINI_API_KEY      = AIzaSy-key1
// ═══════════════════════════════════════════════════════════════════

// ── Build key pools from env vars ──────────────────────────────────
// Supports both "KEYS" (plural, comma-separated) and "KEY" (singular legacy)
function loadPool(pluralVar, singularVar) {
  const multi = process.env[pluralVar] || '';
  const single = process.env[singularVar] || '';
  const combined = [multi, single].join(',');
  const keys = combined.split(',').map(k => k.trim()).filter(Boolean);
  // Deduplicate in case same key is in both vars
  return [...new Set(keys)];
}

const keyPools = {
  openrouter: loadPool('OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY'),
  gemini:     loadPool('GEMINI_API_KEYS',     'GEMINI_API_KEY'),
};

// Log pool sizes at startup (never log actual keys)
Object.entries(keyPools).forEach(([provider, keys]) => {
  console.log(`[keyManager] ${provider}: ${keys.length} key(s) loaded`);
});

// ── Disable map: tracks cooldown per key ───────────────────────────
// Structure: { 'provider:keyHash' : timestamp_when_re_enabled }
const disabledUntil = {};

function keyId(provider, key) {
  // Use last 6 chars for identification in logs (never full key)
  return `${provider}:${key.slice(-6)}`;
}

function isAvailable(provider, key) {
  const id = keyId(provider, key);
  if (!disabledUntil[id]) return true;
  if (disabledUntil[id] <= Date.now()) {
    delete disabledUntil[id]; // cooldown expired — re-enable
    console.log(`[keyManager] ${provider} key ...${key.slice(-6)} re-enabled`);
    return true;
  }
  return false;
}

function disableKey(provider, key, durationMs, reason) {
  const id = keyId(provider, key);
  disabledUntil[id] = Date.now() + durationMs;
  const mins = Math.round(durationMs / 60000);
  console.warn(`[keyManager] ⚠️  ${provider} key ...${key.slice(-6)} disabled for ${mins}min — ${reason}`);
}

function getAvailableKeys(provider) {
  return (keyPools[provider] || []).filter(k => isAvailable(provider, k));
}

// ── Error classifier ───────────────────────────────────────────────
function classifyError(err) {
  const msg = (err?.message || '') + (err?.status ? ` status:${err.status}` : '');
  if (/429|rate.?limit|too many request/i.test(msg))         return 'rate_limit';
  if (/quota|exhausted|billing|exceeded|resource.*exhaust/i.test(msg)) return 'quota';
  if (/401|403|invalid.?key|unauthorized|api.?key/i.test(msg)) return 'auth';
  if (/5[0-9]{2}|server error|overloaded|unavailable/i.test(msg)) return 'server';
  return 'other';
}

// ── Main function: try each key until one works ────────────────────
async function withKeyFallback(provider, fn) {
  const allKeys = keyPools[provider] || [];

  if (allKeys.length === 0) {
    throw new Error(`[keyManager] No API keys configured for "${provider}". Set ${provider.toUpperCase()}_API_KEYS in Vercel env vars.`);
  }

  const available = getAvailableKeys(provider);

  if (available.length === 0) {
    // All keys on cooldown — find which one recovers soonest and wait for it
    const soonest = allKeys
      .map(k => ({ k, until: disabledUntil[keyId(provider, k)] || 0 }))
      .sort((a, b) => a.until - b.until)[0];
    const waitMs = Math.max(0, soonest.until - Date.now()) + 100;
    console.warn(`[keyManager] All ${provider} keys on cooldown. Waiting ${Math.round(waitMs / 1000)}s for next available key...`);
    await new Promise(r => setTimeout(r, waitMs));
    // Re-check after wait
    const retryKeys = getAvailableKeys(provider);
    if (retryKeys.length === 0) {
      throw new Error(`[keyManager] All ${provider} keys are exhausted. Add more keys to ${provider.toUpperCase()}_API_KEYS.`);
    }
    available.push(...retryKeys);
  }

  let lastErr;

  for (const key of available) {
    try {
      const result = await fn(key);
      return result; // ✅ success
    } catch (err) {
      lastErr = err;
      const type = classifyError(err);
      const shortKey = `...${key.slice(-6)}`;

      switch (type) {
        case 'rate_limit':
          // Short cooldown — usually resets in under a minute
          disableKey(provider, key, 60_000, 'rate limit (429)');
          break;

        case 'quota':
          // Daily/monthly quota hit — disable for 6 hours
          disableKey(provider, key, 6 * 60 * 60_000, 'quota exhausted');
          break;

        case 'auth':
          // Invalid key — disable for 24h (not permanent in case you rotate/fix it)
          disableKey(provider, key, 24 * 60 * 60_000, 'auth error (invalid key)');
          break;

        case 'server':
          // Provider-side 5xx — don't disable key, just try next key
          console.warn(`[keyManager] ${provider} key ${shortKey} got server error, trying next key...`);
          break;

        default:
          // Unknown error — don't disable key, re-throw immediately
          // (could be a prompt/model error, not a key problem)
          console.warn(`[keyManager] ${provider} key ${shortKey} — unknown error: ${err.message?.slice(0, 100)}`);
          throw err;
      }

      console.warn(`[keyManager] ${provider} key ${shortKey} failed (${type}), trying next key...`);
    }
  }

  // All available keys failed
  const totalKeys = allKeys.length;
  const disabledCount = totalKeys - getAvailableKeys(provider).length;
  throw Object.assign(
    lastErr || new Error(`All ${provider} keys failed`),
    { keyManagerInfo: `${disabledCount}/${totalKeys} ${provider} keys currently disabled` }
  );
}

// ── Status helper (useful for a /health endpoint) ──────────────────
function getStatus() {
  const status = {};
  for (const [provider, keys] of Object.entries(keyPools)) {
    const available = getAvailableKeys(provider);
    status[provider] = {
      total: keys.length,
      available: available.length,
      disabled: keys.length - available.length,
    };
  }
  return status;
}

module.exports = { withKeyFallback, getStatus };
