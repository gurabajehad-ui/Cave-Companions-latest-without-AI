import { pool } from '../pg';
import crypto from 'crypto';

export interface PDFVerification {
  id: string;
  reportType: string;
  shopName: string;
  generatedAt: Date;
  recordCount: number;
  totalAmount: number;
  metadata: any;
}

export const PDFVerificationService = {
  async createVerification(reportType: string, shopName: string, recordCount: number, totalAmount: number, metadata: any = {}): Promise<string> {
    const id = 'VRF-' + crypto.randomBytes(16).toString('hex').toUpperCase();
    await pool.query(
      `INSERT INTO pdf_verifications (id, report_type, shop_name, record_count, total_amount, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, reportType, shopName, recordCount, totalAmount, JSON.stringify(metadata)]
    );
    return id;
  },

  async getVerification(id: string): Promise<PDFVerification | null> {
    const res = await pool.query(`SELECT * FROM pdf_verifications WHERE id = $1`, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      reportType: row.report_type,
      shopName: row.shop_name,
      generatedAt: row.generated_at,
      recordCount: row.record_count,
      totalAmount: Number(row.total_amount),
      metadata: row.metadata
    };
  }
};
