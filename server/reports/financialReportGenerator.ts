import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { RedemptionRecord } from '../db';

const getDirName = () => {
  try {
    if (typeof __dirname !== 'undefined') return __dirname;
  } catch {}
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {}
  return process.cwd();
};

export interface FinancialReportData {
  shopName: string;
  shopAddress?: string;
  periodLabel: string;
  generatedAt: string;
  hideInternalFinances?: boolean; // Set to true for Merchant reports
  isOnlineReport?: boolean; // Set to true for Online Accounts report
  qrUrl?: string;
  verificationId?: string;
  summary: {
    totalAmount: number;
    totalGrossCommission?: number;
    totalTokenBenefits?: number;
    totalCouponDiscounts?: number;
    totalNetIncome?: number;
    totalMerchantPayout?: number;
    totalDonatedAmount?: number;
    totalCommission?: number; // Legacy/Fallback
    totalCount: number;
  };
  transactions: any[];
}

/**
 * Format currency in BDT format
 */
export function formatBDT(amount: number): string {
  return `৳ ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Build human-readable period label from date bounds
 */
export function buildPeriodLabel(dateFrom?: string, dateTo?: string): string {
  if (dateFrom && dateTo) {
    try {
      const d1 = new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const d2 = new Date(dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${d1} to ${d2}`;
    } catch {
      return `${dateFrom} to ${dateTo}`;
    }
  } else if (dateFrom) {
    try {
      const d1 = new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return `From ${d1}`;
    } catch {
      return `From ${dateFrom}`;
    }
  } else if (dateTo) {
    try {
      const d2 = new Date(dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return `Until ${d2}`;
    } catch {
      return `Until ${dateTo}`;
    }
  }
  return 'All Time';
}

/**
 * Build clean report file name
 */
export function buildReportFilename(shopName: string, dateFrom?: string, dateTo?: string, ext: string = 'pdf'): string {
  const cleanName = (shopName || 'shop')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'shop';

  let datePart = 'all-time';
  if (dateFrom && dateTo) {
    const fromStr = dateFrom.slice(0, 10);
    const toStr = dateTo.slice(0, 10);
    datePart = `${fromStr}-to-${toStr}`;
  } else if (dateFrom) {
    datePart = `from-${dateFrom.slice(0, 10)}`;
  } else if (dateTo) {
    datePart = `until-${dateTo.slice(0, 10)}`;
  }

  const cleanExt = ext.toLowerCase().replace('.', '');
  return `cave-companions-${cleanName}-${datePart}.${cleanExt}`;
}

/**
 * Format date string nicely for report
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Unicode-compatible Font Registry for PDF generation
 * Loads and registers full Unicode font families supporting Latin, Bengali, Numbers, and Symbols.
 */
interface RegisteredFonts {
  regular: string;
  bold: string;
  isCustomUnicode: boolean;
}

class PDFReportFontRegistry {
  private static resolvedFonts: { regularPath: string | null; boldPath: string | null } | null = null;

  public static resolve(): { regularPath: string | null; boldPath: string | null } {
    if (this.resolvedFonts) {
      return this.resolvedFonts;
    }

    const currentDir = getDirName();
    const candidateDirs = [
      path.join(process.cwd(), 'server/assets/fonts'),
      path.join(process.cwd(), 'public/fonts'),
      path.join(process.cwd(), 'dist/fonts'),
      path.join(currentDir, 'assets/fonts'),
      path.join(currentDir, '../assets/fonts'),
      path.join(currentDir, 'fonts'),
      '/tmp',
      '/usr/share/fonts/truetype/freefont'
    ];

    let regularPath: string | null = null;
    let boldPath: string | null = null;

    // 1. Primary choice: Hind Siliguri (Full Unicode supporting English A-Z, Bengali, Numbers, Symbols)
    for (const dir of candidateDirs) {
      if (!dir) continue;
      const reg = path.join(dir, 'HindSiliguri-Regular.ttf');
      const bold = path.join(dir, 'HindSiliguri-Bold.ttf');
      if (!regularPath && fs.existsSync(reg)) {
        regularPath = reg;
        console.log(`PDF Export: Found regular font at ${reg}`);
      }
      if (!boldPath && fs.existsSync(bold)) {
        boldPath = bold;
        console.log(`PDF Export: Found bold font at ${bold}`);
      }
    }

    // 2. Secondary choice: Noto Sans Bengali Full (Unsubsetted Latin + Bengali Unicode)
    if (!regularPath) {
      for (const dir of candidateDirs) {
        if (!dir) continue;
        const full = path.join(dir, 'NotoSansBengali-Full.ttf');
        if (fs.existsSync(full)) {
          regularPath = full;
          if (!boldPath) boldPath = full;
          console.log(`PDF Export: Found Noto Sans Full font at ${full}`);
          break;
        }
      }
    }

    // 3. Fallbacks: NotoSansBengali standard or FreeSerif
    if (!regularPath) {
      for (const dir of candidateDirs) {
        const reg = path.join(dir, 'NotoSansBengali-Regular.ttf');
        const bold = path.join(dir, 'NotoSansBengali-Bold.ttf');
        if (!regularPath && fs.existsSync(reg)) regularPath = reg;
        if (!boldPath && fs.existsSync(bold)) boldPath = bold;
      }
    }

    if (!regularPath) {
      for (const dir of candidateDirs) {
        const freeReg = path.join(dir, 'FreeSerif.ttf');
        const freeBold = path.join(dir, 'FreeSerifBold.ttf');
        if (!regularPath && fs.existsSync(freeReg)) regularPath = freeReg;
        if (!boldPath && fs.existsSync(freeBold)) boldPath = freeBold;
      }
    }

    // Apply fontkit GPOS patch for Bengali mark anchors
    this.ensureFontkitPatched(regularPath || boldPath || undefined);

    if (!regularPath && !boldPath) {
      const errMsg = `Critical Error: Missing required fonts for PDF generation. None of the Unicode fonts (HindSiliguri, NotoSansBengali) were found in the deployed asset directories. Checked paths: ${candidateDirs.join(', ')}`;
      console.error(errMsg);
      throw new Error(errMsg);
    }

    this.resolvedFonts = { regularPath, boldPath };
    return this.resolvedFonts;
  }

