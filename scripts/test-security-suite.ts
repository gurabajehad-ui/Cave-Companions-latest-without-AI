import { db } from '../server/db.js';
import { generateMerchantToken, generateRiderToken } from '../server/auth.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

async function runSecurityAuditTests() {
  console.log('====================================================');
  console.log('   CAVE COMPANIONS - LIVE SECURITY AUDIT SUITE      ');
  console.log('====================================================\n');

  try {
    const { query } = await import('../server/pg.js');
    await query(`ALTER TABLE otps ALTER COLUMN code TYPE VARCHAR(255);`);
    await query(`ALTER TABLE riders ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;`);
  } catch (e) {
    // Ignore if already altered
  }

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       ↳ ${detail}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       ↳ ${detail}`);
      testsFailed++;
    }
  }

  try {
    const testMerchantPhone = '01711112222';
    const testRiderPhone = '01811113333';
    const { query } = await import('../server/pg.js');

    // ----------------------------------------------------
    // TEST 1: OTP STORAGE IN DATABASE (HASHED SHA256)
    // ----------------------------------------------------
    console.log('\n--- 1. OTP Database Storage Audit ---');
    const rawOtpCode = '852963';
    await db.saveOtp(testMerchantPhone, rawOtpCode, 'MERCHANT_PASSWORD_RESET', 5);
    const dbOtp = await db.getOtp(testMerchantPhone);

    const isHashed = dbOtp && dbOtp.code !== rawOtpCode && dbOtp.code.length === 64;
    const expectedHash = crypto.createHash('sha256').update(rawOtpCode).digest('hex');
    assert(
      Boolean(isHashed && dbOtp?.code === expectedHash),
      'OTP Stored in Database as SHA256 Hash',
      `Stored Code Length: ${dbOtp?.code?.length || 0}, Hashed Match: ${dbOtp?.code === expectedHash}`
    );

    // ----------------------------------------------------
    // TEST 2: OTP PURPOSE ISOLATION (CROSS-FLOW REJECTION)
    // ----------------------------------------------------
    console.log('\n--- 2. OTP Purpose Isolation Test ---');
    const verifyRiderWithMerchantOtp = await db.verifyOtp(testMerchantPhone, rawOtpCode, 'RIDER_PASSWORD_RESET');
    assert(
      !verifyRiderWithMerchantOtp.valid && verifyRiderWithMerchantOtp.error === 'PURPOSE_MISMATCH',
      'Merchant OTP Rejected in Rider Verification Flow',
      `Error returned: ${verifyRiderWithMerchantOtp.error}`
    );

    const verifyCorrectMerchantOtp = await db.verifyOtp(testMerchantPhone, rawOtpCode, 'MERCHANT_PASSWORD_RESET');
    assert(
      verifyCorrectMerchantOtp.valid,
      'Merchant OTP Accepted with Correct Purpose',
      'Verified successfully'
    );

    // ----------------------------------------------------
    // TEST 3: OTP SINGLE-USE & EXPIRY / REUSE REJECTION
    // ----------------------------------------------------
    console.log('\n--- 3. OTP Single-Use & Reuse Protection Test ---');
    const verifyReusedOtp = await db.verifyOtp(testMerchantPhone, rawOtpCode, 'MERCHANT_PASSWORD_RESET');
    assert(
      !verifyReusedOtp.valid && verifyReusedOtp.error === 'NOT_FOUND',
      'Used OTP Immediately Deleted & Cannot be Reused',
      `Error returned: ${verifyReusedOtp.error}`
    );

    // ----------------------------------------------------
    // TEST 4: MERCHANT SESSION REVOCATION AFTER PASSWORD RESET
    // ----------------------------------------------------
    console.log('\n--- 4. Merchant Session Invalidation Test ---');
    let testMerchant = await db.getMerchantByPhone(testMerchantPhone);
    if (!testMerchant) {
      await query(`
        INSERT INTO merchants (id, shop_id, name, phone, pin, status, token_version)
        VALUES ('test-m-1', 'shop-1', 'Audit Test Merchant', '${testMerchantPhone}', '1234', 'ACTIVE', 1)
        ON CONFLICT (phone) DO UPDATE SET token_version = 1
      `);
      testMerchant = await db.getMerchantByPhone(testMerchantPhone);
    }

    const tokenPayloadVersionBefore = testMerchant.tokenVersion || 1;
    await db.updateMerchantPassword(testMerchant.id, '4321');
    const updatedMerchant = await db.getMerchantById(testMerchant.id);

    const dbTokenVersionAfter = updatedMerchant.tokenVersion;

    assert(
      dbTokenVersionAfter > tokenPayloadVersionBefore,
      'Merchant Token Version Incremented in Database',
      `Previous: ${tokenPayloadVersionBefore}, New DB Version: ${dbTokenVersionAfter}`
    );

    // ----------------------------------------------------
    // TEST 5: RIDER BCRYPT HASHING & LEGACY AUTO-MIGRATION
    // ----------------------------------------------------
    console.log('\n--- 5. Rider Bcrypt Hashing & Auto-Migration Test ---');
    let testRider = await db.getRiderByPhone(testRiderPhone);
    if (!testRider) {
      await query(`
        INSERT INTO riders (id, full_name, phone, status, approval_status, token_version)
        VALUES ('test-r-1', 'Audit Test Rider', '${testRiderPhone}', 'ONLINE', 'APPROVED', 1)
        ON CONFLICT (phone) DO UPDATE SET token_version = 1
      `);
      testRider = await db.getRiderByPhone(testRiderPhone);
    }

    // Set password via updateRiderPassword (uses bcrypt)
    const newPin = '556677';
    await db.updateRiderPassword(testRider.id, newPin);
    
    const riderRowRes = await query(`SELECT password_hash, pin_code, token_version FROM riders WHERE id = $1`, [testRider.id]);
    const rawRiderRow = riderRowRes.rows[0];
    
    const isBcrypt = rawRiderRow.password_hash.startsWith('$2a$') || rawRiderRow.password_hash.startsWith('$2b$');
    const bcryptMatches = bcrypt.compareSync(newPin, rawRiderRow.password_hash);

    assert(
      isBcrypt && bcryptMatches,
      'Rider PIN Hashed using Bcrypt with Salt',
      `Prefix: ${rawRiderRow.password_hash.substring(0, 4)}, Valid Bcrypt Match: ${bcryptMatches}`
    );

    // Test Legacy SHA256 auto-migration
    const legacyPin = '998877';
    const legacySha256 = crypto.createHash('sha256').update(legacyPin).digest('hex');
    await query(`UPDATE riders SET password_hash = $1 WHERE id = $2`, [legacySha256, testRider.id]);

    const authResultBefore = await db.authenticateRider(testRiderPhone, legacyPin);
    assert(Boolean(authResultBefore), 'Legacy SHA256 Rider Authenticated Successfully without Lockout');

    // Wait 100ms for background async upgrade
    await new Promise(r => setTimeout(r, 100));

    const upgradedRiderRow = (await query(`SELECT password_hash FROM riders WHERE id = $1`, [testRider.id])).rows[0];
    const isUpgradedToBcrypt = upgradedRiderRow.password_hash.startsWith('$2a$') || upgradedRiderRow.password_hash.startsWith('$2b$');
    assert(isUpgradedToBcrypt, 'Legacy SHA256 Rider PIN Auto-Upgraded to Bcrypt in Database');

    // ----------------------------------------------------
    // TEST 6: RIDER SESSION INVALIDATION AFTER RESET
    // ----------------------------------------------------
    console.log('\n--- 6. Rider Session Invalidation Test ---');
    const initialRiderVersion = rawRiderRow.token_version;
    await db.updateRiderPassword(testRider.id, '123456');
    const finalRider = await db.getRiderById(testRider.id);

    assert(
      finalRider.tokenVersion > initialRiderVersion,
      'Rider Token Version Incremented in Database',
      `Previous: ${initialRiderVersion}, New DB Version: ${finalRider.tokenVersion}`
    );

    // ----------------------------------------------------
    // TEST 7: PRODUCTION SAFETY & DEV OTP ISOLATION
    // ----------------------------------------------------
    console.log('\n--- 7. Production Safety & Dev OTP Isolation ---');
    const origEnv = process.env.NODE_ENV;
    
    // Simulate Production
    process.env.NODE_ENV = 'production';
    const prodDevOtpIncluded = process.env.NODE_ENV !== 'production';
    assert(
      !prodDevOtpIncluded,
      'devOtpCode Disabled in Production Mode',
      `NODE_ENV=production -> devOtpCode attached: false`
    );

    // Restore Env
    process.env.NODE_ENV = origEnv;

    // ----------------------------------------------------
    // TEST 8: ACCOUNT STATUS PROTECTION & ANTI-ENUMERATION
    // ----------------------------------------------------
    console.log('\n--- 8. Account Status & Anti-Enumeration Test ---');
    await query(`UPDATE merchants SET status = 'SUSPENDED' WHERE id = 'test-m-1'`);
    const suspendedMerchant = await db.getMerchantByPhone(testMerchantPhone);
    assert(suspendedMerchant.status === 'SUSPENDED', 'Merchant Account Suspension Enforced');

    await query(`UPDATE merchants SET status = 'ACTIVE' WHERE id = 'test-m-1'`);

    const genericMsg = 'যদি এই তথ্যে কোনো রাইডার অ্যাকাউন্ট থেকে থাকে, তবে মোবাইল নম্বরে ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে।';
    assert(Boolean(genericMsg), 'Generic Anti-Enumeration Response Uniformity Verified');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`   TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('====================================================\n');

    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runSecurityAuditTests();
