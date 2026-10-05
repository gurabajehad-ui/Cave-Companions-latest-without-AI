import { pool, useSqliteFallback } from './pg.js';
import fs from 'fs';
import path from 'path';

export async function initPostgresSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Early execute Alter tables for mosques to prevent failure if lower tables fail
    try {
      // Import query directly to run outside the current transaction
      const { query } = await import('./pg.js');
      await query(`
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS image_url TEXT;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS imam_image_url TEXT;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_user_id VARCHAR(255);
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_name VARCHAR(255);
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS requested_by_phone VARCHAR(255);
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255);
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS verification_radius DOUBLE PRECISION DEFAULT 75;
        ALTER TABLE mosques ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        UPDATE mosques SET verification_radius = 75 WHERE verification_radius IS NULL OR verification_radius <= 0;

        -- Ensure default partner mosques have valid coordinates
        UPDATE mosques SET latitude = 23.7289, longitude = 90.4128 WHERE qr_identifier = 'CAVE_MSQ_001_DHAKA_BAITUL_MUKARRAM' AND (latitude = 0 OR latitude IS NULL);
        UPDATE mosques SET latitude = 23.7388, longitude = 90.4072 WHERE qr_identifier = 'CAVE_MSQ_002_DHAKA_KAKRAIL_JAME' AND (latitude = 0 OR latitude IS NULL);
        UPDATE mosques SET latitude = 23.7915, longitude = 90.4152 WHERE qr_identifier = 'CAVE_MSQ_003_DHAKA_GULSHAN_AZAD' AND (latitude = 0 OR latitude IS NULL);
        UPDATE mosques SET latitude = 23.7431, longitude = 90.3742 WHERE qr_identifier = 'CAVE_MSQ_004_DHAKA_DHANMONDI_SHAHI' AND (latitude = 0 OR latitude IS NULL);
        UPDATE mosques SET latitude = 23.8687, longitude = 90.3986 WHERE qr_identifier = 'CAVE_MSQ_005_DHAKA_UTTARA_SEC7' AND (latitude = 0 OR latitude IS NULL);
        UPDATE mosques SET latitude = 22.3385, longitude = 91.8385 WHERE qr_identifier = 'CAVE_MSQ_006_CTG_ANDERKILLA_SHAHI' AND (latitude = 0 OR latitude IS NULL);
        UPDATE mosques SET latitude = 24.8996, longitude = 91.8718 WHERE qr_identifier = 'CAVE_MSQ_007_SYLHET_SHAH_JALAL' AND (latitude = 0 OR latitude IS NULL);
      `);
      console.log('[PostgreSQL] mosques table altered successfully.');
    } catch (e: any) {
      console.warn('[PostgreSQL] Failed to alter mosques early:', e.message);
    }

    // Early ensure circle_members chat_cleared_at column
    try {
      const { query } = await import('./pg.js');
      await query(`ALTER TABLE circle_members ADD COLUMN chat_cleared_at TIMESTAMP WITH TIME ZONE;`);
    } catch (_) {}

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255),
        password_hash TEXT,
        gender VARCHAR(50) NOT NULL DEFAULT 'male',
        age INTEGER,
        marital_status VARCHAR(50),
        address TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        photo_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS district TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS upazila TEXT;
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    `);

    // 2. Mosques Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mosques (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        area VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        qr_identifier VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        imam_name VARCHAR(255),
        contact_number VARCHAR(50),
        latitude DOUBLE PRECISION DEFAULT 0,
        longitude DOUBLE PRECISION DEFAULT 0,
        description TEXT,
        image_url TEXT,
        imam_image_url TEXT,
        requested_by_user_id VARCHAR(255),
        requested_by_name VARCHAR(255),
        requested_by_phone VARCHAR(255),
        rejection_reason TEXT,
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255),
        verification_radius DOUBLE PRECISION DEFAULT 75,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mosques_qr ON mosques(qr_identifier);
    `);
    
    // 3. Prayer Attendances Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prayer_attendances (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mosque_id VARCHAR(255) NOT NULL,
        mosque_name VARCHAR(255) NOT NULL,
        prayer_type VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(50) NOT NULL DEFAULT 'verified',
        qr_payload TEXT,
        CONSTRAINT unique_user_daily_prayer UNIQUE (user_id, date, prayer_type)
      );
      ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS mosque_id VARCHAR(255);
      ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS mosque_name VARCHAR(255);
      ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS security_status VARCHAR(50) DEFAULT 'verified';
      ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
      ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS risk_reason TEXT;
      ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();
      CREATE INDEX IF NOT EXISTS idx_att_user_date ON prayer_attendances(user_id, date);

      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        affected_date VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        risk_score INTEGER NOT NULL,
        reason TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        admin_id VARCHAR(255)
      );
      ALTER TABLE security_audit_logs ALTER COLUMN user_id DROP NOT NULL;
    `);

    // 4. OTPs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otps (
        identifier VARCHAR(255) PRIMARY KEY,
        code VARCHAR(255) NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        expires_at BIGINT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        registration_data JSONB
      );
      ALTER TABLE otps ALTER COLUMN code TYPE VARCHAR(255);
    `);

    // 5. Tokens Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
        earned_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        used_at TIMESTAMPTZ,
        redemption_ref VARCHAR(255),
        source_prayer_count INTEGER NOT NULL DEFAULT 3,
        CONSTRAINT unique_user_daily_token UNIQUE (user_id, earned_date)
      );
      CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
    `);

    // 6. Shops Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NOT NULL,
        owner_id VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        area VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION DEFAULT 0,
        longitude DOUBLE PRECISION DEFAULT 0,
        category VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url TEXT,
        photo_url TEXT,
        opening_hours VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        qr_identifier VARCHAR(255) NOT NULL UNIQUE,
        qr_secret VARCHAR(255) NOT NULL,
        gold_discount NUMERIC DEFAULT 15,
        silver_discount NUMERIC DEFAULT 10,
        bronze_discount NUMERIC DEFAULT 7,
        pending_gold_discount NUMERIC,
        pending_silver_discount NUMERIC,
        pending_bronze_discount NUMERIC,
        commission_rate NUMERIC DEFAULT 3.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);

      CREATE TABLE IF NOT EXISTS commission_change_requests (
        id VARCHAR(255) PRIMARY KEY,
        shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        current_commission_percent NUMERIC NOT NULL,
        requested_commission_percent NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        reason TEXT,
        admin_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_commission_requests_shop ON commission_change_requests(shop_id);
      CREATE INDEX IF NOT EXISTS idx_commission_requests_status ON commission_change_requests(status);
    `);

    // 7. Merchants Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL UNIQUE,
        pin TEXT NOT NULL,
        shop_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'MERCHANT',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_merchants_phone ON merchants(phone);
    `);

    // 8. Redemptions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id VARCHAR(255) PRIMARY KEY,
        token_id VARCHAR(255) NOT NULL,
        token_type VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        shop_id VARCHAR(255) NOT NULL,
        shop_name VARCHAR(255) NOT NULL,
        merchant_id VARCHAR(255) NOT NULL,
        merchant_name VARCHAR(255) NOT NULL,
        bill_amount NUMERIC NOT NULL,
        discount_percent NUMERIC NOT NULL,
        discount_amount NUMERIC NOT NULL,
        final_amount NUMERIC NOT NULL,
        commission_rate NUMERIC NOT NULL,
        commission_amount NUMERIC NOT NULL,
        merchant_payout_amount NUMERIC NOT NULL,
        redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED'
      );
      CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_redemptions_shop ON redemptions(shop_id);

      CREATE TABLE IF NOT EXISTS token_redemption_requests (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        shop_id VARCHAR(255) NOT NULL,
        shop_name VARCHAR(255) NOT NULL,
        merchant_id VARCHAR(255),
        token_id VARCHAR(255) NOT NULL,
        token_type VARCHAR(50) NOT NULL,
        is_donated BOOLEAN DEFAULT FALSE,
        purchase_amount NUMERIC NOT NULL,
        discount_percent NUMERIC NOT NULL,
        discount_amount NUMERIC NOT NULL,
        final_payable NUMERIC NOT NULL,
        donated_amount NUMERIC DEFAULT 0,
        commission_rate NUMERIC NOT NULL,
        gross_commission_amount NUMERIC NOT NULL,
        cave_companions_net_income NUMERIC NOT NULL,
        merchant_payout_amount NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        rejection_reason TEXT,
        redemption_id VARCHAR(255),
        verification_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
        processed_at TIMESTAMPTZ,
        processed_by VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_trq_shop_status ON token_redemption_requests(shop_id, status);
      CREATE INDEX IF NOT EXISTS idx_trq_user_status ON token_redemption_requests(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_trq_token ON token_redemption_requests(token_id);
      CREATE INDEX IF NOT EXISTS idx_trq_status_expires ON token_redemption_requests(status, expires_at);
    `);

    // 9. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        message_bn TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

      CREATE TABLE IF NOT EXISTS notification_templates (
        id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        message_bn TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        available_variables JSONB NOT NULL DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notif_templates_event ON notification_templates(event_type);
    `);

    // 10. Support Tickets Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(255) PRIMARY KEY,
        ticket_number VARCHAR(100) NOT NULL UNIQUE,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        category VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        messages JSONB DEFAULT '[]',
        admin_notes TEXT,
        resolution TEXT
      );
    `);

    // 11. Admin Accounts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50),
        password_hash VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        permissions JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ,
        created_by VARCHAR(255)
      );
      ALTER TABLE admin_accounts ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE admin_accounts ALTER COLUMN last_login_at DROP NOT NULL;
      ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);

    // 13. Global Config Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_config (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 14. Nasiha Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS nasiha (
        id VARCHAR(255) PRIMARY KEY,
        text_bn TEXT NOT NULL,
        source_bn TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 14.1 Blogs / CAVE Media Table (Persistent multi-device database)
    await client.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        video_url TEXT,
        author VARCHAR(255) DEFAULT 'Admin',
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(is_published, created_at DESC)');

    // 15. QR Verifications Table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS qr_verifications (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await client.query('CREATE INDEX IF NOT EXISTS idx_qr_verif_user ON qr_verifications(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_qr_verif_expires ON qr_verifications(expires_at)');
      console.log('[PostgreSQL] qr_verifications table verified.');
    } catch (err: any) {
      console.warn('[PostgreSQL] Non-fatal error during qr_verifications init:', err.message);
    }

    // 16. Merchant Verifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchant_verifications (
        id VARCHAR(255) PRIMARY KEY,
        merchant_id VARCHAR(255) NOT NULL,
        shop_id VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255),
        shop_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(100) NOT NULL,
        shop_address TEXT NOT NULL,
        district VARCHAR(100) NOT NULL,
        upazila_thana VARCHAR(100) NOT NULL,
        latitude NUMERIC DEFAULT 0,
        longitude NUMERIC DEFAULT 0,
        shop_photo_url TEXT,
        business_description TEXT,
        nid_number VARCHAR(100) NOT NULL,
        nid_front_url TEXT NOT NULL,
        nid_back_url TEXT NOT NULL,
        owner_selfie_url TEXT NOT NULL,
        trade_license_number VARCHAR(100) NOT NULL,
        trade_license_url TEXT NOT NULL,
        tin_number VARCHAR(100),
        bin_vat_number VARCHAR(100),
        agreement_accepted BOOLEAN NOT NULL DEFAULT TRUE,
        agreement_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        agreement_version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
        accepted_total_commission NUMERIC NOT NULL DEFAULT 6,
        accepted_gold_user_benefit NUMERIC NOT NULL DEFAULT 5,
        accepted_gold_platform_commission NUMERIC NOT NULL DEFAULT 1,
        accepted_silver_user_benefit NUMERIC NOT NULL DEFAULT 4,
        accepted_silver_platform_commission NUMERIC NOT NULL DEFAULT 2,
        accepted_bronze_user_benefit NUMERIC NOT NULL DEFAULT 3,
        accepted_bronze_platform_commission NUMERIC NOT NULL DEFAULT 3,
        verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        merchant_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
        correction_message TEXT,
        requested_correction_fields JSONB DEFAULT '[]',
        correction_history JSONB DEFAULT '[]',
        rejection_reason TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_mch_vrf_merchant ON merchant_verifications(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_mch_vrf_shop ON merchant_verifications(shop_id);
      CREATE INDEX IF NOT EXISTS idx_mch_vrf_status ON merchant_verifications(verification_status);

      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING';
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS upazila_thana VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING';
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS correction_message TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS nid_number VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS nid_front_url TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS nid_back_url TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_selfie_url TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS trade_license_number VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS trade_license_url TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS tin_number VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS bin_vat_number VARCHAR(100);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN DEFAULT FALSE;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS agreement_accepted_at TIMESTAMPTZ;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS agreement_version VARCHAR(50) DEFAULT 'v1.0';
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_total_commission NUMERIC DEFAULT 6;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_gold_user_benefit NUMERIC DEFAULT 5;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_gold_platform_commission NUMERIC DEFAULT 1;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_silver_user_benefit NUMERIC DEFAULT 4;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_silver_platform_commission NUMERIC DEFAULT 2;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_bronze_user_benefit NUMERIC DEFAULT 3;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepted_bronze_platform_commission NUMERIC DEFAULT 3;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_address TEXT;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

      ALTER TABLE merchant_verifications ADD COLUMN IF NOT EXISTS location_address TEXT;
      ALTER TABLE merchant_verifications ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

      ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS gross_commission_amount NUMERIC;
      ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS cave_companions_net_income NUMERIC;

      ALTER TABLE commission_change_requests ADD COLUMN IF NOT EXISTS reason TEXT;
      ALTER TABLE commission_change_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;

      -- Migrate historical data: 
      -- In existing records, commission_amount represents CC Net Income.
      -- Gross Commission = Discount Amount + CC Net Income
      UPDATE redemptions 
      SET cave_companions_net_income = commission_amount,
          gross_commission_amount = discount_amount + commission_amount
      WHERE cave_companions_net_income IS NULL;

      -- 17. Helpline Settings Table
      CREATE TABLE IF NOT EXISTS helpline_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default_helpline',
        primary_phone VARCHAR(50) NOT NULL DEFAULT '+880 1700-000000',
        secondary_phone VARCHAR(50) DEFAULT '',
        whatsapp_number VARCHAR(50) DEFAULT '',
        support_email VARCHAR(150) DEFAULT 'support@cavecompanions.org',
        support_message TEXT DEFAULT 'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
        is_whatsapp_enabled BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(100) DEFAULT 'system'
      );

      -- Idempotently insert default configuration if missing
      INSERT INTO helpline_settings (
        id, primary_phone, secondary_phone, whatsapp_number, support_email, support_message, is_whatsapp_enabled, is_active, updated_at, updated_by
      ) VALUES (
        'default_helpline',
        '+880 1700-000000',
        '',
        '',
        'support@cavecompanions.org',
        'সাহায্যের জন্য ২৪-৪৮ ঘণ্টার মধ্যে আমাদের টিম আপনার অনুরোধটি রিভিউ করবে। জরুরি কোনো সাহায্যের প্রয়োজন হলে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।',
        FALSE,
        TRUE,
        NOW(),
        'system'
      ) ON CONFLICT (id) DO NOTHING;

      -- 17b. Coupons Table
      CREATE TABLE IF NOT EXISTS coupons (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        discount_type VARCHAR(50) NOT NULL,
        discount_value NUMERIC NOT NULL,
        usage_limit INTEGER NOT NULL DEFAULT 1,
        used_count INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

      -- 18. Products Table
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        original_price NUMERIC NOT NULL,
        weight_kg NUMERIC NOT NULL DEFAULT 1.0,
        image_url TEXT,
        gallery JSONB DEFAULT '[]',
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'APPROVED',
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC NOT NULL DEFAULT 1.0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APPROVED';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
      CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

      -- Update any existing NULL status to APPROVED
      UPDATE products SET status = 'APPROVED' WHERE status IS NULL;

      -- 18b. Product Price Change Requests Table
      CREATE TABLE IF NOT EXISTS product_price_change_requests (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        merchant_id VARCHAR(255),
        old_price NUMERIC NOT NULL,
        requested_new_price NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255),
        rejection_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_ppcr_product ON product_price_change_requests(product_id);
      CREATE INDEX IF NOT EXISTS idx_ppcr_shop ON product_price_change_requests(shop_id);
      CREATE INDEX IF NOT EXISTS idx_ppcr_status ON product_price_change_requests(status);

      -- 18c. Product Delete Requests Table
      CREATE TABLE IF NOT EXISTS product_delete_requests (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        merchant_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by VARCHAR(255),
        rejection_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pdr_product ON product_delete_requests(product_id);
      CREATE INDEX IF NOT EXISTS idx_pdr_shop ON product_delete_requests(shop_id);
      CREATE INDEX IF NOT EXISTS idx_pdr_status ON product_delete_requests(status);

      -- 19a. Districts Table
      CREATE TABLE IF NOT EXISTS districts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        name_bn VARCHAR(100) NOT NULL
      );

      -- 19b. Upazilas Table
      CREATE TABLE IF NOT EXISTS upazilas (
        id SERIAL PRIMARY KEY,
        district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_upazilas_district ON upazilas(district_id);

      -- 19c. District Delivery Charges Table
      CREATE TABLE IF NOT EXISTS district_delivery_charges (
        id SERIAL PRIMARY KEY,
        district_name VARCHAR(100) UNIQUE NOT NULL,
        delivery_charge NUMERIC NOT NULL DEFAULT 100.00,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(100) DEFAULT 'system'
      );

      -- 19d. Local Market Delivery Rates Table (Weight Brackets)
      CREATE TABLE IF NOT EXISTS local_delivery_rates (
        bracket_key VARCHAR(50) PRIMARY KEY,
        min_weight_kg NUMERIC NOT NULL,
        max_weight_kg NUMERIC NOT NULL,
        rate_per_km NUMERIC NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(100) DEFAULT 'system'
      );

      -- Seed default rates for local market weight brackets if not present
      INSERT INTO local_delivery_rates (bracket_key, min_weight_kg, max_weight_kg, rate_per_km, updated_at, updated_by)
      VALUES 
        ('0_1', 0.0, 1.0, 20.00, NOW(), 'system'),
        ('1_5', 1.0, 5.0, 15.00, NOW(), 'system'),
        ('6_10', 6.0, 10.0, 25.00, NOW(), 'system')
      ON CONFLICT (bracket_key) DO NOTHING;

      -- Legacy Delivery Charge Settings Table
      CREATE TABLE IF NOT EXISTS delivery_charge_settings (
        id VARCHAR(100) PRIMARY KEY,
        amount NUMERIC NOT NULL DEFAULT 100.00,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by VARCHAR(100) DEFAULT 'system'
      );

      -- We will dynamically populate this from the application level later,
      -- but let's make sure it handles all districts when accessed.

      -- 20. Shopping Carts & Cart Items Tables
      CREATE TABLE IF NOT EXISTS carts (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);

      CREATE TABLE IF NOT EXISTS cart_items (
        id VARCHAR(255) PRIMARY KEY,
        cart_id VARCHAR(255) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        weight_kg NUMERIC DEFAULT 1.0,
        token_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 1.0;
      CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

      -- 21. Orders & Order Items Tables
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        order_number VARCHAR(100) NOT NULL UNIQUE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        delivery_address TEXT NOT NULL,
        district VARCHAR(100),
        upazila VARCHAR(100),
        full_address TEXT,
        delivery_charge_type VARCHAR(50) DEFAULT 'DHAKA',
        delivery_notes TEXT,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH_ON_DELIVERY',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        product_total_original NUMERIC NOT NULL DEFAULT 0,
        product_total_discount NUMERIC NOT NULL DEFAULT 0,
        product_total_payable NUMERIC NOT NULL DEFAULT 0,
        delivery_charge NUMERIC NOT NULL DEFAULT 60.00,
        total_cod_amount NUMERIC NOT NULL DEFAULT 60.00,
        admin_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        delivered_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ
      );
      -- Ensure columns exist if table already created
      ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_history_deleted BOOLEAN DEFAULT FALSE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS upazila VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS full_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge_type VARCHAR(50) DEFAULT 'DHAKA';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC NOT NULL DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'NATIONWIDE';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id VARCHAR(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_status VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_waived BOOLEAN DEFAULT FALSE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS waived_by VARCHAR(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS waived_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_delivery_charge NUMERIC DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(10);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_code VARCHAR(10);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_accepted_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_picked_up_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_delivered_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_settled_at TIMESTAMPTZ;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50) DEFAULT 'PENDING';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_fee NUMERIC DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km DOUBLE PRECISION;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS local_delivery_route JSONB;
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

      -- 21b. Riders Table & Delivery System Tables
      CREATE TABLE IF NOT EXISTS riders (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL UNIQUE,
        password_hash TEXT,
        pin_code VARCHAR(50),
        nid_number VARCHAR(100),
        vehicle_type VARCHAR(50) DEFAULT 'BICYCLE',
        photo_url TEXT,
        nid_front_url TEXT,
        nid_back_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
        approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        rejection_reason TEXT,
        current_latitude DOUBLE PRECISION,
        current_longitude DOUBLE PRECISION,
        last_location_updated_at TIMESTAMPTZ,
        total_deliveries INTEGER DEFAULT 0,
        total_delivered INTEGER DEFAULT 0,
        total_done INTEGER DEFAULT 0,
        total_product_back INTEGER DEFAULT 0,
        total_earnings NUMERIC DEFAULT 0,
        approved_at TIMESTAMPTZ,
        approved_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS pin_code VARCHAR(50);
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS nid_number VARCHAR(100);
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT 'BICYCLE';
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS nid_front_url TEXT;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS nid_back_url TEXT;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PENDING';
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_delivered INTEGER DEFAULT 0;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_done INTEGER DEFAULT 0;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_product_back INTEGER DEFAULT 0;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMPTZ;
      ALTER TABLE riders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
      CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);
      CREATE INDEX IF NOT EXISTS idx_riders_approval ON riders(approval_status);

      CREATE TABLE IF NOT EXISTS rider_delivery_requests (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        rider_id VARCHAR(255) NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        CONSTRAINT unique_order_rider_request UNIQUE (order_id, rider_id)
      );
      CREATE INDEX IF NOT EXISTS idx_rdr_order ON rider_delivery_requests(order_id);
      CREATE INDEX IF NOT EXISTS idx_rdr_rider ON rider_delivery_requests(rider_id);

      CREATE TABLE IF NOT EXISTS rider_activity_logs (
        id VARCHAR(255) PRIMARY KEY,
        rider_id VARCHAR(255) NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
        order_id VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ral_rider ON rider_activity_logs(rider_id);

      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image_url TEXT,
        shop_id VARCHAR(255) NOT NULL REFERENCES shops(id),
        shop_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        original_price NUMERIC NOT NULL,
        token_id VARCHAR(255),
        token_type VARCHAR(50),
        token_discount_rate NUMERIC NOT NULL DEFAULT 0,
        token_discount_amount NUMERIC NOT NULL DEFAULT 0,
        customer_product_payable NUMERIC NOT NULL DEFAULT 0,
        commission_rate NUMERIC NOT NULL DEFAULT 3.0,
        commission_amount NUMERIC NOT NULL DEFAULT 0,
        shop_receivable NUMERIC NOT NULL DEFAULT 0,
        net_income NUMERIC NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_shop ON order_items(shop_id);
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 1.0;

      -- 22. Online Financial Records (Online হিসাব)
      CREATE TABLE IF NOT EXISTS online_financial_records (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        order_number VARCHAR(100) NOT NULL,
        order_item_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        delivery_address TEXT NOT NULL,
        shop_id VARCHAR(255) NOT NULL,
        shop_name VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        original_price NUMERIC NOT NULL,
        token_type VARCHAR(50),
        token_discount_amount NUMERIC NOT NULL DEFAULT 0,
        customer_product_payable NUMERIC NOT NULL,
        commission_rate NUMERIC NOT NULL,
        commission_amount NUMERIC NOT NULL,
        shop_receivable NUMERIC NOT NULL,
        net_income NUMERIC NOT NULL,
        order_created_at TIMESTAMPTZ NOT NULL,
        delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE online_financial_records ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100);
      ALTER TABLE online_financial_records ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_onl_fin_order ON online_financial_records(order_id);
      CREATE INDEX IF NOT EXISTS idx_onl_fin_shop ON online_financial_records(shop_id);
      CREATE INDEX IF NOT EXISTS idx_onl_fin_created ON online_financial_records(created_at);

      -- 23. Uploaded Media Table (Durable Binary Storage for Product Images, Documents, etc.)
      CREATE TABLE IF NOT EXISTS uploaded_media (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_uploaded_media_created ON uploaded_media(created_at);

      -- 24. User Salah Journeys & Growth Settings Table
      CREATE TABLE IF NOT EXISTS user_salah_journeys (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        journey_start_date VARCHAR(50) NOT NULL DEFAULT '',
        archived_journeys JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_salah_journeys_user ON user_salah_journeys(user_id);

    `);

    await client.query('COMMIT');
    
      // =====================================
      // Advertisement System Tables
      // =====================================
      await client.query(`
        CREATE TABLE IF NOT EXISTS advertisements (
          id VARCHAR(50) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          sponsor_name VARCHAR(255),
          description TEXT,
          image_url VARCHAR(1000) NOT NULL,
          ad_type VARCHAR(50) DEFAULT 'BANNER',
          destination_type VARCHAR(50) DEFAULT 'NONE',
          destination_id VARCHAR(255),
          external_url VARCHAR(1000),
          start_at TIMESTAMP WITH TIME ZONE,
          end_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_by VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS advertisement_display_locations (
          id VARCHAR(50) PRIMARY KEY,
          advertisement_id VARCHAR(50) REFERENCES advertisements(id) ON DELETE CASCADE,
          page_name VARCHAR(50) NOT NULL,
          placement_slot VARCHAR(50) NOT NULL,
          display_size VARCHAR(20) DEFAULT 'MEDIUM',
          space_profile VARCHAR(20) DEFAULT 'STANDARD',
          width_profile VARCHAR(20) DEFAULT 'FULL',
          height_profile VARCHAR(20) DEFAULT 'STANDARD',
          priority INTEGER DEFAULT 10,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(advertisement_id, page_name, placement_slot)
        );

        CREATE TABLE IF NOT EXISTS advertisement_display_settings (
          id VARCHAR(50) PRIMARY KEY,
          page_name VARCHAR(50) NOT NULL,
          placement_slot VARCHAR(50),
          max_ads INTEGER DEFAULT 3,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(page_name, placement_slot)
        );

        CREATE INDEX IF NOT EXISTS idx_adv_status ON advertisements(status);
        CREATE INDEX IF NOT EXISTS idx_adv_dates ON advertisements(start_at, end_at);
        CREATE INDEX IF NOT EXISTS idx_adv_loc_page ON advertisement_display_locations(page_name);
        CREATE INDEX IF NOT EXISTS idx_adv_loc_slot ON advertisement_display_locations(placement_slot);
        CREATE INDEX IF NOT EXISTS idx_adv_loc_ad_id ON advertisement_display_locations(advertisement_id);

         -- Auto-fill default display locations for advertisements missing locations
        INSERT INTO advertisement_display_locations (id, advertisement_id, page_name, placement_slot, display_size, space_profile, width_profile, height_profile, priority)
        SELECT 'loc-' || a.id || '-home-top', a.id, 'HOME', 'TOP', 'MEDIUM', 'STANDARD', 'FULL', 'STANDARD', 10
        FROM advertisements a
        WHERE NOT EXISTS (SELECT 1 FROM advertisement_display_locations l WHERE l.advertisement_id = a.id)
        ON CONFLICT DO NOTHING;

        INSERT INTO advertisement_display_locations (id, advertisement_id, page_name, placement_slot, display_size, space_profile, width_profile, height_profile, priority)
        SELECT 'loc-' || a.id || '-home-before', a.id, 'HOME', 'BEFORE_PRODUCTS', 'MEDIUM', 'STANDARD', 'FULL', 'STANDARD', 10
        FROM advertisements a
        WHERE NOT EXISTS (SELECT 1 FROM advertisement_display_locations l WHERE l.advertisement_id = a.id)
        ON CONFLICT DO NOTHING;

        INSERT INTO advertisement_display_locations (id, advertisement_id, page_name, placement_slot, display_size, space_profile, width_profile, height_profile, priority)
        SELECT 'loc-' || a.id || '-market-top', a.id, 'CAVE_MARKET', 'TOP', 'MEDIUM', 'STANDARD', 'FULL', 'STANDARD', 10
        FROM advertisements a
        WHERE NOT EXISTS (SELECT 1 FROM advertisement_display_locations l WHERE l.advertisement_id = a.id)
        ON CONFLICT DO NOTHING;

        -- Shop Reviews and Rating table
        CREATE TABLE IF NOT EXISTS shop_reviews (
          id VARCHAR(255) PRIMARY KEY,
          shop_id VARCHAR(255) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_name VARCHAR(255) NOT NULL,
          user_phone VARCHAR(50),
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NOT NULL,
          merchant_reply TEXT,
          merchant_reply_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS merchant_reply TEXT;
        ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS merchant_reply_at TIMESTAMP WITH TIME ZONE;

        CREATE INDEX IF NOT EXISTS idx_shop_reviews_shop ON shop_reviews(shop_id);
        CREATE INDEX IF NOT EXISTS idx_shop_reviews_user ON shop_reviews(user_id);

        -- Product Reviews and Rating table
        CREATE TABLE IF NOT EXISTS product_reviews (
          id VARCHAR(255) PRIMARY KEY,
          product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_name VARCHAR(255) NOT NULL,
          user_phone VARCHAR(50),
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
        CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);

        -- Analytics Events Table
        CREATE TABLE IF NOT EXISTS analytics_events (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          event_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id VARCHAR(255),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_type, entity_id);

        -- Cave Circles Tables
        CREATE TABLE IF NOT EXISTS circles (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            admin_id VARCHAR(255) NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_circles_admin ON circles(admin_id);
        ALTER TABLE circles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Islamic';
        ALTER TABLE circles ADD COLUMN IF NOT EXISTS jamaat_streak INTEGER DEFAULT 7;

        CREATE TABLE IF NOT EXISTS circle_members (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id),
            role VARCHAR(50) DEFAULT 'MEMBER',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            UNIQUE(circle_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
        CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
        ALTER TABLE circle_members ADD COLUMN IF NOT EXISTS chat_cleared_at TIMESTAMP WITH TIME ZONE;

        CREATE TABLE IF NOT EXISTS circle_invites (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            invite_code VARCHAR(100) NOT NULL UNIQUE,
            created_by VARCHAR(255) NOT NULL REFERENCES users(id),
            expires_at TIMESTAMP WITH TIME ZONE,
            revoked_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_circle_invites_code ON circle_invites(invite_code);

        CREATE TABLE IF NOT EXISTS circle_challenges (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            challenge_type VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            created_by VARCHAR(255) NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_circle_challenges_circle ON circle_challenges(circle_id);

        CREATE TABLE IF NOT EXISTS circle_messages (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id),
            sender_name VARCHAR(255) NOT NULL,
            message_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
            content TEXT NOT NULL,
            audio_url TEXT,
            audio_duration_sec INTEGER,
            read_by JSONB DEFAULT '[]'::jsonb,
            status VARCHAR(50) DEFAULT 'SENT',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON circle_messages(circle_id, created_at DESC);
        ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SENT';

        CREATE TABLE IF NOT EXISTS circle_quran_goals (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            total_juz INTEGER NOT NULL DEFAULT 30,
            completed_juz JSONB NOT NULL DEFAULT '[]',
            target_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_circle_quran_goals_circle ON circle_quran_goals(circle_id);

        CREATE TABLE IF NOT EXISTS circle_direct_invitations (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            inviter_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            invitee_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            invitee_phone VARCHAR(50),
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_circle_direct_invites_invitee ON circle_direct_invitations(invitee_id, status);
        CREATE INDEX IF NOT EXISTS idx_circle_direct_invites_circle ON circle_direct_invitations(circle_id);

        CREATE TABLE IF NOT EXISTS circle_battles (
            id VARCHAR(255) PRIMARY KEY,
            challenger_circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            challenged_circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            challenger_admin_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            battle_type VARCHAR(100) NOT NULL DEFAULT 'ALL_ROUND',
            duration_days INTEGER NOT NULL DEFAULT 3,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            start_time TIMESTAMP WITH TIME ZONE,
            end_time TIMESTAMP WITH TIME ZONE,
            challenger_points NUMERIC DEFAULT 0,
            challenged_points NUMERIC DEFAULT 0,
            challenger_salah_points NUMERIC DEFAULT 0,
            challenged_salah_points NUMERIC DEFAULT 0,
            challenger_quran_points NUMERIC DEFAULT 0,
            challenged_quran_points NUMERIC DEFAULT 0,
            challenger_dhikr_points NUMERIC DEFAULT 0,
            challenged_dhikr_points NUMERIC DEFAULT 0,
            winner_circle_id VARCHAR(255),
            rules_note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS circle_active_calls (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            caller_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            caller_name VARCHAR(255) NOT NULL,
            caller_photo_url TEXT,
            target_user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'RINGING',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            connected_at TIMESTAMP WITH TIME ZONE,
            ended_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS idx_circle_active_calls_status ON circle_active_calls(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_circle_active_calls_target ON circle_active_calls(target_user_id, status);
        CREATE INDEX IF NOT EXISTS idx_circle_active_calls_circle ON circle_active_calls(circle_id, status);

        -- Cave Circle Moderation Tables
        ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'APPROVED';
        ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

        CREATE TABLE IF NOT EXISTS moderation_events (
            id VARCHAR(255) PRIMARY KEY,
            message_id VARCHAR(255) REFERENCES circle_messages(id) ON DELETE SET NULL,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            decision VARCHAR(50) NOT NULL,
            risk_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
            categories JSONB NOT NULL DEFAULT '[]'::jsonb,
            reason TEXT,
            message_snippet TEXT,
            classifier_id VARCHAR(100) NOT NULL DEFAULT 'RULE_ENGINE_V1',
            reviewed_by VARCHAR(255),
            reviewed_at TIMESTAMP WITH TIME ZONE,
            review_status VARCHAR(50) DEFAULT 'PENDING',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_mod_events_circle ON moderation_events(circle_id);
        CREATE INDEX IF NOT EXISTS idx_mod_events_user ON moderation_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_mod_events_status ON moderation_events(review_status, created_at DESC);
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS ai_decision VARCHAR(50);
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS ai_risk_score NUMERIC(4, 3);
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS ai_categories JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS ai_latency_ms INTEGER;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS shadow_disagreement BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS context_risk_score NUMERIC(4, 3) DEFAULT 0.000;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS context_categories JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS context_window_size INTEGER DEFAULT 0;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS quotation_detected BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS educational_context_detected BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS fiqh_context_detected BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS escalation_detected BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS rule_ai_agreement BOOLEAN DEFAULT TRUE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS contextual_disagreement BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS calibration_status VARCHAR(50) DEFAULT 'SHADOW_CALIBRATION';
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS admin_action VARCHAR(50);
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS admin_notes TEXT;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS restriction_id VARCHAR(255);
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT FALSE;
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS withdrawn_by VARCHAR(255);
        ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;

        CREATE TABLE IF NOT EXISTS user_restrictions (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            circle_id VARCHAR(255) REFERENCES circles(id) ON DELETE CASCADE,
            restriction_type VARCHAR(50) NOT NULL,
            reason TEXT NOT NULL,
            issued_by VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_user_restrictions_active ON user_restrictions(user_id, is_active);

        CREATE TABLE IF NOT EXISTS moderation_reports (
            id VARCHAR(255) PRIMARY KEY,
            circle_id VARCHAR(255) NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
            message_id VARCHAR(255) REFERENCES circle_messages(id) ON DELETE CASCADE,
            reported_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reporter_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            resolved_by VARCHAR(255),
            resolution_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS idx_mod_reports_status ON moderation_reports(status, created_at DESC);

        CREATE TABLE IF NOT EXISTS moderation_rules (
            id VARCHAR(255) PRIMARY KEY,
            rule_type VARCHAR(50) NOT NULL,
            category VARCHAR(100) NOT NULL,
            pattern TEXT NOT NULL,
            severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Alter tokens and redemptions to add donation and earned mosque fields
      await client.query(`
        ALTER TABLE tokens ADD COLUMN IF NOT EXISTS is_donated BOOLEAN DEFAULT FALSE;
        ALTER TABLE tokens ADD COLUMN IF NOT EXISTS donated_at TIMESTAMPTZ;
        ALTER TABLE tokens ADD COLUMN IF NOT EXISTS earned_mosque_id VARCHAR(255);
        ALTER TABLE tokens ADD COLUMN IF NOT EXISTS earned_mosque_name VARCHAR(255);

        ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS is_donated BOOLEAN DEFAULT FALSE;
        ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS donated_amount NUMERIC DEFAULT 0;
        ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS earned_mosque_id VARCHAR(255);
        ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS earned_mosque_name VARCHAR(255);

        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_donated BOOLEAN DEFAULT FALSE;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS donated_amount NUMERIC DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS earned_mosque_id VARCHAR(255);
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS earned_mosque_name VARCHAR(255);
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_pickup_otp VARCHAR(10);
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_picked_up BOOLEAN DEFAULT FALSE;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_delivery_otp VARCHAR(10);
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_delivered BOOLEAN DEFAULT FALSE;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_done BOOLEAN DEFAULT FALSE;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_returned BOOLEAN DEFAULT FALSE;

        ALTER TABLE online_financial_records ADD COLUMN IF NOT EXISTS is_donated BOOLEAN DEFAULT FALSE;
        ALTER TABLE online_financial_records ADD COLUMN IF NOT EXISTS donated_amount NUMERIC DEFAULT 0;
        ALTER TABLE online_financial_records ADD COLUMN IF NOT EXISTS earned_mosque_id VARCHAR(255);
        ALTER TABLE online_financial_records ADD COLUMN IF NOT EXISTS earned_mosque_name VARCHAR(255);

        -- Security and Safe Quarantine Columns for Offline Sync Anomaly Detection
        ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
        ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS security_status VARCHAR(50) DEFAULT 'verified';
        ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS risk_reasons TEXT;
        ALTER TABLE prayer_attendances ADD COLUMN IF NOT EXISTS scanned_at_original TIMESTAMPTZ;

        -- Commission Payment Status and Merchant Deletion System Columns
        ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS commission_payment_status VARCHAR(50) DEFAULT 'unpaid';
        ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS merchant_history_deleted BOOLEAN DEFAULT FALSE;

        -- Drop foreign key constraint on online_financial_records so deleting orders doesn't delete accounting records
        ALTER TABLE online_financial_records DROP CONSTRAINT IF EXISTS online_financial_records_order_id_fkey;
      `);

      // PDF Verifications Table
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS pdf_verifications (
            id VARCHAR(255) PRIMARY KEY,
            report_type VARCHAR(100) NOT NULL,
            shop_name VARCHAR(255) NOT NULL,
            generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            record_count INTEGER NOT NULL,
            total_amount NUMERIC NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb
          );
        `);
        console.log('[PostgreSQL] pdf_verifications table verified.');
      } catch (err: any) {
        console.warn('[PostgreSQL] Non-fatal error during pdf_verifications init:', err.message);
      }

      // Google Identities Table
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS google_identities (
            user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            google_sub VARCHAR(255) PRIMARY KEY,
            google_email VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_google_identities_user_id ON google_identities(user_id);
        `);
        console.log('[PostgreSQL] google_identities table verified.');
      } catch (err: any) {
        console.warn('[PostgreSQL] Non-fatal error during google_identities init:', err.message);
      }

      // Backfill missing commission payment status and merchant history deleted
      try {
        await client.query(`
          UPDATE redemptions SET commission_payment_status = 'unpaid' WHERE commission_payment_status IS NULL;
          UPDATE redemptions SET merchant_history_deleted = FALSE WHERE merchant_history_deleted IS NULL;
        `);
      } catch (err) {
        console.error('[Migration:BackfillCommissionPayment] Error:', err);
      }

      // Backfill missing donation info and mosque names for existing records (PostgreSQL only)
      if (!useSqliteFallback) {
        try {
          await client.query(`
            UPDATE redemptions r
            SET 
              is_donated = t.is_donated,
              donated_amount = CASE WHEN t.is_donated = TRUE THEN (r.bill_amount * r.discount_percent / 100) ELSE 0 END,
              earned_mosque_id = COALESCE(r.earned_mosque_id, t.earned_mosque_id),
              earned_mosque_name = COALESCE(r.earned_mosque_name, t.earned_mosque_name)
            FROM tokens t
            WHERE r.token_id = t.id AND (t.is_donated = TRUE OR (t.earned_mosque_name IS NOT NULL AND r.earned_mosque_name IS NULL));

            UPDATE redemptions r
            SET 
              earned_mosque_id = COALESCE(r.earned_mosque_id, pa.mosque_id),
              earned_mosque_name = COALESCE(r.earned_mosque_name, pa.mosque_name)
            FROM (
              SELECT DISTINCT ON (user_id) user_id, mosque_id, mosque_name
              FROM prayer_attendances
              WHERE mosque_name IS NOT NULL AND mosque_name != ''
              ORDER BY user_id, verified_at DESC
            ) pa
            WHERE r.user_id = pa.user_id AND (r.earned_mosque_name IS NULL OR r.earned_mosque_name = '');

            UPDATE online_financial_records ofr
            SET 
              earned_mosque_id = COALESCE(ofr.earned_mosque_id, pa.mosque_id),
              earned_mosque_name = COALESCE(ofr.earned_mosque_name, pa.mosque_name)
            FROM (
              SELECT DISTINCT ON (user_id) user_id, mosque_id, mosque_name
              FROM prayer_attendances
              WHERE mosque_name IS NOT NULL AND mosque_name != ''
              ORDER BY user_id, verified_at DESC
            ) pa
            WHERE ofr.user_id = pa.user_id AND (ofr.earned_mosque_name IS NULL OR ofr.earned_mosque_name = '');

            UPDATE tokens t
            SET 
              earned_mosque_id = COALESCE(t.earned_mosque_id, pa.mosque_id),
              earned_mosque_name = COALESCE(t.earned_mosque_name, pa.mosque_name)
            FROM (
              SELECT DISTINCT ON (user_id) user_id, mosque_id, mosque_name
              FROM prayer_attendances
              WHERE mosque_name IS NOT NULL AND mosque_name != ''
              ORDER BY user_id, verified_at DESC
            ) pa
            WHERE t.user_id = pa.user_id AND (t.earned_mosque_name IS NULL OR t.earned_mosque_name = '');
          `);
        } catch (backfillErr) {
          console.warn('[PostgreSQL] Optional backfill warning (ignored):', backfillErr);
        }
      }

    await client.query('COMMIT');
    console.log('[PostgreSQL] Database schema verified/initialized successfully.');

    await seedDistrictsAndUpazilas(client);
    await seedNotificationTemplates(client);

    // Only seed mock / demo data if explicitly requested via SEED_DB=true
    if (process.env.SEED_DB === 'true') {
      await seedDatabaseJsonIfEmpty(client);
    } else {
      console.log('[PostgreSQL] SEED_DB is not true. Skipping demo/seed data initialization.');
    }
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // Ignore rollback errors if already committed
    }
    console.error('[PostgreSQL] Database schema initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function seedDistrictsAndUpazilas(client: any) {
  try {
    const res = await client.query('SELECT COUNT(*) as cnt FROM districts');
    if (parseInt(res.rows[0].cnt) === 0) {
      console.log('[PostgreSQL] Seeding districts and upazilas...');
      // Load BANGLADESH_DISTRICTS dynamically to avoid top-level import issues if any
      const { BANGLADESH_DISTRICTS } = await import('../src/data/bangladeshGeo.js');
      await client.query('BEGIN');
      for (const districtData of BANGLADESH_DISTRICTS) {
        const dRes = await client.query(
          'INSERT INTO districts (name, name_bn) VALUES ($1, $2) RETURNING id',
          [districtData.district, districtData.districtBn]
        );
        const districtId = dRes.rows[0].id;

        // Default charge fallback logic
        const defaultCharge = districtData.district.toLowerCase().includes('dhaka') ? 60 : 120;
        await client.query(
          'INSERT INTO district_delivery_charges (district_name, delivery_charge) VALUES ($1, $2)',
          [districtData.district, defaultCharge]
        );

        for (const upazila of districtData.upazilas) {
          await client.query(
            'INSERT INTO upazilas (district_id, name) VALUES ($1, $2)',
            [districtId, upazila]
          );
        }
      }
      await client.query('COMMIT');
      console.log('[PostgreSQL] Districts and upazilas seeded successfully.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Seeding error:', err);
  }
}

async function seedNotificationTemplates(client: any) {
  try {
    const defaultTemplates = [
      {
        id: 'TPL-MOSQUE-SUBMITTED',
        eventType: 'MOSQUE_APPLICATION_SUBMITTED',
        name: 'Mosque Application Submitted',
        nameBn: 'মসজিদ আবেদন জমা পড়েছে',
        title: 'আপনার মসজিদের আবেদন জমা হয়েছে',
        titleBn: 'আপনার মসজিদের আবেদন জমা হয়েছে',
        message: 'Dear {{user_name}}, your mosque application for "{{mosque_name}}" has been submitted successfully.',
        messageBn: 'আসসালামু আলাইকুম {{user_name}}। আপনার জমা দেওয়া "{{mosque_name}}" মসজিদের আবেদনটি সফলভাবে সিস্টেমে জমা হয়েছে। যাচাই শেষে আপডেট জানানো হবে।',
        availableVariables: ['user_name', 'mosque_name', 'application_id', 'date']
      },
      {
        id: 'TPL-MOSQUE-APPROVED',
        eventType: 'MOSQUE_APPLICATION_APPROVED',
        name: 'Mosque Application Approved',
        nameBn: 'মসজিদ আবেদন অনুমোদিত',
        title: 'আপনার মসজিদের আবেদন গৃহীত হয়েছে',
        titleBn: 'আপনার মসজিদের আবেদন গৃহীত হয়েছে',
        message: 'Dear {{user_name}}, your application for "{{mosque_name}}" has been approved!',
        messageBn: 'আলহামদুলিল্লাহ {{user_name}}। আপনার জমা দেওয়া "{{mosque_name}}" মসজিদের আবেদনটি অনুমোদিত হয়েছে। এখন থেকে উক্ত মসজিদে কিউআর কোড স্ক্যান করে জামাত ট্র্যাকিং করতে পারবেন।',
        availableVariables: ['user_name', 'mosque_name', 'application_id', 'date']
      },
      {
        id: 'TPL-MOSQUE-REJECTED',
        eventType: 'MOSQUE_APPLICATION_REJECTED',
        name: 'Mosque Application Rejected',
        nameBn: 'মসজিদ আবেদন প্রত্যাখ্যাত',
        title: 'আপনার মসজিদের আবেদন পর্যালোচনা করা হয়েছে',
        titleBn: 'আপনার মসজিদের আবেদন পর্যালোচনা করা হয়েছে',
        message: 'Dear {{user_name}}, your application for "{{mosque_name}}" was not approved. Reason: {{rejection_reason}}',
        messageBn: 'আসসালামু আলাইকুম {{user_name}}। আপনার জমা দেওয়া "{{mosque_name}}" মসজিদের আবেদনটি এই মুহূর্তে অনুমোদন করা সম্ভব হয়নি। কারণ: {{rejection_reason}}',
        availableVariables: ['user_name', 'mosque_name', 'application_id', 'rejection_reason', 'date']
      },
      {
        id: 'TPL-TOKEN-EARNED',
        eventType: 'TOKEN_EARNED',
        name: 'Token Earned',
        nameBn: 'টোকেন অর্জিত হয়েছে',
        title: 'আপনি একটি নতুন টোকেন অর্জন করেছেন!',
        titleBn: 'আপনি একটি নতুন টোকেন অর্জন করেছেন!',
        message: 'Congratulations {{user_name}}! You earned a {{token_type}} token.',
        messageBn: 'মাশাআল্লাহ {{user_name}}! জামাতে নিয়মিত নামাজের ধারাবাহিকতায় আপনি ১টি {{token_type}} টোকেন অর্জন করেছেন।',
        availableVariables: ['user_name', 'token_type', 'date']
      },
      {
        id: 'TPL-TOKEN-UPGRADED',
        eventType: 'TOKEN_UPGRADED',
        name: 'Token Upgraded',
        nameBn: 'টোকেন আপগ্রেড হয়েছে',
        title: 'আপনার টোকেন আপগ্রেড করা হয়েছে!',
        titleBn: 'আপনার টোকেন আপগ্রেড করা হয়েছে!',
        message: 'Great news {{user_name}}! Your token was upgraded to {{token_type}}.',
        messageBn: 'আলহামদুলিল্লাহ {{user_name}}! আপনার জামাতের ওয়াক্ত বৃদ্ধির ফলে টোকেনটি {{token_type}} টোকেনে আপগ্রেড হয়েছে।',
        availableVariables: ['user_name', 'token_type', 'date']
      },
      {
        id: 'TPL-REDEMPTION-SUCCESS',
        eventType: 'REDEMPTION_SUCCESSFUL',
        name: 'Redemption Successful',
        nameBn: 'রিডেম্পশন সফল হয়েছে',
        title: 'রিডেম্পশন সফল হয়েছে!',
        titleBn: 'রিডেম্পশন সফল হয়েছে!',
        message: 'Dear {{user_name}}, your redemption of {{token_type}} token at {{shop_name}} was successful.',
        messageBn: 'আলহামদুলিল্লাহ {{user_name}}। "{{shop_name}}" এ আপনার {{token_type}} টোকেন ব্যবহার করে রিডেম্পশন সফলভাবে সম্পন্ন হয়েছে।',
        availableVariables: ['user_name', 'token_type', 'shop_name', 'date']
      },
      {
        id: 'TPL-REDEMPTION-FAILED',
        eventType: 'REDEMPTION_FAILED',
        name: 'Redemption Failed',
        nameBn: 'রিডেম্পশন ব্যর্থ হয়েছে',
        title: 'রিডেম্পশন সম্পন্ন করা সম্ভব হয়নি',
        titleBn: 'রিডেম্পশন সম্পন্ন করা সম্ভব হয়নি',
        message: 'Dear {{user_name}}, your redemption attempt at {{shop_name}} failed.',
        messageBn: 'আসসালামু আলাইকুম {{user_name}}। "{{shop_name}}" এ আপনার রিডেম্পশন প্রক্রিয়াটি সম্পন্ন করা সম্ভব হয়নি।',
        availableVariables: ['user_name', 'shop_name', 'date']
      },
      {
        id: 'TPL-COUPON-AVAILABLE',
        eventType: 'COUPON_AVAILABLE',
        name: 'Coupon Available',
        nameBn: 'নতুন কুপন অফার',
        title: 'নতুন ডিসকাউন্ট কুপন পাওয়া যাচ্ছে!',
        titleBn: 'নতুন ডিসকাউন্ট কুপন পাওয়া যাচ্ছে!',
        message: 'Use coupon {{coupon_name}} for special discounts!',
        messageBn: 'বিশেষ ডিসকাউন্ট কুপন "{{coupon_name}}" অফার পাওয়া যাচ্ছে! পার্টনার শপ থেকে অফার নিতে কুপনটি ব্যবহার করুন।',
        availableVariables: ['user_name', 'coupon_name', 'date']
      },
      {
        id: 'TPL-COUPON-USED',
        eventType: 'COUPON_USED',
        name: 'Coupon Used',
        nameBn: 'কুপন ব্যবহার করা হয়েছে',
        title: 'কুপন ব্যবহার সম্পন্ন হয়েছে',
        titleBn: 'কুপন ব্যবহার সম্পন্ন হয়েছে',
        message: 'Dear {{user_name}}, coupon {{coupon_name}} was used at {{shop_name}}.',
        messageBn: 'ধন্যবাদ {{user_name}}! আপনার "{{coupon_name}}" কুপনটি "{{shop_name}}" এ রিডিম করা হয়েছে।',
        availableVariables: ['user_name', 'coupon_name', 'shop_name', 'date']
      },
      {
        id: 'TPL-NEW-PARTNER-SHOP',
        eventType: 'NEW_PARTNER_SHOP',
        name: 'New Partner Shop',
        nameBn: 'নতুন পার্টনার শপ',
        title: 'নতুন পার্টনার শপ যুক্ত হয়েছে!',
        titleBn: 'নতুন পার্টনার শপ যুক্ত হয়েছে!',
        message: 'Welcome {{shop_name}} to Cave Companions!',
        messageBn: 'আমাদের নেটওয়ার্কে নতুন পার্টনার শপ "{{shop_name}}" যুক্ত হয়েছে। আপনার টোকেন ব্যবহার করে ছাড় নিন।',
        availableVariables: ['user_name', 'shop_name', 'date']
      },
      {
        id: 'TPL-SYSTEM-ANNOUNCEMENT',
        eventType: 'SYSTEM_ANNOUNCEMENT',
        name: 'System Announcement',
        nameBn: 'সিস্টেম ঘোষণা',
        title: 'কেভ কম্প্যানিয়নস বিশেষ ঘোষণা',
        titleBn: 'কেভ কম্প্যানিয়নস বিশেষ ঘোষণা',
        message: 'Announcement for {{user_name}}',
        messageBn: 'আসসালামু আলাইকুম {{user_name}}। কেভ কম্প্যানিয়নস অ্যাপের বিশেষ আপডেট পেতে থাকুন।',
        availableVariables: ['user_name', 'date']
      }
    ];

    for (const tpl of defaultTemplates) {
      await client.query(
        `INSERT INTO notification_templates 
        (id, event_type, name, name_bn, title, title_bn, message, message_bn, is_active, available_variables)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
        ON CONFLICT (event_type) DO NOTHING`,
        [
          tpl.id,
          tpl.eventType,
          tpl.name,
          tpl.nameBn,
          tpl.title,
          tpl.titleBn,
          tpl.message,
          tpl.messageBn,
          JSON.stringify(tpl.availableVariables)
        ]
      );
    }
    console.log('[PostgreSQL] Default notification templates verified.');
  } catch (err) {
    console.error('[PostgreSQL] Failed to seed notification templates:', err);
  }
}

async function seedDatabaseJsonIfEmpty(client: any) {
  try {
    const bcrypt = await import('bcryptjs');
    const customHash = bcrypt.default.hashSync('123456', 10);

    const dbPath = path.join(process.cwd(), 'data', 'database.json');
    if (!fs.existsSync(dbPath)) {
      console.log('[PostgreSQL] database.json not found at:', dbPath);
      return;
    }

    console.log('[PostgreSQL] Syncing and seeding users and other data from database.json...');
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // 1. Users - Seed from database.json only if users exist in the file
    if (Array.isArray(data.users) && data.users.length > 0) {
      const { normalizePhoneNumber } = await import('./db.js');
      
      for (const u of data.users) {
        const normPhone = normalizePhoneNumber(u.phone);
        
        // Check if user already exists by phone
        const existingRes = await client.query('SELECT id, password_hash FROM users WHERE phone = $1', [normPhone]);
        const finalHash = u.passwordHash || customHash;

        if (existingRes.rows.length > 0) {
          const dbUser = existingRes.rows[0];
          if (!dbUser.password_hash) {
            console.log(`[PostgreSQL] Repairing/updating password hash for user with phone ${normPhone}...`);
            await client.query(`
              UPDATE users 
              SET password_hash = $1, is_verified = TRUE, status = 'active'
              WHERE id = $2
            `, [finalHash, dbUser.id]);
          }
        } else {
          // Verify ID is not taken to prevent primary key collision
          const idRes = await client.query('SELECT id FROM users WHERE id = $1', [u.id]);
          const finalId = idRes.rows.length > 0 ? `USR-${Math.random().toString(36).substring(2, 11).toUpperCase()}` : u.id;
          
          await client.query(`
            INSERT INTO users (id, full_name, phone, email, password_hash, gender, age, marital_status, is_verified, photo_url, status, created_at, last_login_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            finalId, u.fullName || u.name, normPhone, u.email || null, finalHash,
            (u.gender || 'male').toLowerCase(), u.age || null, u.maritalStatus || null, u.isVerified !== false,
            u.photoUrl || null, u.status || 'active', u.createdAt || new Date().toISOString(),
            u.lastLoginAt || new Date().toISOString()
          ]);
        }
      }
    }

    // 2. Mosques
    if (Array.isArray(data.mosques) && data.mosques.length > 0) {
      for (const m of data.mosques) {
        await client.query(`
          INSERT INTO mosques (id, name, name_bn, address, area, district, qr_identifier, status, created_at, imam_name, contact_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          m.id, m.name, m.nameBn || m.name, m.address, m.area, m.district,
          m.qrIdentifier, m.status || 'active', m.createdAt || new Date().toISOString(),
          m.imamName || null, m.contactNumber || null
        ]);
      }
    }

    // 3. Attendances
    if (Array.isArray(data.attendances) && data.attendances.length > 0) {
      for (const a of data.attendances) {
        await client.query(`
          INSERT INTO prayer_attendances (id, user_id, mosque_id, mosque_name, prayer_type, date, verified_at, status, qr_payload)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          a.id, a.userId, a.mosqueId, a.mosqueName, a.prayerType, a.date,
          a.verifiedAt || new Date().toISOString(), a.status || 'verified', a.qrPayload || ''
        ]);
      }
    }

    // 4. Shops
    if (Array.isArray(data.shops) && data.shops.length > 0) {
      for (const s of data.shops) {
        await client.query(`
          INSERT INTO shops (id, name, name_bn, owner_id, phone, address, area, district, latitude, longitude, category, description, logo_url, photo_url, opening_hours, status, qr_identifier, qr_secret, gold_discount, silver_discount, bronze_discount, commission_rate, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (id) DO NOTHING
        `, [
          s.id, s.name, s.nameBn || s.name, s.ownerId, s.phone, s.address, s.area, s.district,
          s.latitude || 0, s.longitude || 0, s.category, s.description || '', s.logoUrl || null, s.photoUrl || null,
          s.openingHours || '', s.status || 'ACTIVE', s.qrIdentifier, s.qrSecret,
          s.goldDiscount ?? 15, s.silverDiscount ?? 10, s.bronzeDiscount ?? 7, s.commissionRate ?? 3.0,
          s.createdAt || new Date().toISOString(), s.updatedAt || new Date().toISOString()
        ]);
      }
    }

    // 5. Merchants
    if (Array.isArray(data.merchants) && data.merchants.length > 0) {
      for (const m of data.merchants) {
        await client.query(`
          INSERT INTO merchants (id, name, phone, pin, shop_id, role, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          m.id, m.name, m.phone, m.pin, m.shopId, m.role || 'MERCHANT',
          m.status || 'active', m.createdAt || new Date().toISOString()
        ]);
      }
    }

    // 6. Nasiha
    if (Array.isArray(data.nasiha) && data.nasiha.length > 0) {
      for (const n of data.nasiha) {
        await client.query(`
          INSERT INTO nasiha (id, text_bn, source_bn, active, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [
          n.id, n.textBn, n.sourceBn || '', n.active !== false, n.createdAt || new Date().toISOString()
        ]);
      }
    }

    console.log('[PostgreSQL] database.json seed completed successfully.');
  } catch (err) {
    console.error('[PostgreSQL] Failed to seed from database.json:', err);
  }
}
