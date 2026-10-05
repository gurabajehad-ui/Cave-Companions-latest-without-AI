import { query } from '../server/pg.js';
import { db } from '../server/db.js';
import { defaultRuleClassifier } from '../server/moderation/RuleBasedClassifier.js';
import { defaultPolicyEngine } from '../server/moderation/policyEngine.js';
import { moderationPipeline } from '../server/moderation/ModerationPipeline.js';
import { sanitizeAndNormalizeText } from '../server/moderation/normalization.js';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { calculateQiblaBearing } from '../src/utils/qibla.js';

interface AuditResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: AuditResult[] = [];

async function runFullCodebaseAudit() {
  console.log('====================================================');
  console.log('     COMPREHENSIVE CODEBASE RUNTIME & LOGIC AUDIT    ');
  console.log('====================================================\n');

  // 1. Database Connection & Table Schema Audit
  try {
    const res = await query('SELECT 1 as health');
    results.push({
      suite: 'DATABASE',
      test: 'Database Connection & Health Query',
      status: 'PASS',
      details: `Health check rows: ${res.rows.length}`
    });
  } catch (err: any) {
    results.push({
      suite: 'DATABASE',
      test: 'Database Connection & Health Query',
      status: 'FAIL',
      details: err.message
    });
  }

  // 2. Core DB Queries (Users, Mosques, Shops, Circles)
  try {
    const usersRes = await query('SELECT id, full_name, phone FROM users LIMIT 10');
    results.push({
      suite: 'DB_LAYER',
      test: 'Users table query execution',
      status: 'PASS',
      details: `Queried users safely (rows: ${usersRes.rows.length})`
    });
  } catch (err: any) {
    results.push({
      suite: 'DB_LAYER',
      test: 'Users table query execution',
      status: 'FAIL',
      details: err.message
    });
  }

  try {
    const mosquesRes = await query('SELECT id, name, district FROM mosques LIMIT 10');
    results.push({
      suite: 'DB_LAYER',
      test: 'Mosques table query execution',
      status: 'PASS',
      details: `Queried mosques safely (rows: ${mosquesRes.rows.length})`
    });
  } catch (err: any) {
    results.push({
      suite: 'DB_LAYER',
      test: 'Mosques table query execution',
      status: 'FAIL',
      details: err.message
    });
  }

  try {
    const shopsRes = await query('SELECT id, name, address FROM shops LIMIT 10');
    results.push({
      suite: 'DB_LAYER',
      test: 'Shops table query execution',
      status: 'PASS',
      details: `Queried partner shops safely (rows: ${shopsRes.rows.length})`
    });
  } catch (err: any) {
    results.push({
      suite: 'DB_LAYER',
      test: 'Shops table query execution',
      status: 'FAIL',
      details: err.message
    });
  }

  try {
    const circlesRes = await query('SELECT id, name, admin_id FROM circles LIMIT 10');
    results.push({
      suite: 'DB_LAYER',
      test: 'Circles table query execution',
      status: 'PASS',
      details: `Queried circles safely (rows: ${circlesRes.rows.length})`
    });
  } catch (err: any) {
    results.push({
      suite: 'DB_LAYER',
      test: 'Circles table query execution',
      status: 'FAIL',
      details: err.message
    });
  }

  // 3. Mathematical & Utility Edge Cases (Qibla & Prayer times)
  try {
    const qiblaDeg = calculateQiblaBearing(23.8103, 90.4125);
    const qiblaPass = typeof qiblaDeg === 'number' && qiblaDeg > 260 && qiblaDeg < 285;
    results.push({
      suite: 'GEOLOCATION_LOGIC',
      test: 'Qibla angle calculation for Dhaka coordinates',
      status: qiblaPass ? 'PASS' : 'FAIL',
      details: `Calculated Qibla bearing: ${qiblaDeg}°`
    });
  } catch (err: any) {
    results.push({
      suite: 'GEOLOCATION_LOGIC',
      test: 'Qibla angle calculation for Dhaka coordinates',
      status: 'FAIL',
      details: err.message
    });
  }

  try {
    const coords = new Coordinates(23.8103, 90.4125);
    const params = CalculationMethod.Karachi();
    const prayerTimes = new PrayerTimes(coords, new Date(), params);
    const validTimes = prayerTimes && prayerTimes.fajr && prayerTimes.dhuhr && prayerTimes.asr && prayerTimes.maghrib && prayerTimes.isha;
    results.push({
      suite: 'PRAYER_TIMES_LOGIC',
      test: 'Islamic astronomical prayer times calculation (Adhan library)',
      status: validTimes ? 'PASS' : 'FAIL',
      details: `Fajr: ${prayerTimes?.fajr?.toLocaleTimeString()}, Maghrib: ${prayerTimes?.maghrib?.toLocaleTimeString()}`
    });
  } catch (err: any) {
    results.push({
      suite: 'PRAYER_TIMES_LOGIC',
      test: 'Islamic astronomical prayer times calculation (Adhan library)',
      status: 'FAIL',
      details: err.message
    });
  }

  // 4. Text Normalization & Safe Filtering
  try {
    const nullNorm = sanitizeAndNormalizeText(null);
    const emptyNorm = sanitizeAndNormalizeText('   ');
    const normalNorm = sanitizeAndNormalizeText('আসসালামু আলাইকুম, কেমন আছেন সবাই?');
    const obfuscatedNorm = sanitizeAndNormalizeText('ম_ে_র_ে ফ_ে_ল_ব');

    const normPass = !nullNorm.isValid && !emptyNorm.isValid && normalNorm.isValid && obfuscatedNorm.isValid;
    results.push({
      suite: 'NORMALIZATION',
      test: 'Text sanitizer & obfuscation detection edge cases',
      status: normPass ? 'PASS' : 'FAIL',
      details: `nullValid=${nullNorm.isValid}, emptyValid=${emptyNorm.isValid}, normalValid=${normalNorm.isValid}`
    });
  } catch (err: any) {
    results.push({
      suite: 'NORMALIZATION',
      test: 'Text sanitizer & obfuscation detection edge cases',
      status: 'FAIL',
      details: err.message
    });
  }

  // 5. Circle Deterministic Safety Pipeline
  try {
    const safeEval = await moderationPipeline.evaluateTextMessage('মাশাল্লাহ আজকের জামাতে অনেক মুসল্লি ছিলেন', {
      userId: 'audit_u1',
      circleId: 'audit_c1',
      messageType: 'TEXT'
    });

    const threatEval = await moderationPipeline.evaluateTextMessage('তোকে খুন করব এবং গলা কেটে ফেলব', {
      userId: 'audit_u2',
      circleId: 'audit_c1',
      messageType: 'TEXT'
    });

    const modPass = safeEval.isPermitted === true && threatEval.isPermitted === false;
    results.push({
      suite: 'SAFETY_PIPELINE',
      test: 'Cave Circle deterministic message evaluation & harm blocking',
      status: modPass ? 'PASS' : 'FAIL',
      details: `Safe allowed=${safeEval.isPermitted}, Threat blocked=${!threatEval.isPermitted}`
    });
  } catch (err: any) {
    results.push({
      suite: 'SAFETY_PIPELINE',
      test: 'Cave Circle deterministic message evaluation & harm blocking',
      status: 'FAIL',
      details: err.message
    });
  }

  // Output summary
  console.log('\n--- AUDIT RESULTS TABLE ---\n');
  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    if (r.status === 'PASS') {
      passedCount++;
      console.log(`✅ [${r.suite}] ${r.test} -> PASS (${r.details || ''})`);
    } else {
      failedCount++;
      console.log(`❌ [${r.suite}] ${r.test} -> FAIL (${r.details || ''})`);
    }
  }

  console.log(`\nTotal: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runFullCodebaseAudit().catch(e => {
  console.error('Audit fatal error:', e);
  process.exit(1);
});