  /**
   * Registers Unicode fonts onto the PDFDocument instance and sets the document default font
   */
  public static registerToDocument(doc: PDFKit.PDFDocument): RegisteredFonts {
    const { regularPath, boldPath } = this.resolve();

    if (regularPath) {
      doc.registerFont('Unicode-Regular', regularPath);
      doc.registerFont('Bengali', regularPath);
    }
    if (boldPath) {
      doc.registerFont('Unicode-Bold', boldPath);
      doc.registerFont('Bengali-Bold', boldPath);
    } else if (regularPath) {
      doc.registerFont('Unicode-Bold', regularPath);
      doc.registerFont('Bengali-Bold', regularPath);
    }

    const regular = regularPath ? 'Unicode-Regular' : 'Helvetica';
    const bold = (boldPath || regularPath) ? 'Unicode-Bold' : 'Helvetica-Bold';

    // Set primary base font
    doc.font(regular);

    // Patch PDFKit's internal embedded fontkit prototype directly from this doc's loaded font
    this.patchPDFKitInternal(doc);

    return {
      regular,
      bold,
      isCustomUnicode: !!regularPath
    };
  }

  /**
   * Safely patch PDFKit internal fontkit GPOS processor to prevent null anchor / xCoordinate errors
   */
  public static patchPDFKitInternal(doc: any) {
    try {
      const fontObj = doc && doc._font && doc._font.font;
      if (fontObj && fontObj._layoutEngine && fontObj._layoutEngine.engine && fontObj._layoutEngine.engine.GPOSProcessor) {
        const proto = Object.getPrototypeOf(fontObj._layoutEngine.engine.GPOSProcessor);
        if (proto && !proto._isPatchedForBengali) {
          // Patch 1: getAnchor safety (Prevents Cannot read properties of null reading 'xCoordinate')
          const origGetAnchor = proto.getAnchor;
          proto.getAnchor = function (anchor: any) {
            if (!anchor) return { x: 0, y: 0 };
            try {
              const res = origGetAnchor.call(this, anchor);
              return res || { x: 0, y: 0 };
            } catch {
              return { x: 0, y: 0 };
            }
          };

          // Patch 2: applyAnchor safety
          const origApplyAnchor = proto.applyAnchor;
          proto.applyAnchor = function (markRecord: any, baseAnchor: any, baseGlyphIndex: any) {
            if (!markRecord || !baseAnchor || !markRecord.markAnchor) return;
            try {
              return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
            } catch {
              return;
            }
          };

          // Patch 3: General GPOS processing safety
          const origProcess = proto.process;
          if (origProcess) {
            proto.process = function (...args: any[]) {
              try {
                return origProcess.apply(this, args);
              } catch {
                return args[0];
              }
            };
          }

          proto._isPatchedForBengali = true;
        }
      }
    } catch (err) {
      console.error('PDF Export: Failed to patch PDFKit internal layout engine:', err);
    }
  }

  /**
   * Safely patch fontkit GPOS processor to prevent null anchor errors on Indic / Bengali scripts
   */
  private static ensureFontkitPatched(fontPath?: string) {
    try {
      let fontkit: any;
      try {
        fontkit = require('fontkit');
      } catch {
        try {
          const pdfkitPath = require.resolve('pdfkit');
          const pdfkitDir = path.dirname(pdfkitPath);
          fontkit = require(path.join(pdfkitDir, 'node_modules/fontkit'));
        } catch {
          return;
        }
      }
      if (!fontkit || (typeof fontkit.openSync !== 'function' && typeof fontkit.open !== 'function')) return;

      const patchFontObject = (f: any) => {
        if (!f) return;
        const le = f._layoutEngine;
        if (le && le.engine && le.engine.GPOSProcessor) {
          const gposProto = Object.getPrototypeOf(le.engine.GPOSProcessor);
          if (gposProto && !gposProto._isPatchedForBengali) {
            // Patch 1: getAnchor safety (Prevents Cannot read properties of null reading 'xCoordinate')
            const origGetAnchor = gposProto.getAnchor;
            gposProto.getAnchor = function (anchor: any) {
              if (!anchor) return { x: 0, y: 0 };
              try {
                return origGetAnchor.call(this, anchor) || { x: 0, y: 0 };
              } catch {
                return { x: 0, y: 0 };
              }
            };

            // Patch 2: applyAnchor safety
            const origApplyAnchor = gposProto.applyAnchor;
            gposProto.applyAnchor = function (markRecord: any, baseAnchor: any, baseGlyphIndex: any) {
              if (!markRecord || !baseAnchor || !markRecord.markAnchor) return;
              try {
                return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
              } catch {
                return;
              }
            };

            // Patch 3: General GPOS processing safety
            const origProcess = gposProto.process;
            if (origProcess) {
              gposProto.process = function (...args: any[]) {
                try {
                  return origProcess.apply(this, args);
                } catch {
                  return args[0];
                }
              };
            }

            gposProto._isPatchedForBengali = true;
          }
        }
      };

      if (fontPath && fs.existsSync(fontPath)) {
        try {
          const dummyFont = fontkit.openSync(fontPath);
          patchFontObject(dummyFont);
        } catch (err) {
          console.error('PDF Export: Failed to apply fontkit patch via openSync:', err);
        }
      }
    } catch (err) {
      console.error('PDF Export: Critical error during fontkit patching:', err);
    }
  }
}


/**
 * Generate CSV buffer with UTF-8 BOM
 */
export function generateCSVReport(data: FinancialReportData): Buffer {
  const lines: string[] = [];

  // UTF-8 BOM for proper Excel Unicode compatibility
  const BOM = '\uFEFF';

  // Header metadata
  lines.push(`"CAVE COMPANIONS - FINANCIAL / TRANSACTION REPORT"`);
  lines.push(`"Shop Name:","${(data.shopName || '').replace(/"/g, '""')}"`);
  lines.push(`"Period:","${(data.periodLabel || '').replace(/"/g, '""')}"`);
  lines.push(`"Generated Date & Time:","${(data.generatedAt || '').replace(/"/g, '""')}"`);
  lines.push('');
  
  // Financial Summary Section
  lines.push(`"FINANCIAL SUMMARY"`);
  lines.push(`"Total Redemption Amount (BDT)","${data.summary.totalAmount}"`);
  
  if (!data.hideInternalFinances) {
    lines.push(`"Total Gross Commission Pool (BDT)","${data.summary.totalGrossCommission || data.summary.totalCommission || 0}"`);
    lines.push(`"Total Token Benefits Given (BDT)","${data.summary.totalTokenBenefits || 0}"`);
    lines.push(`"Total Cave Companions Net Income (BDT)","${data.summary.totalNetIncome || 0}"`);
  } else {
    lines.push(`"Total Token Discounts Given (BDT)","${data.summary.totalTokenBenefits || 0}"`);
    lines.push(`"Total Cave Companions Net Income (BDT)","${data.summary.totalNetIncome || 0}"`);
  }
  
  lines.push(`"Total Merchant Payout Amount (BDT)","${data.summary.totalMerchantPayout || data.summary.totalAmount - (data.summary.totalTokenBenefits || 0)}"`);
  lines.push(`"Total Number of Redemptions","${data.summary.totalCount}"`);
  lines.push('');

  // Transaction Details Table
  lines.push(`"TRANSACTION DETAILS"`);
  if (data.isOnlineReport) {
    lines.push(`"Order Number","Shop Name","Product Name","Quantity","Original Price (BDT)","Token Discount (BDT)","Coupon Code","Coupon Discount (BDT)","Donated Amount (BDT)","Mosque Name","Customer Paid (BDT)","Commission Rate (%)","Shop Receives (BDT)","CC Net Income (BDT)","Delivery Date"`);
  } else if (!data.hideInternalFinances) {
    lines.push(`"Date & Time","User Name","User Phone","Token Type","Original Bill (BDT)","Gross Commission Pool (BDT)","Token Discount (BDT)","Donated Amount (BDT)","Earned Mosque Name","User Paid (BDT)","Merchant Payout (BDT)","Cave Companions Net Income (BDT)","Status"`);
  } else {
    lines.push(`"Date & Time","User Name","Token Type","Original Bill (BDT)","Token Discount (BDT)","Donated Amount (BDT)","Earned Mosque Name","User Paid (BDT)","Merchant Payout (BDT)","Cave Companions Net Income (BDT)","Status"`);
  }

  if (data.transactions.length === 0) {
    lines.push(`"No financial records found for the selected period."`);
  } else {
    for (const tx of data.transactions) {
      const date = formatDate(tx.createdAt);
      const userName = (tx.userName || 'Customer').replace(/"/g, '""');
      const userPhone = (tx.userPhone || 'N/A').replace(/"/g, '""');
      const bill = tx.purchaseAmount || 0;
      const tokenType = tx.tokenType || 'TOKEN';
      const status = tx.status || 'COMPLETED';
      const gross = tx.grossCommissionAmount || 0;
      const discount = tx.discountAmount || 0;
      const userPaid = tx.finalPayableAmount != null ? tx.finalPayableAmount : (bill - discount);
      const net = tx.caveCompanionsNetIncome || 0;
      const payout = tx.merchantPayoutAmount != null ? tx.merchantPayoutAmount : (bill - gross);
      const donated = tx.isDonated ? (tx.donatedAmount || 0) : 0;
      const mosque = (tx.earnedMosqueName || '-').replace(/"/g, '""');

      if (data.isOnlineReport) {
        const orderNum = (tx.orderNumber || tx.userId || 'N/A').replace(/"/g, '""');
        const shopName = (tx.shopName || 'N/A').replace(/"/g, '""');
        const prodName = (tx.productName || 'Product').replace(/"/g, '""');
        const qty = tx.quantity || 1;
        const commRate = tx.commissionRate || 0;
        const delivDate = tx.redemptionDate || date;
        const cCode = (tx.couponCode || 'N/A').replace(/"/g, '""');
        const cDiscount = tx.couponDiscountAmount || 0;
        lines.push(`"${orderNum}","${shopName}","${prodName}","${qty}","${bill}","${discount}","${cCode}","${cDiscount}","${donated}","${mosque}","${userPaid}","${commRate}%","${payout}","${net}","${delivDate}"`);
      } else if (!data.hideInternalFinances) {
        lines.push(`"${date}","${userName}","${userPhone}","${tokenType}","${bill}","${gross}","${discount}","${donated}","${mosque}","${userPaid}","${payout}","${net}","${status}"`);
      } else {
        lines.push(`"${date}","${userName}","${tokenType}","${bill}","${discount}","${donated}","${mosque}","${userPaid}","${payout}","${net}","${status}"`);
      }
    }
  }

  const csvContent = BOM + lines.join('\r\n');
  return Buffer.from(csvContent, 'utf-8');
}

/**
 * Generate Excel (XLSX) workbook buffer
 */
export function generateExcelReport(data: FinancialReportData): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ['CAVE COMPANIONS - FINANCIAL REPORT'],
    [],
    ['Shop Name', data.shopName],
    ['Report Title', data.isOnlineReport ? 'Online Orders Accounts Report' : 'Financial / Transaction Report'],
    ['Selected Date Range', data.periodLabel],
    ['Report Generated Date & Time', data.generatedAt],
    [],
    ['FINANCIAL SUMMARY', ''],
    ['Total Sales / Amount (BDT)', data.summary.totalAmount],
  ];

  if (data.isOnlineReport || !data.hideInternalFinances) {
    summaryRows.push(['Total Gross Commission Pool (BDT)', data.summary.totalGrossCommission || data.summary.totalCommission || 0]);
    summaryRows.push(['Total Token Benefits Given (BDT)', data.summary.totalTokenBenefits || 0]);
    summaryRows.push(['Total Donated Amount (BDT)', data.summary.totalDonatedAmount || 0]);
    summaryRows.push(['Total Cave Companions Net Income (BDT)', data.summary.totalNetIncome || 0]);
  } else {
    summaryRows.push(['Total Token Discounts Given (BDT)', data.summary.totalTokenBenefits || 0]);
    summaryRows.push(['Total Donated Amount (BDT)', data.summary.totalDonatedAmount || 0]);
    summaryRows.push(['Total Cave Companions Net Income (BDT)', data.summary.totalNetIncome || 0]);
  }

  summaryRows.push(['Total Merchant Payout Amount (BDT)', data.summary.totalMerchantPayout || data.summary.totalAmount - (data.summary.totalTokenBenefits || 0)]);
  summaryRows.push(['Total Number of Records', data.summary.totalCount]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  
  // Set column widths for summary
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Sheet 2: Transactions
  let txHeaders: string[] = [];
  if (data.isOnlineReport) {
    txHeaders = [
      'Order Number',
      'Shop Name',
      'Product Name',
      'Quantity',
      'Original Price (BDT)',
      'Token Discount (BDT)',
      'Coupon Code',
      'Coupon Discount (BDT)',
      'Donated Amount (BDT)',
      'Mosque Name',
      'Customer Paid (BDT)',
      'Commission Rate (%)',
      'Shop Receives (BDT)',
      'CC Net Income (BDT)',
      'Delivery Date'
    ];
  } else if (!data.hideInternalFinances) {
    txHeaders = [
      'Date & Time',
      'User Name',
      'User Phone',
      'Token Type',
      'Original Bill (BDT)',
      'Gross Commission Pool (BDT)',
      'Token Discount (BDT)',
      'Donated Amount (BDT)',
      'Earned Mosque Name',
      'User Paid (BDT)',
      'Merchant Payout (BDT)',
      'CC Net Income (BDT)',
      'Status'
    ];
  } else {
    txHeaders = [
      'Date & Time',
      'User Name',
      'Token Type',
      'Original Bill (BDT)',
      'Token Discount (BDT)',
      'Donated Amount (BDT)',
      'Earned Mosque Name',
      'User Paid (BDT)',
      'Merchant Payout (BDT)',
      'CC Net Income (BDT)',
      'Status'
    ];
  }

  const txRows: any[][] = [txHeaders];

  if (data.transactions.length === 0) {
    txRows.push(['No financial records found for the selected period.']);
  } else {
    for (const tx of data.transactions) {
      const bill = tx.purchaseAmount || 0;
      const gross = tx.grossCommissionAmount || 0;
      const discount = tx.discountAmount || 0;
      const userPaid = tx.finalPayableAmount != null ? tx.finalPayableAmount : (bill - discount);
      const net = tx.caveCompanionsNetIncome || 0;
      const payout = tx.merchantPayoutAmount != null ? tx.merchantPayoutAmount : (bill - gross);
      const donated = tx.isDonated ? (tx.donatedAmount || 0) : 0;
      const mosque = tx.earnedMosqueName || '-';

      if (data.isOnlineReport) {
        txRows.push([
          tx.orderNumber || tx.userId || 'N/A',
          tx.shopName || 'N/A',
          tx.productName || 'Product',
          tx.quantity || 1,
          bill,
          discount,
          tx.couponCode || 'N/A',
          tx.couponDiscountAmount || 0,
          donated,
          mosque,
          userPaid,
          `${tx.commissionRate || 0}%`,
          payout,
          net,
          tx.redemptionDate || formatDate(tx.createdAt)
        ]);
      } else if (!data.hideInternalFinances) {
        txRows.push([
          formatDate(tx.createdAt),
          tx.userName || 'Customer',
          tx.userPhone || 'N/A',
          tx.tokenType || 'TOKEN',
          bill,
          gross,
          discount,
          donated,
          mosque,
          userPaid,
          payout,
          net,
          tx.status || 'COMPLETED'
        ]);
      } else {
        txRows.push([
          formatDate(tx.createdAt),
          tx.userName || 'Customer',
          tx.tokenType || 'TOKEN',
          bill,
          discount,
          donated,
          mosque,
          userPaid,
          payout,
          net,
          tx.status || 'COMPLETED'
        ]);
      }
    }
  }

  const wsTransactions = XLSX.utils.aoa_to_sheet(txRows);
  
  wsTransactions['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

/**
 * Generate Multi-Page Landscape PDF Document Buffer with Full Unicode Bengali Support
 */
export async function generatePDFReport(data: FinancialReportData): Promise<Buffer> {
  let qrCodeBuffer: Buffer | null = null;
  if (data.qrUrl) {
    try {
      qrCodeBuffer = await QRCode.toBuffer(data.qrUrl, {
        margin: 1,
        width: 70,
        errorCorrectionLevel: 'M'
      });
    } catch (qrErr) {
      console.error('[PDF Generation] Failed to generate QR code:', qrErr);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      // 1. Setup Landscape A4 Document with adequate printable margins
      const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 2. Register Unicode Font Registry supporting Latin + Bengali characters
      const registeredFonts = PDFReportFontRegistry.registerToDocument(doc);
      const fontRegular = registeredFonts.regular;
      const fontBold = registeredFonts.bold;

      // Sanitization helper to prevent PDFKit/fontkit crashes on null/undefined inputs
      const safeText = (val: any, fallback: string = ''): string => {
        if (val === null || val === undefined) return fallback;
        if (typeof val === 'string') return val;
        try {
          return String(val);
        } catch {
          return fallback;
        }
      };

      // Theme Colors
      const primaryColor = '#0f172a'; // Slate 900
      const accentColor = '#d97706'; // Amber 600
      const darkEmerald = '#047857'; // Emerald 700
      const textColor = '#334155'; // Slate 700
      const mutedColor = '#64748b'; // Slate 500
      const borderColor = '#cbd5e1'; // Slate 300
      const tableHeaderBg = '#1e293b'; // Slate 800

      // Page Dimensions (A4 Landscape = 841.89 x 595.28 pt)
      const leftMargin = doc.page.margins.left;
      const rightMargin = doc.page.margins.right;
      const pageWidth = doc.page.width - leftMargin - rightMargin; // ~781.89 pt

      // -------------------------------------------------------------
      // HEADER SECTION
      // -------------------------------------------------------------
      doc.rect(leftMargin, 25, pageWidth, 4).fill(accentColor);

      doc.y = 35;
      doc.font(fontBold).fontSize(16).fillColor(primaryColor).text(safeText(data.shopName, 'CAVE COMPANIONS'), leftMargin, doc.y, { align: 'left' });
      doc.font(fontBold).fontSize(11).fillColor(accentColor).text(safeText(data.periodLabel, 'Financial Report'), leftMargin, doc.y + 2, { align: 'left' });

      doc.moveDown(0.5);

      // Metadata Info Box
      const metaY = doc.y;
      const metaHeight = data.verificationId ? 56 : 44;
      doc.roundedRect(leftMargin, metaY, pageWidth, metaHeight, 5).fillAndStroke('#f8fafc', borderColor);

      doc.fillColor(textColor).fontSize(8.5);
      
      // Column 1: Shop Details
      doc.font(fontBold).text('দোকানের নাম (Shop Name):', leftMargin + 10, metaY + 8);
      doc.font(fontBold).fillColor(primaryColor).text(data.shopName || 'Partner Shop', leftMargin + 130, metaY + 8, { width: 230, ellipsis: true });

      doc.font(fontBold).fillColor(textColor).text('রিপোর্ট সময়কাল (Period):', leftMargin + 10, metaY + 24);
      doc.font(fontRegular).text(data.periodLabel || 'All Time', leftMargin + 130, metaY + 24, { width: 230, ellipsis: true });

      // Column 2: Generation Details & Counts
      const col2X = leftMargin + 390;
      doc.font(fontBold).text('তৈরির তারিখ ও সময় (Generated):', col2X, metaY + 8);
      doc.font(fontRegular).text(data.generatedAt, col2X + 145, metaY + 8);

      doc.font(fontBold).text('মোট লেনদেন সংখ্যা (Total Records):', col2X, metaY + 24);
      doc.font(fontBold).fillColor(darkEmerald).text(`${data.summary.totalCount} টি রেকর্ড`, col2X + 145, metaY + 24);

      if (data.verificationId) {
        doc.font(fontBold).fillColor(textColor).text('ভেরিফিকেশন আইডি (Verification ID):', col2X, metaY + 40);
        doc.font(fontBold).fillColor('#1d4ed8').text(data.verificationId, col2X + 145, metaY + 40);
      }

      // Draw QR code if buffer exists
      if (qrCodeBuffer) {
        try {
          const qrX = leftMargin + pageWidth - 70;
          const qrY = 32;
          doc.image(qrCodeBuffer, qrX, qrY, { width: 70 });
          
          doc.font(fontBold).fontSize(6.5).fillColor(primaryColor);
          doc.text('সত্যতা যাচাই করুন', qrX - 15, qrY + 74, { width: 100, align: 'center' });
          doc.font(fontRegular).fontSize(5.8).fillColor(mutedColor);
          doc.text('Verify Authenticity', qrX - 15, qrY + 82, { width: 100, align: 'center' });
        } catch (qrErr) {
          console.error('[PDF Generation] Failed to draw QR code:', qrErr);
        }
      }

      doc.y = metaY + metaHeight + 12;

      // -------------------------------------------------------------
      // FINANCIAL SUMMARY CARDS (5 Balanced Columns)
      // -------------------------------------------------------------
      doc.font(fontBold).fontSize(10).fillColor(primaryColor).text('FINANCIAL SUMMARY (আর্থিক সারসংক্ষেপ)', leftMargin, doc.y);
      doc.moveDown(0.3);

      const summaryCardY = doc.y;
      const numCards = 5;
      const cardGap = 6;
      const cardWidth = (pageWidth - (cardGap * (numCards - 1))) / numCards;
      const cardHeight = 44;

      // Card 1: Total Original Bills
      doc.roundedRect(leftMargin, summaryCardY, cardWidth, cardHeight, 5).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.font(fontBold).fontSize(7).fillColor(darkEmerald).text('TOTAL SALES (মোট বিক্রয়)', leftMargin + 6, summaryCardY + 7);
      doc.font(fontBold).fontSize(11).fillColor('#065f46').text(formatBDT(data.summary.totalAmount), leftMargin + 6, summaryCardY + 21);

      // Card 2: Gross Commission or Discounts
      const card2X = leftMargin + cardWidth + cardGap;
      if (!data.hideInternalFinances) {
        doc.roundedRect(card2X, summaryCardY, cardWidth, cardHeight, 5).fillAndStroke('#fffbeb', '#fde68a');
        doc.font(fontBold).fontSize(7).fillColor(accentColor).text('GROSS COMMISSION (কমিশন)', card2X + 6, summaryCardY + 7);
        const gross = data.summary.totalGrossCommission || data.summary.totalCommission || 0;
        doc.font(fontBold).fontSize(11).fillColor('#92400e').text(formatBDT(gross), card2X + 6, summaryCardY + 21);
      } else {
        doc.roundedRect(card2X, summaryCardY, cardWidth, cardHeight, 5).fillAndStroke('#fffbeb', '#fde68a');
        doc.font(fontBold).fontSize(7).fillColor('#b91c1c').text('TOKEN BENEFITS (টোকেন সুবিধা)', card2X + 6, summaryCardY + 7);
        doc.font(fontBold).fontSize(11).fillColor('#991b1b').text(formatBDT(data.summary.totalTokenBenefits || 0), card2X + 6, summaryCardY + 21);
      }

      // Card 3: Donated Amount
      const card3X = leftMargin + (cardWidth * 2) + (cardGap * 2);
      doc.roundedRect(card3X, summaryCardY, cardWidth, cardHeight, 5).fillAndStroke('#fff1f2', '#fecdd3');
      doc.font(fontBold).fontSize(7).fillColor('#be123c').text('TOTAL DONATED (দানকৃত অর্থ)', card3X + 6, summaryCardY + 7);
      doc.font(fontBold).fontSize(11).fillColor('#9f1239').text(formatBDT(data.summary.totalDonatedAmount || 0), card3X + 6, summaryCardY + 21);

      // Card 4: Cave Companions Net Income
      const card4X = leftMargin + (cardWidth * 3) + (cardGap * 3);
      doc.roundedRect(card4X, summaryCardY, cardWidth, cardHeight, 5).fillAndStroke('#f0fdf4', '#86efac');
      doc.font(fontBold).fontSize(7).fillColor('#15803d').text('CC NET INCOME (CC নেট আয়)', card4X + 6, summaryCardY + 7);
      doc.font(fontBold).fontSize(11).fillColor('#166534').text(formatBDT(data.summary.totalNetIncome || 0), card4X + 6, summaryCardY + 21);

      // Card 5: Merchant Payout
      const card5X = leftMargin + (cardWidth * 4) + (cardGap * 4);
      doc.roundedRect(card5X, summaryCardY, cardWidth, cardHeight, 5).fillAndStroke('#eff6ff', '#bfdbfe');
      doc.font(fontBold).fontSize(7).fillColor('#1d4ed8').text('MERCHANT PAYOUT (পাওনা)', card5X + 6, summaryCardY + 7);
      const payout = data.summary.totalMerchantPayout != null 
        ? data.summary.totalMerchantPayout 
        : (data.summary.totalAmount - (data.summary.totalTokenBenefits || 0));
      doc.font(fontBold).fontSize(11).fillColor('#1e40af').text(formatBDT(payout), card5X + 6, summaryCardY + 21);

      doc.y = summaryCardY + cardHeight + 14;

      // -------------------------------------------------------------
      // TRANSACTION DETAILS TABLE (Matching App UI Tables)
      // -------------------------------------------------------------
      doc.font(fontBold).fontSize(10).fillColor(primaryColor).text('TRANSACTION DETAILS (লেনদেন সমূহের পূর্ণাঙ্গ তালিকা)', leftMargin, doc.y);
      doc.moveDown(0.3);

      const columns = data.isOnlineReport ? [
        { key: 'orderNum', title: 'Order # / Cust. (অর্ডার ও গ্রাহক)', width: 85, align: 'left' },
        { key: 'shop', title: 'Shop (দোকান)', width: 75, align: 'left' },
        { key: 'product', title: 'Product (পণ্য ও পরিমাণ)', width: 90, align: 'left' },
        { key: 'bill', title: 'Original (মূল্য)', width: 55, align: 'right' },
        { key: 'discount', title: 'Token (ছাড়)', width: 50, align: 'right' },
        { key: 'coupon', title: 'Coupon (কুপন)', width: 65, align: 'center' },
        { key: 'donation', title: 'Donated (দান)', width: 50, align: 'center' },
        { key: 'paid', title: 'Paid (প্রদান)', width: 55, align: 'right' },
        { key: 'comm', title: 'Comm %', width: 45, align: 'center' },
        { key: 'payout', title: 'Payout (পাওনা)', width: 65, align: 'right' },
        { key: 'net', title: 'CC Net (নেট)', width: 65, align: 'right' },
        { key: 'date', title: 'Delivery (তারিখ)', width: 75, align: 'center' }
      ] : (!data.hideInternalFinances ? [
        { key: 'date', title: 'Date (তারিখ)', width: 80, align: 'left' },
        { key: 'user', title: 'Customer (গ্রাহক ও টোকেন)', width: 120, align: 'left' },
        { key: 'bill', title: 'Bill (মূল বিল)', width: 70, align: 'right' },
        { key: 'gross', title: 'Gross (কমিশন)', width: 70, align: 'right' },
        { key: 'discount', title: 'Discount (ছাড়)', width: 70, align: 'right' },
        { key: 'donation', title: 'Donated (দান)', width: 60, align: 'center' },
        { key: 'paid', title: 'Paid (গ্রাহক)', width: 70, align: 'right' },
        { key: 'payout', title: 'Payout (পাওনা)', width: 75, align: 'right' },
        { key: 'net', title: 'CC Net (নেট)', width: 70, align: 'right' },
        { key: 'status', title: 'Status (স্ট্যাটাস)', width: 90, align: 'center' }
      ] : [
        { key: 'date', title: 'Date (তারিখ)', width: 80, align: 'left' },
        { key: 'user', title: 'Customer (গ্রাহক ও টোকেন)', width: 130, align: 'left' },
        { key: 'bill', title: 'Bill (মূল বিল)', width: 75, align: 'right' },
        { key: 'discount', title: 'Discount (ছাড়)', width: 75, align: 'right' },
        { key: 'donation', title: 'Donated (দান)', width: 65, align: 'center' },
        { key: 'paid', title: 'Paid (গ্রাহক)', width: 75, align: 'right' },
        { key: 'payout', title: 'Payout (পাওনা)', width: 80, align: 'right' },
        { key: 'net', title: 'CC Net (নেট)', width: 75, align: 'right' },
        { key: 'status', title: 'Status (স্ট্যাটাস)', width: 120, align: 'center' }
      ]);

      // Table Header Drawer
      const drawTableHeader = (y: number) => {
        const headerHeight = 22;
        doc.roundedRect(leftMargin, y, pageWidth, headerHeight, 3).fill(tableHeaderBg);
        
        let currX = leftMargin + 4;
        doc.font(fontBold).fontSize(7.2).fillColor('#ffffff');

        columns.forEach(col => {
          const textX = col.align === 'right' ? currX : (col.align === 'center' ? currX : currX + 2);
          doc.text(col.title, textX, y + 6, {
            width: col.width - 4,
            align: col.align as any,
            lineBreak: false
          });
          currX += col.width;
        });

        return y + headerHeight + 2;
      };

      let tableY = drawTableHeader(doc.y);

      if (data.transactions.length === 0) {
        doc.rect(leftMargin, tableY, pageWidth, 35).fillAndStroke('#f8fafc', borderColor);
        doc.font(fontRegular).fontSize(8.5).fillColor(mutedColor)
          .text('কোনো লেনদেনের রেকর্ড পাওয়া যায়নি (No financial records found for the selected period).', leftMargin, tableY + 12, {
            width: pageWidth,
            align: 'center'
          });
        tableY += 40;
      } else {
        const rowHeight = 28;

        data.transactions.forEach((tx, index) => {
          // Automatic page continuation & repeating table header on every new page
          if (tableY + rowHeight > doc.page.height - 40) {
            doc.addPage();
            tableY = drawTableHeader(30);
          }

          // Alternating row background
          const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(leftMargin, tableY, pageWidth, rowHeight).fillAndStroke(rowBg, '#e2e8f0');

          let currX = leftMargin + 4;
          const textY = tableY + 3;

          const bill = tx.purchaseAmount || 0;
          const gross = tx.grossCommissionAmount || 0;
          const discount = tx.discountAmount || 0;
          const userPaid = tx.finalPayableAmount != null ? tx.finalPayableAmount : (bill - discount);
          const payout = tx.merchantPayoutAmount != null ? tx.merchantPayoutAmount : (bill - gross);
          const net = tx.caveCompanionsNetIncome || 0;
          const tokenType = tx.tokenType || 'NONE';
          const status = tx.status || 'COMPLETED';
          const donated = tx.isDonated ? (tx.donatedAmount || 0) : 0;
          const mosque = tx.earnedMosqueName || '-';

          if (data.isOnlineReport) {
            // Online Accounts Table
            // 1. Order Number & Customer Name/Phone
            doc.font(fontBold).fontSize(6.5).fillColor(primaryColor);
            const orderNo = safeText(tx.orderNumber || tx.userId || 'N/A');
            const custInfo = safeText(tx.customerName || tx.userName || tx.customerPhone || tx.userPhone || '');
            const combinedOrderCust = custInfo ? `${orderNo}\n${custInfo}` : orderNo;
            doc.text(combinedOrderCust, currX + 2, textY, { width: columns[0].width - 4, ellipsis: true });
            currX += columns[0].width;

            // 2. Shop Name
            doc.font(fontRegular).fontSize(6.8).fillColor(textColor);
            doc.text(safeText(tx.shopName || 'N/A'), currX + 2, textY + 4, { width: columns[1].width - 4, ellipsis: true });
            currX += columns[1].width;

            // 3. Product & Qty
            doc.font(fontRegular).fontSize(6.5).fillColor(textColor);
            const prodName = safeText(tx.productName || 'Product');
            const prodQty = `(x${tx.quantity || 1})`;
            doc.text(`${prodName}\n${prodQty}`, currX + 2, textY, { width: columns[2].width - 4, ellipsis: true });
            currX += columns[2].width;

            // 4. Original Price
            doc.font(fontBold).fontSize(7).fillColor(primaryColor);
            doc.text(Number(bill).toLocaleString('en-US'), currX, textY + 4, { width: columns[3].width - 4, align: 'right', lineBreak: false });
            currX += columns[3].width;

            // 5. Token Benefit
            doc.font(fontRegular).fontSize(7).fillColor('#b91c1c');
            doc.text(discount > 0 ? `-${Number(discount).toLocaleString('en-US')}` : '0', currX, textY + 4, { width: columns[4].width - 4, align: 'right', lineBreak: false });
            currX += columns[4].width;

            // 6. Coupon Code & Coupon Discount
            const cCode = tx.couponCode ? safeText(tx.couponCode) : null;
            const cDiscount = Number(tx.couponDiscountAmount || 0);
            if (cCode || cDiscount > 0) {
              doc.font(fontBold).fontSize(6.5).fillColor('#2563eb');
              const couponStr = cCode 
                ? (cDiscount > 0 ? `${cCode}\n-${cDiscount.toLocaleString('en-US')}` : cCode)
                : `-${cDiscount.toLocaleString('en-US')}`;
              doc.text(couponStr, currX, textY + (cCode && cDiscount > 0 ? 0 : 4), { width: columns[5].width, align: 'center', ellipsis: true });
            } else {
              doc.font(fontRegular).fontSize(7).fillColor(mutedColor);
              doc.text('-', currX, textY + 4, { width: columns[5].width, align: 'center', lineBreak: false });
            }
            currX += columns[5].width;

            // 7. Donated Amount
            doc.font(fontBold).fontSize(7).fillColor(donated > 0 ? '#be123c' : mutedColor);
            doc.text(donated > 0 ? Number(donated).toLocaleString('en-US') : '-', currX, textY + 4, { width: columns[6].width, align: 'center', lineBreak: false });
            currX += columns[6].width;

            // 8. Customer Paid
            doc.font(fontBold).fontSize(7).fillColor('#d97706');
            doc.text(Number(userPaid).toLocaleString('en-US'), currX, textY + 4, { width: columns[7].width - 4, align: 'right', lineBreak: false });
            currX += columns[7].width;

            // 9. Commission %
            doc.font(fontRegular).fontSize(6.8).fillColor(textColor);
            doc.text(`${tx.commissionRate || 0}%`, currX, textY + 4, { width: columns[8].width, align: 'center', lineBreak: false });
            currX += columns[8].width;

            // 10. Shop Receives
            doc.font(fontBold).fontSize(7).fillColor('#1d4ed8');
            doc.text(Number(payout).toLocaleString('en-US'), currX, textY + 4, { width: columns[9].width - 4, align: 'right', lineBreak: false });
            currX += columns[9].width;

            // 11. CC Net Income
            doc.font(fontBold).fontSize(7).fillColor('#15803d');
            doc.text(Number(net).toLocaleString('en-US'), currX, textY + 4, { width: columns[10].width - 4, align: 'right', lineBreak: false });
            currX += columns[10].width;

            // 12. Delivery Date
            doc.font(fontRegular).fontSize(6.5).fillColor(textColor);
            const delivDate = tx.redemptionDate || formatDate(tx.createdAt);
            doc.text(safeText(delivDate), currX, textY + 4, { width: columns[11].width, align: 'center', lineBreak: false });
          } else if (!data.hideInternalFinances) {
            // Admin View Shop Accounts
            // 1. Date
            doc.font(fontRegular).fontSize(6.8).fillColor(textColor);
            doc.text(safeText(formatDate(tx.createdAt), 'N/A'), currX + 2, textY + 4, { width: columns[0].width - 4, ellipsis: true });
            currX += columns[0].width;

            // 2. Customer Name & Phone & Token
            doc.font(fontBold).fontSize(6.5).fillColor(primaryColor);
            const cName = safeText(tx.userName || 'Customer');
            const cSub = `${tx.userPhone || ''} [${tokenType}]`.trim();
            doc.text(`${cName}\n${cSub}`, currX + 2, textY, { width: columns[1].width - 4, ellipsis: true });
            currX += columns[1].width;

            // 3. Bill
            doc.font(fontBold).fontSize(7).fillColor(primaryColor);
            doc.text(Number(bill).toLocaleString('en-US'), currX, textY + 4, { width: columns[2].width - 4, align: 'right', lineBreak: false });
            currX += columns[2].width;

            // 4. Gross Commission
            doc.font(fontRegular).fontSize(7).fillColor(textColor);
            doc.text(Number(gross).toLocaleString('en-US'), currX, textY + 4, { width: columns[3].width - 4, align: 'right', lineBreak: false });
            currX += columns[3].width;

            // 5. Token Discount
            doc.font(fontRegular).fontSize(7).fillColor('#b91c1c');
            doc.text(Number(discount).toLocaleString('en-US'), currX, textY + 4, { width: columns[4].width - 4, align: 'right', lineBreak: false });
            currX += columns[4].width;

            // 6. Donated Amount
            doc.font(fontBold).fontSize(7).fillColor(donated > 0 ? '#be123c' : mutedColor);
            doc.text(donated > 0 ? Number(donated).toLocaleString('en-US') : '-', currX, textY + 4, { width: columns[5].width, align: 'center', lineBreak: false });
            currX += columns[5].width;

            // 7. User Paid
            doc.font(fontBold).fontSize(7).fillColor('#d97706');
            doc.text(Number(userPaid).toLocaleString('en-US'), currX, textY + 4, { width: columns[6].width - 4, align: 'right', lineBreak: false });
            currX += columns[6].width;

            // 8. Merchant Payout
            doc.font(fontBold).fontSize(7).fillColor('#1d4ed8');
            doc.text(Number(payout).toLocaleString('en-US'), currX, textY + 4, { width: columns[7].width - 4, align: 'right', lineBreak: false });
            currX += columns[7].width;

            // 9. CC Net Income
            doc.font(fontBold).fontSize(7).fillColor('#15803d');
            doc.text(Number(net).toLocaleString('en-US'), currX, textY + 4, { width: columns[8].width - 4, align: 'right', lineBreak: false });
            currX += columns[8].width;

            // 10. Status
            const isPaid = tx.commissionPaymentStatus === 'paid';
            const statusText = isPaid ? 'Paid / পরিশোধিত' : 'Unpaid / অপরিশোধিত';
            doc.font(fontBold).fontSize(6.5).fillColor(isPaid ? '#059669' : '#d97706');
            doc.text(statusText, currX, textY + 4, { width: columns[9].width, align: 'center', lineBreak: false });
          } else {
            // Merchant View Shop Accounts
            // 1. Date
            doc.font(fontRegular).fontSize(7).fillColor(textColor);
            doc.text(safeText(formatDate(tx.createdAt), 'N/A'), currX + 2, textY + 4, { width: columns[0].width - 4, ellipsis: true });
            currX += columns[0].width;

            // 2. Customer & Token
            doc.font(fontBold).fontSize(6.8).fillColor(primaryColor);
            const cName = safeText(tx.userName || 'Customer');
            const cSub = `${tx.userPhone || ''} [${tokenType}]`.trim();
            doc.text(`${cName}\n${cSub}`, currX + 2, textY, { width: columns[1].width - 4, ellipsis: true });
            currX += columns[1].width;

            // 3. Bill
            doc.font(fontBold).fontSize(7.5).fillColor(primaryColor);
            doc.text(Number(bill).toLocaleString('en-US'), currX, textY + 4, { width: columns[2].width - 4, align: 'right', lineBreak: false });
            currX += columns[2].width;

            // 4. Discount
            doc.font(fontRegular).fontSize(7.5).fillColor('#b91c1c');
            doc.text(Number(discount).toLocaleString('en-US'), currX, textY + 4, { width: columns[3].width - 4, align: 'right', lineBreak: false });
            currX += columns[3].width;

            // 5. Donated Amount
            doc.font(fontBold).fontSize(7).fillColor(donated > 0 ? '#be123c' : mutedColor);
            doc.text(donated > 0 ? Number(donated).toLocaleString('en-US') : '-', currX, textY + 4, { width: columns[4].width, align: 'center', lineBreak: false });
            currX += columns[4].width;

            // 6. User Paid
            doc.font(fontBold).fontSize(7.5).fillColor('#d97706');
            doc.text(Number(userPaid).toLocaleString('en-US'), currX, textY + 4, { width: columns[5].width - 4, align: 'right', lineBreak: false });
            currX += columns[5].width;

            // 7. Merchant Payout
            doc.font(fontBold).fontSize(7.5).fillColor('#1d4ed8');
            doc.text(Number(payout).toLocaleString('en-US'), currX, textY + 4, { width: columns[6].width - 4, align: 'right', lineBreak: false });
            currX += columns[6].width;

            // 8. CC Net Income
            doc.font(fontBold).fontSize(7.5).fillColor('#15803d');
            doc.text(Number(net).toLocaleString('en-US'), currX, textY + 4, { width: columns[7].width - 4, align: 'right', lineBreak: false });
            currX += columns[7].width;

            // 9. Status
            const isPaid = tx.commissionPaymentStatus === 'paid';
            const statusText = isPaid ? 'Paid / পরিশোধিত' : 'Unpaid / অপরিশোধিত';
            doc.font(fontBold).fontSize(6.8).fillColor(isPaid ? '#059669' : '#d97706');
            doc.text(statusText, currX, textY + 4, { width: columns[8].width, align: 'center', lineBreak: false });
          }

          tableY += rowHeight;
        });
      }

      // Ensure space for Cave Companions Signature Block on the last page
      let sigY = tableY + 25;
      if (sigY + 55 > doc.page.height - 35) {
        doc.addPage();
        sigY = 40;
      }

      // Draw Cave Companions Signature Block at bottom right of last page
      const lastPageIndex = doc.bufferedPageRange().count - 1;
      doc.switchToPage(lastPageIndex);

      const sigWidth = 240;
      const sigX = leftMargin + pageWidth - sigWidth;

      // 1. Official Seal Badge
      doc.roundedRect(sigX, sigY + 2, 85, 46, 5).fillAndStroke('#fffbeb', '#fde68a');
      doc.font(fontBold).fontSize(7).fillColor('#b45309').text('CAVE COMPANIONS', sigX + 5, sigY + 8, { width: 75, align: 'center' });
      doc.font(fontBold).fontSize(6).fillColor('#d97706').text('OFFICIAL SEAL', sigX + 5, sigY + 17, { width: 75, align: 'center' });
      doc.font(fontRegular).fontSize(6).fillColor('#92400e').text('অফিসিয়াল সত্যায়িত রিপোর্ট', sigX + 5, sigY + 27, { width: 75, align: 'center' });

      // 2. Signature Line & Text
      const lineX1 = sigX + 98;
      const lineX2 = sigX + sigWidth;
      const lineY = sigY + 32;

      doc.font(fontBold).fontSize(9.5).fillColor('#0284c7').text('Cave Companions Auth.', lineX1, lineY - 15, { width: lineX2 - lineX1, align: 'center' });
      doc.moveTo(lineX1, lineY).lineTo(lineX2, lineY).strokeColor('#d97706').lineWidth(1.2).stroke();

      doc.font(fontBold).fontSize(7.5).fillColor('#0f172a').text('অনুমোদিত স্বাক্ষর (Authorized Signature)', lineX1, lineY + 4, { width: lineX2 - lineX1, align: 'center' });
      doc.font(fontRegular).fontSize(6.5).fillColor('#475569').text('Cave Companions Authority', lineX1, lineY + 15, { width: lineX2 - lineX1, align: 'center' });

      // Add Page Numbers and Footer in all buffered pages
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const prevBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // Prevent automatic page breaks from footer text
        
        // Footer line
        doc.rect(leftMargin, doc.page.height - 24, pageWidth, 0.75).fill('#cbd5e1');
        
        doc.font(fontRegular).fontSize(7.5).fillColor(mutedColor);
        doc.text('Cave Companions • Official Financial Accounts Report (কেভ কম্প্যানিয়নস অফিসিয়াল রিপোর্ট)', leftMargin, doc.page.height - 18, { align: 'left', lineBreak: false });
        doc.text(`Page ${i + 1} of ${totalPages}`, leftMargin, doc.page.height - 18, { align: 'right', width: pageWidth, lineBreak: false });

        doc.page.margins.bottom = prevBottomMargin;
      }

      doc.end();
    } catch (err: any) {
      console.error('PDF Generation failed during drawing:', err);
      reject(err);
    }
  });
}

