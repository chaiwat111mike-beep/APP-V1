import { SparePart, Customer, JobOrder, JobStatus, PaymentStatus } from '../types';
import appletConfig from '../../firebase-applet-config.json';

export interface GoogleAuthToken {
  access_token: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export const TARGET_SPREADSHEET_ID = '1XIH-RiKcciGRgWwNgQQ7ECsqnmMOX5pZNEAheJrtrYA';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${TARGET_SPREADSHEET_ID}/edit`;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'songkarn_google_access_token',
  USER_EMAIL: 'songkarn_google_user_email',
  PRIMARY_SHEET_ID: 'songkarn_primary_sheet_id',
  INVENTORY_SHEET_ID: 'songkarn_inventory_sheet_id',
  CUSTOMERS_SHEET_ID: 'songkarn_customers_sheet_id',
  JOB_ORDERS_SHEET_ID: 'songkarn_job_orders_sheet_id',
};

export const GOOGLE_CLIENT_ID =
  appletConfig.oAuthClientId ||
  '326652231901-0juius0ojgqjc4muokto8u2uk51p132k.apps.googleusercontent.com';

// Global in-memory cached token
let cachedToken: string | null = null;

export const getStoredGoogleToken = (): string | null => {
  if (cachedToken && !cachedToken.startsWith('oauth_ready_')) return cachedToken;
  try {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && !token.startsWith('oauth_ready_')) {
      cachedToken = token;
      return token;
    }
  } catch (e) {
    console.warn('Could not read stored token', e);
  }
  return null;
};

export const setStoredGoogleToken = (token: string, email?: string) => {
  cachedToken = token;
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    if (email) {
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    }
  } catch (e) {
    console.warn('Could not save token', e);
  }
};

export const getStoredGoogleEmail = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  } catch {
    return null;
  }
};

export const clearStoredGoogleToken = () => {
  cachedToken = null;
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  } catch (e) {
    console.warn('Could not remove token', e);
  }
};

export const isRealGoogleSpreadsheetId = (id: string | null | undefined): boolean => {
  if (!id) return false;
  const trimmed = id.trim();
  if (
    trimmed.startsWith('1Songkarn-') ||
    trimmed.startsWith('mock-') ||
    trimmed.includes('placeholder') ||
    trimmed.length < 15
  ) {
    return false;
  }
  return true;
};

export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export const getSpreadsheetUrl = (id: string | null | undefined): string | null => {
  const targetId = id || TARGET_SPREADSHEET_ID;
  if (!isRealGoogleSpreadsheetId(targetId)) return null;
  return `https://docs.google.com/spreadsheets/d/${targetId}/edit`;
};

export const getStoredSpreadsheetId = (type: 'inventory' | 'customers' | 'jobs' | 'all' = 'all'): string => {
  try {
    let key = STORAGE_KEYS.PRIMARY_SHEET_ID;
    if (type === 'inventory') key = STORAGE_KEYS.INVENTORY_SHEET_ID;
    else if (type === 'customers') key = STORAGE_KEYS.CUSTOMERS_SHEET_ID;
    else if (type === 'jobs') key = STORAGE_KEYS.JOB_ORDERS_SHEET_ID;

    const id = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEYS.PRIMARY_SHEET_ID);
    if (id && isRealGoogleSpreadsheetId(id)) {
      return id;
    }
    // Default to user's connected sheet ID
    return TARGET_SPREADSHEET_ID;
  } catch {
    return TARGET_SPREADSHEET_ID;
  }
};

export const setStoredSpreadsheetId = (type: 'inventory' | 'customers' | 'jobs' | 'all', id: string) => {
  try {
    const cleanId = extractSpreadsheetId(id);
    const idToSave = cleanId && isRealGoogleSpreadsheetId(cleanId) ? cleanId : TARGET_SPREADSHEET_ID;
    
    if (type === 'all') {
      localStorage.setItem(STORAGE_KEYS.PRIMARY_SHEET_ID, idToSave);
      localStorage.setItem(STORAGE_KEYS.INVENTORY_SHEET_ID, idToSave);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS_SHEET_ID, idToSave);
      localStorage.setItem(STORAGE_KEYS.JOB_ORDERS_SHEET_ID, idToSave);
    } else {
      let key = STORAGE_KEYS.PRIMARY_SHEET_ID;
      if (type === 'inventory') key = STORAGE_KEYS.INVENTORY_SHEET_ID;
      else if (type === 'customers') key = STORAGE_KEYS.CUSTOMERS_SHEET_ID;
      else if (type === 'jobs') key = STORAGE_KEYS.JOB_ORDERS_SHEET_ID;
      localStorage.setItem(key, idToSave);
      // also ensure primary is set
      if (!localStorage.getItem(STORAGE_KEYS.PRIMARY_SHEET_ID)) {
        localStorage.setItem(STORAGE_KEYS.PRIMARY_SHEET_ID, idToSave);
      }
    }
  } catch (e) {
    console.warn('Could not store spreadsheet id', e);
  }
};

export const clearStoredSpreadsheetId = (type: 'inventory' | 'customers' | 'jobs' | 'all') => {
  try {
    if (type === 'all') {
      localStorage.removeItem(STORAGE_KEYS.PRIMARY_SHEET_ID);
      localStorage.removeItem(STORAGE_KEYS.INVENTORY_SHEET_ID);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS_SHEET_ID);
      localStorage.removeItem(STORAGE_KEYS.JOB_ORDERS_SHEET_ID);
    } else {
      let key = STORAGE_KEYS.PRIMARY_SHEET_ID;
      if (type === 'inventory') key = STORAGE_KEYS.INVENTORY_SHEET_ID;
      else if (type === 'customers') key = STORAGE_KEYS.CUSTOMERS_SHEET_ID;
      else if (type === 'jobs') key = STORAGE_KEYS.JOB_ORDERS_SHEET_ID;
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Could not remove spreadsheet id', e);
  }
};

/**
 * Copies table data formatted as TSV for direct paste into Google Sheets (Ctrl+V)
 */
export const copyDataForGoogleSheets = async (headers: string[], rows: (string | number)[][]): Promise<boolean> => {
  try {
    const tsvContent = [
      headers.join('\t'),
      ...rows.map((row) =>
        row.map((cell) => String(cell ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')
      ),
    ].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvContent);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not copy to clipboard:', err);
    return false;
  }
};

/**
 * Initiates Google OAuth client popup using Google Identity Services (GSI)
 */
export const requestGoogleOAuthToken = async (
  scopes: string[] = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ]
): Promise<string> => {
  const existingToken = getStoredGoogleToken();
  if (existingToken) {
    return existingToken;
  }

  return new Promise((resolve, reject) => {
    const gsiLoaded = typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2;

    if (gsiLoaded) {
      try {
        let isResolved = false;

        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: scopes.join(' '),
          callback: async (response: any) => {
            if (isResolved) return;
            isResolved = true;

            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              setStoredGoogleToken(response.access_token);
              // Fetch user profile email if possible
              try {
                const infoRes = await fetch(
                  `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${response.access_token}`
                );
                if (infoRes.ok) {
                  const infoData = await infoRes.json();
                  if (infoData.email) {
                    setStoredGoogleToken(response.access_token, infoData.email);
                  }
                }
              } catch {
                // non-critical
              }
              resolve(response.access_token);
            } else {
              reject(new Error('ไม่ได้รับ Access Token จาก Google'));
            }
          },
          error_callback: (nonOAuthError: any) => {
            if (isResolved) return;
            isResolved = true;
            console.warn('Google Identity Services error callback:', nonOAuthError);
            const errType = nonOAuthError?.type || '';
            const errMsg = String(nonOAuthError?.message || '');
            if (errType === 'popup_blocked_by_browser' || errMsg.includes('popup') || errMsg.includes('Failed to open popup')) {
              reject(
                new Error(
                  'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป (Popup Blocked) กรุณากด "อนุญาตป๊อปอัป" (Always allow popups) ที่แถบ Address Bar ด้านบน หรือใช้งานระบบดึงข้อมูลสด (Live Sheets) ได้ทันทีโดยไม่ต้องเข้าสู่ระบบ'
                )
              );
            } else if (errType === 'popup_closed') {
              reject(new Error('ผู้ใช้ปิดหน้าต่างลงชื่อเข้าใช้ Google ก่อนทำรายการเสร็จสิ้น'));
            } else {
              reject(new Error(errMsg || 'การเชื่อมต่อ Google ถูกระงับโดยเบราว์เซอร์'));
            }
          },
        });

        // Try requesting token
        try {
          client.requestAccessToken();
        } catch (callErr: any) {
          isResolved = true;
          reject(
            new Error(
              `การเปิดหน้าต่างยืนยันสิทธิ์ Google ถูกบล็อกโดยเบราว์เซอร์: ${callErr?.message || callErr}`
            )
          );
        }
      } catch (err: any) {
        reject(new Error(`การเรียก Google Sign-In ผิดพลาด: ${err?.message || err}`));
      }
    } else {
      reject(
        new Error(
          'Google Identity Services SDK ยังโหลดไม่เสร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง'
        )
      );
    }
  });
};

/**
 * Helper: Inspects existing sheet tab names in a spreadsheet, ensuring valid target sheet range.
 */
async function resolveSheetRange(
  token: string,
  spreadsheetId: string,
  preferredSheetTitle: string
): Promise<string> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!metaRes.ok) {
    if (metaRes.status === 401) {
      clearStoredGoogleToken();
      throw new Error('Google Token หมดอายุ กรุณาคลิก "เชื่อมต่อบัญชี Google" ใหม่อีกครั้ง');
    }
    if (metaRes.status === 404) {
      throw new Error('ไม่พบ Google Spreadsheet ตาม ID นี้ กรุณาตรวจสอบลิงก์หรือสร้างชีตใหม่');
    }
    if (metaRes.status === 403) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงหรือแก้ไข Google Spreadsheet นี้ กรุณาตั้งค่าสิทธิ์แชร์เป็น Editor');
    }
    throw new Error(`Google API ตอบกลับข้อผิดพลาด (${metaRes.status}): ${metaRes.statusText}`);
  }

  const metaData = await metaRes.json();
  const sheetsList: { sheetId: number; title: string }[] =
    metaData.sheets?.map((s: any) => s.properties) || [];

  // 1. Check if preferred title tab already exists
  const exactMatch = sheetsList.find((s) => s.title === preferredSheetTitle);
  if (exactMatch) {
    return exactMatch.title;
  }

  // 2. If it's a freshly created default sheet (e.g. Sheet1 or แผ่นงาน1), rename it to preferred title
  const defaultSheet = sheetsList[0];
  if (defaultSheet && (defaultSheet.title === 'Sheet1' || defaultSheet.title === 'แผ่นงาน1')) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: defaultSheet.sheetId,
                  title: preferredSheetTitle,
                },
                fields: 'title',
              },
            },
          ],
        }),
      });
      return preferredSheetTitle;
    } catch {
      // If rename fails, fallback to using defaultSheet.title
      return defaultSheet.title;
    }
  }

  // 3. If other tabs exist, try creating the tab or fallback to the first tab
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: preferredSheetTitle,
              },
            },
          },
        ],
      }),
    });
    return preferredSheetTitle;
  } catch {
    return defaultSheet?.title || preferredSheetTitle;
  }
}

/**
 * 1. CREATE GOOGLE SPREADSHEET FOR INVENTORY (สต็อกอะไหล่)
 */
export const createInventorySpreadsheet = async (
  garageName: string = 'อู่สงกรานต์ ช่างไมค์ 061-069-2036',
  parts: SparePart[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อนดำเนินการ หรือใช้ปุ่ม "คัดลอกข้อมูลไปวางใน Google Sheets" ได้ทันที');
  }

  const title = `[อู่สงกรานต์] สต็อกอะไหล่รถยนต์ (Auto Parts Inventory) - ${new Date().toLocaleDateString('th-TH')}`;

  const headers = [
    'รหัสอะไหล่ (Part Code)',
    'ชื่ออะไหล่ / รายการสินค้า',
    'หมวดหมู่อะไหล่',
    'ยี่ห้อ / แบรนด์',
    'รุ่นรถยนต์ที่รองรับ',
    'หน่วยนับ',
    'จำนวนคงเหลือ',
    'จุดสั่งซื้อขั้นต่ำ',
    'สถานะสต็อก',
    'ราคาต้นทุน (บาท)',
    'ราคาขายหน้าร้าน (บาท)',
    'มูลค่าสต็อกรวม (บาท)',
    'ตำแหน่งจัดเก็บ (Rack)',
    'ผู้จำหน่าย / Supplier',
    'วันที่เติมสต็อกล่าสุด',
    'อัปเดตระบบล่าสุด',
  ];

  const rows = parts.map((p) => {
    const isLow = p.stockQty <= p.minStockQty;
    const isOut = p.stockQty <= 0;
    const statusText = isOut ? '🚨 สินค้าหมด' : isLow ? '⚠️ สต็อกต่ำกว่าเกณฑ์' : '✅ พร้อมจำหน่าย';
    const totalCost = p.stockQty * p.costPrice;

    return [
      p.partCode,
      p.name,
      p.category,
      p.brand,
      p.compatibleModels,
      p.unit,
      p.stockQty,
      p.minStockQty,
      statusText,
      p.costPrice,
      p.sellPrice,
      totalCost,
      p.locationRack || '-',
      p.supplier || '-',
      p.lastRestockedAt || '-',
      new Date().toLocaleString('th-TH'),
    ];
  });

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'คลังสต็อกอะไหล่',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredGoogleToken();
      throw new Error('Google Token หมดอายุ กรุณาคลิก "เชื่อมต่อบัญชี Google" ใหม่อีกครั้ง');
    }
    const errText = await res.text();
    throw new Error(`สร้าง Google Spreadsheet ไม่สำเร็จ (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header & rows
  const range = encodeURIComponent("'คลังสต็อกอะไหล่'!A1:P");
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    }
  );

  setStoredSpreadsheetId('inventory', spreadsheetId);
  return { spreadsheetId, spreadsheetUrl };
};

/**
 * 2. CREATE GOOGLE SPREADSHEET FOR CUSTOMERS & VEHICLES (ประวัติลูกค้าและรถยนต์)
 */
export const createCustomersSpreadsheet = async (
  garageName: string = 'อู่สงกรานต์ ช่างไมค์ 061-069-2036',
  customers: Customer[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อนดำเนินการ หรือใช้ปุ่ม "คัดลอกข้อมูลไปวางใน Google Sheets" ได้ทันที');
  }

  const title = `[อู่สงกรานต์] ประวัติลูกค้าและข้อมูลรถยนต์ (Customers & Vehicles CRM) - ${new Date().toLocaleDateString('th-TH')}`;

  const headers = [
    'รหัสลูกค้า (Customer ID)',
    'ชื่อ-นามสกุลลูกค้า',
    'เบอร์โทรศัพท์ติดต่อ',
    'LINE ID',
    'อีเมล',
    'ที่อยู่ลูกค้า',
    'ทะเบียนรถยนต์',
    'ยี่ห้อรถยนต์',
    'รุ่นรถยนต์',
    'ปีผลิต',
    'สีตัวรถ',
    'เลขไมล์ล่าสุด (กม.)',
    'วันที่เข้ารับบริการล่าสุด',
    'จำนวนครั้งที่เข้ารับบริการ',
    'ยอดใช้จ่ายสะสม (บาท)',
    'วันที่บันทึกลูกค้าครั้งแรก',
    'อัปเดตระบบล่าสุด',
  ];

  const rows: any[][] = [];
  customers.forEach((c) => {
    if (c.vehicles && c.vehicles.length > 0) {
      c.vehicles.forEach((v) => {
        rows.push([
          c.id,
          c.name,
          c.phone,
          c.lineId || '-',
          c.email || '-',
          c.address || '-',
          v.licensePlate,
          v.brand,
          v.model,
          v.year || '-',
          v.color || '-',
          v.lastMileage || 0,
          v.lastServiceDate || '-',
          c.totalVisits,
          c.totalSpent,
          c.createdAt.slice(0, 10),
          new Date().toLocaleString('th-TH'),
        ]);
      });
    } else {
      rows.push([
        c.id,
        c.name,
        c.phone,
        c.lineId || '-',
        c.email || '-',
        c.address || '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        0,
        '-',
        c.totalVisits,
        c.totalSpent,
        c.createdAt.slice(0, 10),
        new Date().toLocaleString('th-TH'),
      ]);
    }
  });

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'ประวัติลูกค้าและรถยนต์',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredGoogleToken();
      throw new Error('Google Token หมดอายุ กรุณาคลิก "เชื่อมต่อบัญชี Google" ใหม่อีกครั้ง');
    }
    const errText = await res.text();
    throw new Error(`สร้าง Google Spreadsheet ไม่สำเร็จ (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const range = encodeURIComponent("'ประวัติลูกค้าและรถยนต์'!A1:Q");
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    }
  );

  setStoredSpreadsheetId('customers', spreadsheetId);
  return { spreadsheetId, spreadsheetUrl };
};

/**
 * 3. REAL-TIME SYNC INVENTORY DATA TO EXISTING SPREADSHEET
 */
export const syncInventoryToGoogleSheet = async (
  spreadsheetId: string,
  parts: SparePart[]
): Promise<boolean> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อนซิงค์');
  }

  const targetSheetTitle = await resolveSheetRange(token, spreadsheetId, 'คลังสต็อกอะไหล่');

  const headers = [
    'รหัสอะไหล่ (Part Code)',
    'ชื่ออะไหล่ / รายการสินค้า',
    'หมวดหมู่อะไหล่',
    'ยี่ห้อ / แบรนด์',
    'รุ่นรถยนต์ที่รองรับ',
    'หน่วยนับ',
    'จำนวนคงเหลือ',
    'จุดสั่งซื้อขั้นต่ำ',
    'สถานะสต็อก',
    'ราคาต้นทุน (บาท)',
    'ราคาขายหน้าร้าน (บาท)',
    'มูลค่าสต็อกรวม (บาท)',
    'ตำแหน่งจัดเก็บ (Rack)',
    'ผู้จำหน่าย / Supplier',
    'วันที่เติมสต็อกล่าสุด',
    'อัปเดตระบบล่าสุด',
  ];

  const rows = parts.map((p) => {
    const isLow = p.stockQty <= p.minStockQty;
    const isOut = p.stockQty <= 0;
    const statusText = isOut ? '🚨 สินค้าหมด' : isLow ? '⚠️ สต็อกต่ำกว่าเกณฑ์' : '✅ พร้อมจำหน่าย';
    const totalCost = p.stockQty * p.costPrice;

    return [
      p.partCode,
      p.name,
      p.category,
      p.brand,
      p.compatibleModels,
      p.unit,
      p.stockQty,
      p.minStockQty,
      statusText,
      p.costPrice,
      p.sellPrice,
      totalCost,
      p.locationRack || '-',
      p.supplier || '-',
      p.lastRestockedAt || '-',
      new Date().toLocaleString('th-TH'),
    ];
  });

  const range = encodeURIComponent(`'${targetSheetTitle}'!A1:P`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredGoogleToken();
      throw new Error('Google Token หมดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง');
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.error?.message || `การซิงค์ล้มเหลว (${res.status}): ${res.statusText}`
    );
  }

  return true;
};

/**
 * 4. REAL-TIME SYNC CUSTOMERS DATA TO EXISTING SPREADSHEET
 */
export const syncCustomersToGoogleSheet = async (
  spreadsheetId: string,
  customers: Customer[]
): Promise<boolean> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อนซิงค์');
  }

  const targetSheetTitle = await resolveSheetRange(token, spreadsheetId, 'ประวัติลูกค้าและรถยนต์');

  const headers = [
    'รหัสลูกค้า (Customer ID)',
    'ชื่อ-นามสกุลลูกค้า',
    'เบอร์โทรศัพท์ติดต่อ',
    'LINE ID',
    'อีเมล',
    'ที่อยู่ลูกค้า',
    'ทะเบียนรถยนต์',
    'ยี่ห้อรถยนต์',
    'รุ่นรถยนต์',
    'ปีผลิต',
    'สีตัวรถ',
    'เลขไมล์ล่าสุด (กม.)',
    'วันที่เข้ารับบริการล่าสุด',
    'จำนวนครั้งที่เข้ารับบริการ',
    'ยอดใช้จ่ายสะสม (บาท)',
    'วันที่บันทึกลูกค้าครั้งแรก',
    'อัปเดตระบบล่าสุด',
  ];

  const rows: any[][] = [];
  customers.forEach((c) => {
    if (c.vehicles && c.vehicles.length > 0) {
      c.vehicles.forEach((v) => {
        rows.push([
          c.id,
          c.name,
          c.phone,
          c.lineId || '-',
          c.email || '-',
          c.address || '-',
          v.licensePlate,
          v.brand,
          v.model,
          v.year || '-',
          v.color || '-',
          v.lastMileage || 0,
          v.lastServiceDate || '-',
          c.totalVisits,
          c.totalSpent,
          c.createdAt.slice(0, 10),
          new Date().toLocaleString('th-TH'),
        ]);
      });
    } else {
      rows.push([
        c.id,
        c.name,
        c.phone,
        c.lineId || '-',
        c.email || '-',
        c.address || '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        0,
        '-',
        c.totalVisits,
        c.totalSpent,
        c.createdAt.slice(0, 10),
        new Date().toLocaleString('th-TH'),
      ]);
    }
  });

  const range = encodeURIComponent(`'${targetSheetTitle}'!A1:Q`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredGoogleToken();
      throw new Error('Google Token หมดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง');
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.error?.message || `การซิงค์ล้มเหลว (${res.status}): ${res.statusText}`
    );
  }

  return true;
};

/**
 * 4.1 REAL-TIME SYNC JOB ORDERS TO SPREADSHEET (ใบสั่งซ่อมและสถานะงาน)
 */
export const syncJobOrdersToGoogleSheet = async (
  spreadsheetId: string,
  jobs: JobOrder[]
): Promise<boolean> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อนซิงค์');
  }

  const targetSheetTitle = await resolveSheetRange(token, spreadsheetId, 'ใบสั่งซ่อมและสถานะ');

  const headers = [
    'เลขที่ใบสั่งซ่อม (Job No)',
    'วันที่รับรถ',
    'ทะเบียนรถยนต์',
    'ยี่ห้อ / รุ่นรถ',
    'ชื่อลูกค้า',
    'เบอร์โทรลูกค้า',
    'อาการเสียที่แจ้ง / งานที่ทำ',
    'บันทึกช่างเทคนิค',
    'ช่างผู้รับผิดชอบ',
    'ช่องซ่อม (Bay)',
    'สถานะงานซ่อม',
    'ความเร่งด่วน',
    'ค่าแรง (บาท)',
    'ค่าอะไหล่รวม (บาท)',
    'ส่วนลด (บาท)',
    'ยอดรวมสุทธิ (บาท)',
    'สถานะชำระเงิน',
    'ช่องทางชำระ',
    'ยอดมัดจำ (บาท)',
    'กำหนดส่งมอบรถ',
    'อัปเดตระบบล่าสุด',
  ];

  const getStatusText = (s: string) => {
    switch (s) {
      case 'pending': return '⏳ รอดำเนินการ';
      case 'inspecting': return '🔍 กำลังตรวจเช็ค';
      case 'waiting_parts': return '📦 รออะไหล่';
      case 'in_progress': return '🔧 กำลังดำเนินการซ่อม';
      case 'qc': return '🧪 ทดสอบ QC';
      case 'completed': return '✅ ซ่อมเสร็จแล้ว (รอส่งมอบ)';
      case 'delivered': return '🚗 ส่งมอบรถเรียบร้อย';
      case 'closed': return '🏁 ปิดใบซ่อมเรียบร้อย';
      case 'cancelled': return '❌ ยกเลิก';
      default: return s;
    }
  };

  const getPriorityText = (p: string) => {
    switch (p) {
      case 'urgent': return '🔥 ด่วนพิเศษ';
      case 'high': return '⚡ ด่วน';
      case 'medium': return '🔹 ปานกลาง';
      default: return '🟢 ปกติ';
    }
  };

  const getPaymentStatusText = (ps: string) => {
    switch (ps) {
      case 'paid': return '✅ ชำระครบแล้ว';
      case 'deposit': return '🟡 มัดจำบางส่วน';
      case 'unpaid': return '🔴 ยังไม่ชำระ';
      case 'refunded': return '⚪ คืนเงิน';
      default: return ps;
    }
  };

  const rows = jobs.map((j) => {
    const partsTotal = (j.partsUsed || []).reduce((acc, p) => acc + (p.totalPrice ?? (p.unitPrice * p.quantity)), 0);
    return [
      j.jobNo,
      j.receivedDate || j.createdAt.slice(0, 10),
      j.licensePlate,
      `${j.carBrand} ${j.carModel}`,
      j.customerName,
      j.customerPhone,
      j.issueDescription || '-',
      j.technicianNotes || '-',
      j.mechanicName || 'ช่างไมค์',
      j.bayNumber ? `ช่องที่ ${j.bayNumber}` : '-',
      getStatusText(j.status),
      getPriorityText(j.priority),
      j.laborFee || 0,
      partsTotal,
      j.discount || 0,
      j.totalAmount,
      getPaymentStatusText(j.paymentStatus),
      j.paymentMethod || 'PromptPay',
      j.depositAmount || 0,
      j.estimatedCompletionDate || '-',
      new Date().toLocaleString('th-TH'),
    ];
  });

  const range = encodeURIComponent(`'${targetSheetTitle}'!A1:U`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredGoogleToken();
      throw new Error('Google Token หมดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง');
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.error?.message || `การซิงค์ใบสั่งซ่อมล้มเหลว (${res.status}): ${res.statusText}`
    );
  }

  return true;
};

/**
 * 4.2 REAL-TIME FINANCIAL & GARAGE SUMMARY TO SPREADSHEET
 */
export const syncFinancialSummaryToGoogleSheet = async (
  spreadsheetId: string,
  jobs: JobOrder[],
  parts: SparePart[]
): Promise<boolean> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อนซิงค์');
  }

  const targetSheetTitle = await resolveSheetRange(token, spreadsheetId, 'สรุปภาพรวมและการเงิน');

  const totalRevenue = jobs.reduce((acc, j) => acc + (j.totalAmount || 0), 0);
  const paidRevenue = jobs
    .filter((j) => j.paymentStatus === 'paid')
    .reduce((acc, j) => acc + (j.totalAmount || 0), 0);
  const unpaidRevenue = jobs
    .filter((j) => j.paymentStatus === 'unpaid')
    .reduce((acc, j) => acc + (j.totalAmount || 0), 0);
  const depositRevenue = jobs
    .filter((j) => j.paymentStatus === 'deposit')
    .reduce((acc, j) => acc + (j.depositAmount || 0), 0);

  const activeJobs = jobs.filter((j) => j.status === 'in_progress' || j.status === 'pending').length;
  const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'delivered' || j.status === 'closed').length;

  const totalInventoryValue = parts.reduce((acc, p) => acc + (p.stockQty * p.costPrice), 0);
  const lowStockCount = parts.filter((p) => p.stockQty <= p.minStockQty).length;

  const summaryData = [
    ['📊 รายงานสรุปสถานะอู่สงกรานต์ (Real-time Dashboard Summary)', ''],
    ['อัปเดตข้อมูลล่าสุดเมื่อ', new Date().toLocaleString('th-TH')],
    ['รหัส Google Spreadsheet ID', spreadsheetId],
    ['สถานะการเชื่อมต่อ', '🟢 เชื่อมต่อเรียลไทม์ (Live Connected)'],
    ['', ''],
    ['หมวดหมู่ตัวชี้วัด (KPIs)', 'ค่าปัจจุบัน (บาท / คัน / รายการ)'],
    ['ยอดขาย / มูลค่างานซ่อมทั้งหมด (Total Revenue)', `฿${totalRevenue.toLocaleString()}`],
    ['ยอดเงินที่เก็บแล้ว (Paid Revenue)', `฿${paidRevenue.toLocaleString()}`],
    ['ยอดเงินมัดจำ (Deposit Collected)', `฿${depositRevenue.toLocaleString()}`],
    ['ยอดค้างชำระ (Pending Payment)', `฿${unpaidRevenue.toLocaleString()}`],
    ['จำนวนใบสั่งซ่อมทั้งหมด (Total Jobs)', `${jobs.length} ใบ`],
    ['งานซ่อมที่กำลังดำเนินการ (Active Jobs)', `${activeJobs} คัน`],
    ['งานซ่อมที่สำเร็จแล้ว (Completed / Delivered)', `${completedJobs} คัน`],
    ['มูลค่าสต็อกอะไหล่รวมราคาทุน (Inventory Value)', `฿${totalInventoryValue.toLocaleString()}`],
    ['จำนวนรายการอะไหล่ทั้งหมด (SKU)', `${parts.length} รายการ`],
    ['อะไหล่ที่สต็อกต่ำกว่าเกณฑ์ / ต้องสั่งซื้อ (Low Stock)', `${lowStockCount} รายการ`],
    ['', ''],
    ['ช่างผู้รับผิดชอบหลัก & เบอร์ติดต่อ', 'ช่างไมค์ (สงกรานต์) โทร. 061-069-2036 | LINE: chaiwatmike'],
  ];

  const range = encodeURIComponent(`'${targetSheetTitle}'!A1:B18`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: summaryData,
      }),
    }
  );

  return res.ok;
};

/**
 * 4.3 ALL-IN-ONE REAL-TIME SYNC TO GOOGLE SPREADSHEET
 */
export const syncAllToGoogleSheet = async (
  spreadsheetId: string,
  data: {
    parts: SparePart[];
    customers: Customer[];
    jobOrders: JobOrder[];
  }
): Promise<{ success: boolean; syncedTabs: string[]; errors: string[] }> => {
  const targetId = spreadsheetId || TARGET_SPREADSHEET_ID;
  const token = getStoredGoogleToken();
  if (!token) {
    return {
      success: false,
      syncedTabs: [],
      errors: ['ยังไม่ได้เชื่อมต่อบัญชี Google: กรุณาคลิกปุ่ม "เชื่อมต่อบัญชี Google" ด้านบนก่อนซิงค์'],
    };
  }

  const syncedTabs: string[] = [];
  const errors: string[] = [];

  // 1. Inventory Tab
  try {
    if (data.parts && data.parts.length > 0) {
      await syncInventoryToGoogleSheet(targetId, data.parts);
      syncedTabs.push('คลังสต็อกอะไหล่');
    }
  } catch (err: any) {
    errors.push(`สต็อกอะไหล่: ${err?.message || err}`);
  }

  // 2. Job Orders Tab
  try {
    if (data.jobOrders && data.jobOrders.length > 0) {
      await syncJobOrdersToGoogleSheet(targetId, data.jobOrders);
      syncedTabs.push('ใบสั่งซ่อมและสถานะ');
    }
  } catch (err: any) {
    errors.push(`ใบสั่งซ่อม: ${err?.message || err}`);
  }

  // 3. Customers Tab
  try {
    if (data.customers && data.customers.length > 0) {
      await syncCustomersToGoogleSheet(targetId, data.customers);
      syncedTabs.push('ประวัติลูกค้าและรถยนต์');
    }
  } catch (err: any) {
    errors.push(`ประวัติลูกค้า: ${err?.message || err}`);
  }

  // 4. Financial Summary Tab
  try {
    if (data.jobOrders && data.parts) {
      await syncFinancialSummaryToGoogleSheet(targetId, data.jobOrders, data.parts);
      syncedTabs.push('สรุปภาพรวมและการเงิน');
    }
  } catch (err: any) {
    errors.push(`สรุปการเงิน: ${err?.message || err}`);
  }

  setStoredSpreadsheetId('all', targetId);

  return {
    success: syncedTabs.length > 0,
    syncedTabs,
    errors,
  };
};

/**
 * 4.4 READ DATA FROM GOOGLE SPREADSHEET (Two-way reading)
 */
export const readSheetValues = async (
  spreadsheetId: string,
  sheetTitle: string
): Promise<any[][]> => {
  const token = getStoredGoogleToken();
  if (!token) {
    throw new Error('ยังไม่ได้เชื่อมต่อบัญชี Google (ไม่พบ Token): กรุณากดปุ่ม "เชื่อมต่อบัญชี Google" ก่อน');
  }

  const range = encodeURIComponent(`'${sheetTitle}'!A1:Z1000`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`อ่านข้อมูลชีตไม่สำเร็จ (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return data.values || [];
};

/**
 * 4.5 GENERATE GOOGLE APPS SCRIPT CODE FOR 2-WAY REAL-TIME WEBHOOK
 */
export const generateGoogleAppsScriptCode = (spreadsheetId: string = TARGET_SPREADSHEET_ID): string => {
  return `/**
 * =====================================================================
 * Google Apps Script สำหรับอู่สงกรานต์ (ช่างไมค์) โทร. 061-069-2036
 * เชื่อมต่อกับ Google Spreadsheet ID: ${spreadsheetId} แบบ Real-time
 * =====================================================================
 * วิธีติดตั้ง:
 * 1. ใน Google Sheet (${spreadsheetId}) ไปที่เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 2. ลบโค้ดเดิมแล้ววางโค้ดชุดนี้ลงไป
 * 3. กด "บันทึก" (Ctrl+S หรือรูปแผ่นดิสก์)
 * 4. คลิก "ทริกเกอร์" (Triggers - ไอคอนรูปนาฬิกาด้านซ้าย) > "เพิ่มทริกเกอร์" (Add Trigger)
 *    - ฟังก์ชันที่จะทำงาน: onSpreadsheetEdit
 *    - แหล่งที่มาของเหตุการณ์: จากสเปรดชีต
 *    - ประเภทเหตุการณ์: เมื่อแก้ไข (On edit)
 */

function onSpreadsheetEdit(e) {
  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();
  var editedRange = e.range;
  var row = editedRange.getRow();
  var col = editedRange.getColumn();
  var newValue = e.value;
  var oldValue = e.oldValue;

  Logger.log('มีการแก้ไขชีต: ' + sheetName + ' แถว: ' + row + ' คอลัมน์: ' + col + ' ค่าใหม่: ' + newValue);

  // บันทึกเวลาอัปเดตอัตโนมัติที่คอลัมน์สุดท้าย
  if (row > 1) {
    var lastCol = sheet.getLastColumn();
    sheet.getRange(row, lastCol).setValue(Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"));
  }
}

/**
 * ฟังก์ชันสำหรับดึงข้อมูลสรุปแบบ JSON ผ่าน Web App API
 */
function doGet(e) {
  var ss = SpreadsheetApp.openById('${spreadsheetId}');
  var result = {
    status: 'connected',
    spreadsheetId: '${spreadsheetId}',
    timestamp: new Date().toISOString(),
    sheets: []
  };

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    result.sheets.push({
      name: sheets[i].getName(),
      rows: sheets[i].getLastRow(),
      cols: sheets[i].getLastColumn()
    });
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
};

/**
 * Diagnostic helper: Tests connectivity to Google Sheets API and target spreadsheet
 */
export const testGoogleSheetsConnection = async (
  spreadsheetId?: string | null
): Promise<{
  connected: boolean;
  authenticated: boolean;
  email?: string;
  spreadsheetTitle?: string;
  latencyMs: number;
  message: string;
}> => {
  const startTime = Date.now();
  const token = getStoredGoogleToken();

  if (!token) {
    return {
      connected: false,
      authenticated: false,
      latencyMs: 0,
      message: 'ยังไม่ได้เชื่อมต่อบัญชี Google (คลิกปุ่ม "เชื่อมต่อบัญชี Google" เพื่อเปิดสิทธิ์การใช้งาน)',
    };
  }

  try {
    // 1. Verify token
    const tokenInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
    );
    if (!tokenInfoRes.ok) {
      clearStoredGoogleToken();
      return {
        connected: false,
        authenticated: false,
        latencyMs: Date.now() - startTime,
        message: 'Google OAuth Token หมดอายุแล้ว กรุณาเชื่อมต่อใหม่อีกครั้ง',
      };
    }

    const tokenInfo = await tokenInfoRes.json();
    const email = tokenInfo.email || getStoredGoogleEmail() || 'Google Account';

    // 2. If spreadsheetId provided, test spreadsheet read
    if (spreadsheetId && isRealGoogleSpreadsheetId(spreadsheetId)) {
      const sheetRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        const latency = Date.now() - startTime;
        return {
          connected: true,
          authenticated: true,
          email,
          spreadsheetTitle: sheetData.properties?.title,
          latencyMs: latency,
          message: `เชื่อมต่อ Google Sheets API สำเร็จ! บัญชี: ${email} | ไฟล์: "${sheetData.properties?.title}" (${latency}ms)`,
        };
      } else {
        const latency = Date.now() - startTime;
        return {
          connected: false,
          authenticated: true,
          email,
          latencyMs: latency,
          message: `เชื่อมต่อบัญชี Google สำเร็จ (${email}) แต่ไม่สามารถเข้าถึงไฟล์ Sheet (${sheetRes.status}): กรุณาตรวจสอบสิทธิ์การเข้าถึง`,
        };
      }
    }

    const latency = Date.now() - startTime;
    return {
      connected: true,
      authenticated: true,
      email,
      latencyMs: latency,
      message: `เชื่อมต่อ Google Sheets API สำเร็จ! บัญชี: ${email} (${latency}ms)`,
    };
  } catch (err: any) {
    return {
      connected: false,
      authenticated: false,
      latencyMs: Date.now() - startTime,
      message: `เกิดข้อผิดพลาดในการทดสอบ Google Sheets: ${err?.message || 'Network error'}`,
    };
  }
};

/**
 * 5. EXPORT CSV DATA (Instant Download)
 */
export const downloadCsvFile = (filename: string, rows: (string | number)[][]) => {
  const csvContent =
    '\uFEFF' +
    rows
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyTableToClipboard = (headers: string[], rows: (string | number)[][]): boolean => {
  try {
    const text = [
      headers.join('\t'),
      ...rows.map((r) => r.map((c) => String(c || '').replace(/\t/g, ' ')).join('\t')),
    ].join('\n');
    navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export interface FetchedSheetData {
  sheetTitle: string;
  headers: string[];
  rows: (string | number)[][];
  totalRows: number;
  fetchedAt: string;
  source: 'google_api' | 'gviz_web' | 'csv_stream';
  spreadsheetId: string;
  spreadsheetTitle?: string;
  availableSheets?: string[];
}

/**
 * CSV parser with support for quotes and escaped characters
 */
export const parseCsvText = (csvText: string): string[][] => {
  const result: string[][] = [];
  const lines = csvText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }
  return result;
};

/**
 * Parses Google Visualization API (GViz) response into tabular rows
 */
export const parseGvizResponse = (
  gvizText: string
): { headers: string[]; rows: (string | number)[][] } => {
  const jsonStart = gvizText.indexOf('{');
  const jsonEnd = gvizText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('รูปแบบข้อมูล GViz ไม่ถูกต้อง');
  }
  const rawJson = gvizText.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(rawJson);
  const table = data.table;
  if (!table) {
    throw new Error('ไม่พบตารางข้อมูลในผลลัพธ์ของ Google Sheet');
  }

  const headers: string[] = (table.cols || []).map((col: any, idx: number) => {
    return col.label && col.label.trim() ? col.label.trim() : `คอลัมน์ ${idx + 1}`;
  });

  const rows: (string | number)[][] = [];
  if (Array.isArray(table.rows)) {
    for (const r of table.rows) {
      if (!r || !Array.isArray(r.c)) continue;
      const rowData = r.c.map((cell: any) => {
        if (!cell || cell.v === null || cell.v === undefined) return '';
        // If there is formatted value cell.f, use it when appropriate, otherwise cell.v
        return cell.f !== undefined && isNaN(Number(cell.v)) ? cell.f : cell.v;
      });
      // Skip completely empty rows
      if (rowData.some((c: any) => c !== '')) {
        rows.push(rowData);
      }
    }
  }

  return { headers, rows };
};

/**
 * 6. TWO-WAY REAL-TIME: FETCH LIVE DATA DIRECTLY FROM CONNECTED GOOGLE SHEET
 * Supports Google Sheets API v4 with OAuth token, with automatic fallback to Google Sheets GViz Web Stream
 */
export const fetchSheetDataFromGoogle = async (
  spreadsheetId: string = TARGET_SPREADSHEET_ID,
  sheetTitle: string = 'คลังสต็อกอะไหล่'
): Promise<FetchedSheetData> => {
  const targetId = spreadsheetId || TARGET_SPREADSHEET_ID;
  const token = getStoredGoogleToken();
  let spreadsheetTitle: string | undefined;
  let availableSheets: string[] = [
    'คลังสต็อกอะไหล่',
    'ใบสั่งซ่อมและสถานะ',
    'ประวัติลูกค้าและรถยนต์',
    'สรุปภาพรวมและการเงิน',
  ];

  // 1. First Attempt: Official Google Sheets API v4 (if token is available)
  if (token) {
    try {
      // Fetch spreadsheet meta
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetId}?fields=properties.title,sheets.properties.title`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (metaRes.ok) {
        const meta = await metaRes.json();
        spreadsheetTitle = meta.properties?.title;
        if (meta.sheets && Array.isArray(meta.sheets)) {
          availableSheets = meta.sheets.map((s: any) => s.properties?.title).filter(Boolean);
        }
      }

      // Check if requested sheetTitle exists, otherwise use first available sheet
      const targetSheet = availableSheets.includes(sheetTitle)
        ? sheetTitle
        : availableSheets[0] || sheetTitle;

      const range = encodeURIComponent(`'${targetSheet}'!A1:Z500`);
      const valRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${range}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (valRes.ok) {
        const valData = await valRes.json();
        const rawValues: any[][] = valData.values || [];

        if (rawValues.length > 0) {
          const headers = rawValues[0].map((h: any) => String(h || ''));
          const rows = rawValues.slice(1);
          return {
            sheetTitle: targetSheet,
            headers,
            rows,
            totalRows: rows.length,
            fetchedAt: new Date().toLocaleTimeString('th-TH'),
            source: 'google_api',
            spreadsheetId: targetId,
            spreadsheetTitle,
            availableSheets,
          };
        }
      }
    } catch (e) {
      console.warn('Google Sheets API v4 fetch notice, attempting web stream:', e);
    }
  }

  // 2. Second Attempt: Google Visualization Query API (Live Web Stream)
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${targetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetTitle
    )}`;
    const gvizRes = await fetch(gvizUrl);
    if (gvizRes.ok) {
      const gvizText = await gvizRes.text();
      if (gvizText.includes('google.visualization.Query.setResponse')) {
        const { headers, rows } = parseGvizResponse(gvizText);
        return {
          sheetTitle,
          headers,
          rows,
          totalRows: rows.length,
          fetchedAt: new Date().toLocaleTimeString('th-TH'),
          source: 'gviz_web',
          spreadsheetId: targetId,
          spreadsheetTitle: spreadsheetTitle || `Google Sheet (${targetId.slice(0, 8)}...)`,
          availableSheets,
        };
      }
    }
  } catch (e) {
    console.warn('GViz web stream fetch notice, trying CSV export:', e);
  }

  // 3. Third Attempt: Direct CSV export endpoint
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${targetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      sheetTitle
    )}`;
    const csvRes = await fetch(csvUrl);
    if (csvRes.ok) {
      const csvText = await csvRes.text();
      const allRows = parseCsvText(csvText);
      if (allRows.length > 0) {
        const headers = allRows[0];
        const rows = allRows.slice(1);
        return {
          sheetTitle,
          headers,
          rows,
          totalRows: rows.length,
          fetchedAt: new Date().toLocaleTimeString('th-TH'),
          source: 'csv_stream',
          spreadsheetId: targetId,
          spreadsheetTitle: spreadsheetTitle || `Google Sheet (${targetId.slice(0, 8)}...)`,
          availableSheets,
        };
      }
    }
  } catch (e) {
    console.warn('CSV export endpoint error:', e);
  }

  throw new Error(
    `ไม่สามารถดึงข้อมูลจาก Google Sheets (ID: ${targetId}) ได้ในขณะนี้ กรุณาตรวจสอบสิทธิ์การแชร์ของชีต หรือคลิก "เชื่อมต่อบัญชี Google" อีกครั้ง`
  );
};

/**
 * Helper to convert fetched rows into SparePart items
 */
export const parseSparePartsFromRows = (
  headers: string[],
  rows: (string | number)[][]
): SparePart[] => {
  const findIdx = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k.toLowerCase())));

  const codeIdx = findIdx(['รหัส', 'code', 'part code']);
  const nameIdx = findIdx(['ชื่อ', 'name', 'รายการ']);
  const catIdx = findIdx(['หมวด', 'category']);
  const brandIdx = findIdx(['ยี่ห้อ', 'brand']);
  const modelIdx = findIdx(['รุ่น', 'model']);
  const unitIdx = findIdx(['หน่วย', 'unit']);
  const qtyIdx = findIdx(['คงเหลือ', 'qty', 'จำนวน']);
  const minIdx = findIdx(['ขั้นต่ำ', 'min']);
  const costIdx = findIdx(['ต้นทุน', 'cost']);
  const sellIdx = findIdx(['ขาย', 'sell', 'ราคาขาย']);
  const rackIdx = findIdx(['ตำแหน่ง', 'rack', 'จัดเก็บ']);
  const supIdx = findIdx(['ผู้จำหน่าย', 'supplier']);

  return rows
    .filter((r) => r.length > 0 && String(r[codeIdx >= 0 ? codeIdx : 0] || r[nameIdx >= 0 ? nameIdx : 1] || '').trim())
    .map((r, index) => {
      const partCode = String(codeIdx >= 0 ? r[codeIdx] : r[0] || `PART-${index + 1}`).trim();
      const name = String(nameIdx >= 0 ? r[nameIdx] : r[1] || `อะไหล่ ${partCode}`).trim();
      const category = (catIdx >= 0 ? String(r[catIdx] || 'ทั่วไป') : 'ทั่วไป') as any;
      const brand = brandIdx >= 0 ? String(r[brandIdx] || 'OEM') : 'OEM';
      const compatibleModels = modelIdx >= 0 ? String(r[modelIdx] || 'รถยนต์ทั่วไป') : 'รถยนต์ทั่วไป';
      const unit = unitIdx >= 0 ? String(r[unitIdx] || 'ชิ้น') : 'ชิ้น';
      const stockQty = Number(qtyIdx >= 0 ? r[qtyIdx] : r[6]) || 0;
      const minStockQty = Number(minIdx >= 0 ? r[minIdx] : r[7]) || 1;
      const costPrice = Number(costIdx >= 0 ? r[costIdx] : r[9]) || 0;
      const sellPrice = Number(sellIdx >= 0 ? r[sellIdx] : r[10]) || Math.round(costPrice * 1.3);
      const locationRack = rackIdx >= 0 ? String(r[rackIdx] || '') : '';
      const supplier = supIdx >= 0 ? String(r[supIdx] || '') : '';

      return {
        id: `part-sheet-${index + 1}-${Date.now().toString().slice(-4)}`,
        partCode,
        name,
        category,
        brand,
        compatibleModels,
        unit,
        stockQty,
        minStockQty,
        costPrice,
        sellPrice,
        locationRack,
        supplier,
        lastRestockedAt: new Date().toISOString(),
      };
    });
};

/**
 * Helper to convert fetched rows into Customer items (grouped by phone/ID)
 */
export const parseCustomersFromRows = (
  headers: string[],
  rows: (string | number)[][]
): Customer[] => {
  const findIdx = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k.toLowerCase())));

  const idIdx = findIdx(['รหัสลูกค้า', 'id', 'customer id']);
  const nameIdx = findIdx(['ชื่อ', 'name', 'ลูกค้า']);
  const phoneIdx = findIdx(['เบอร์', 'โทร', 'phone']);
  const lineIdx = findIdx(['line', 'ไลน์']);
  const emailIdx = findIdx(['อีเมล', 'email']);
  const addressIdx = findIdx(['ที่อยู่', 'address']);
  const plateIdx = findIdx(['ทะเบียน', 'plate', 'license']);
  const brandIdx = findIdx(['ยี่ห้อ', 'brand']);
  const modelIdx = findIdx(['รุ่น', 'model']);
  const yearIdx = findIdx(['ปี', 'year']);
  const colorIdx = findIdx(['สี', 'color']);
  const mileageIdx = findIdx(['ไมล์', 'mileage']);
  const lastDateIdx = findIdx(['วันที่เข้า', 'ล่าสุด', 'service date']);
  const visitsIdx = findIdx(['จำนวนครั้ง', 'ครั้ง', 'visits']);
  const spentIdx = findIdx(['ใช้จ่ายสะสม', 'ยอดใช้จ่าย', 'spent']);

  const customerMap = new Map<string, Customer>();

  rows.forEach((r, index) => {
    if (!r || r.length === 0) return;
    const name = String(nameIdx >= 0 ? r[nameIdx] : r[1] || '').trim();
    const phone = String(phoneIdx >= 0 ? r[phoneIdx] : r[2] || '').trim();
    if (!name && !phone) return;

    const key = (phone || name).toLowerCase();
    const custId = String(idIdx >= 0 && r[idIdx] ? r[idIdx] : `cust-${index + 1}`).trim();
    const lineId = lineIdx >= 0 ? String(r[lineIdx] || '').trim() : '';
    const email = emailIdx >= 0 ? String(r[emailIdx] || '').trim() : '';
    const address = addressIdx >= 0 ? String(r[addressIdx] || '').trim() : '';
    const plate = plateIdx >= 0 ? String(r[plateIdx] || '').trim() : '';
    const brand = brandIdx >= 0 ? String(r[brandIdx] || 'Toyota').trim() : 'Toyota';
    const model = modelIdx >= 0 ? String(r[modelIdx] || 'Corolla').trim() : 'Corolla';
    const year = yearIdx >= 0 ? String(r[yearIdx] || '2020').trim() : '2020';
    const color = colorIdx >= 0 ? String(r[colorIdx] || 'ขาว').trim() : 'ขาว';
    const mileage = Number(mileageIdx >= 0 ? r[mileageIdx] : 50000) || 50000;
    const lastServiceDate = lastDateIdx >= 0 ? String(r[lastDateIdx] || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    const visits = Number(visitsIdx >= 0 ? r[visitsIdx] : 1) || 1;
    const spent = Number(spentIdx >= 0 ? r[spentIdx] : 0) || 0;

    const newVehicle = plate
      ? {
          id: `veh-${index + 1}-${plate.replace(/[^a-zA-Z0-9]/g, '')}`,
          licensePlate: plate,
          brand,
          model,
          year,
          color,
          lastMileage: mileage,
          lastServiceDate,
        }
      : null;

    if (customerMap.has(key)) {
      const existing = customerMap.get(key)!;
      if (newVehicle && !existing.vehicles.some((v) => v.licensePlate === newVehicle.licensePlate)) {
        existing.vehicles.push(newVehicle);
      }
      existing.totalVisits = Math.max(existing.totalVisits, visits);
      existing.totalSpent = Math.max(existing.totalSpent, spent);
      if (address && !existing.address) existing.address = address;
      if (lineId && !existing.lineId) existing.lineId = lineId;
    } else {
      customerMap.set(key, {
        id: custId || `cust-sheet-${index + 1}`,
        name: name || `ลูกค้า ${phone}`,
        phone: phone || '080-000-0000',
        lineId,
        email,
        address: address || 'นำเข้าจาก Google Sheets',
        vehicles: newVehicle ? [newVehicle] : [],
        totalSpent: spent,
        totalVisits: visits,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return Array.from(customerMap.values());
};

/**
 * Helper to convert fetched rows into JobOrder items
 */
export const parseJobOrdersFromRows = (
  headers: string[],
  rows: (string | number)[][]
): JobOrder[] => {
  const findIdx = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k.toLowerCase())));

  const jobNoIdx = findIdx(['เลขที่', 'job no', 'jobno', 'ใบสั่งซ่อม']);
  const dateIdx = findIdx(['วันที่รับรถ', 'วันที่', 'date']);
  const plateIdx = findIdx(['ทะเบียน', 'plate', 'license']);
  const carIdx = findIdx(['ยี่ห้อ / รุ่น', 'ยี่ห้อ', 'รุ่น', 'brand', 'model']);
  const nameIdx = findIdx(['ชื่อลูกค้า', 'ลูกค้า', 'customer']);
  const phoneIdx = findIdx(['เบอร์โทร', 'phone', 'โทร']);
  const issueIdx = findIdx(['อาการ', 'งานที่ทำ', 'issue']);
  const notesIdx = findIdx(['บันทึกช่าง', 'notes', 'ช่างเทคนิค']);
  const mechanicIdx = findIdx(['ช่างผู้รับผิดชอบ', 'ช่าง', 'mechanic']);
  const bayIdx = findIdx(['ช่องซ่อม', 'bay']);
  const statusIdx = findIdx(['สถานะงาน', 'สถานะ']);
  const laborIdx = findIdx(['ค่าแรง', 'labor']);
  const discountIdx = findIdx(['ส่วนลด', 'discount']);
  const totalIdx = findIdx(['ยอดรวม', 'สุทธิ', 'total']);
  const payStatusIdx = findIdx(['สถานะชำระ', 'ชำระเงิน']);
  const estDateIdx = findIdx(['กำหนดส่งมอบ', 'ส่งมอบ']);

  const seenJobNos = new Set<string>();

  return rows
    .filter((r) => r.length > 0 && String(r[jobNoIdx >= 0 ? jobNoIdx : 0] || r[plateIdx >= 0 ? plateIdx : 2] || '').trim())
    .map((r, index) => {
      let jobNo = String(jobNoIdx >= 0 ? r[jobNoIdx] : r[0] || `JOB-${index + 1}`).trim();
      if (!jobNo) jobNo = `JOB-SHEET-${index + 1}`;
      
      const uniqueSuffix = seenJobNos.has(jobNo) ? `-${index + 1}` : '';
      seenJobNos.add(jobNo);

      const licensePlate = String(plateIdx >= 0 ? r[plateIdx] : r[2] || '').trim();
      const carText = String(carIdx >= 0 ? r[carIdx] : r[3] || 'Toyota').trim();
      const partsOfCar = carText.split(' ');
      const carBrand = partsOfCar[0] || 'Toyota';
      const carModel = partsOfCar.slice(1).join(' ') || carText;
      const customerName = String(nameIdx >= 0 ? r[nameIdx] : r[4] || 'ลูกค้าทั่วไป').trim();
      const customerPhone = String(phoneIdx >= 0 ? r[phoneIdx] : r[5] || '').trim();
      const issueDescription = String(issueIdx >= 0 ? r[issueIdx] : r[6] || 'ตรวจเช็คตามระยะ').trim();
      const technicianNotes = notesIdx >= 0 ? String(r[notesIdx] || '') : '';
      const mechanicName = mechanicIdx >= 0 ? String(r[mechanicIdx] || 'ช่างสงกรานต์') : 'ช่างสงกรานต์';

      const bayText = bayIdx >= 0 ? String(r[bayIdx] || '1') : '1';
      const bayMatch = bayText.match(/\d+/);
      const bayNumber = bayMatch ? parseInt(bayMatch[0], 10) : 1;

      const rawStatus = statusIdx >= 0 ? String(r[statusIdx] || '') : '';
      let status: JobStatus = 'in_progress';
      if (rawStatus.includes('ปิดใบซ่อม') || rawStatus.includes('closed')) {
        status = 'closed';
      } else if (rawStatus.includes('ส่งมอบ') || rawStatus.includes('delivered')) {
        status = 'delivered';
      } else if (rawStatus.includes('ซ่อมเสร็จ') || rawStatus.includes('รอส่งมอบ') || rawStatus.includes('completed')) {
        status = 'completed';
      } else if (rawStatus.includes('รออะไหล่') || rawStatus.includes('waiting')) {
        status = 'waiting_parts';
      } else if (rawStatus.includes('ตรวจเช็ค') || rawStatus.includes('inspect')) {
        status = 'inspecting';
      } else if (rawStatus.includes('QC') || rawStatus.includes('ทดสอบ')) {
        status = 'qc';
      } else if (rawStatus.includes('รับรถ') || rawStatus.includes('รอดำเนินการ') || rawStatus.includes('pending')) {
        status = 'pending';
      }

      const laborFee = Number(laborIdx >= 0 ? r[laborIdx] : 0) || 0;
      const discount = Number(discountIdx >= 0 ? r[discountIdx] : 0) || 0;
      const totalAmount = Number(totalIdx >= 0 ? r[totalIdx] : 0) || 0;

      const rawPayStatus = payStatusIdx >= 0 ? String(r[payStatusIdx] || '') : '';
      let paymentStatus: PaymentStatus = 'unpaid';
      if (rawPayStatus.includes('ชำระครบ') || rawPayStatus.includes('paid')) {
        paymentStatus = 'paid';
      } else if (rawPayStatus.includes('มัดจำ') || rawPayStatus.includes('deposit')) {
        paymentStatus = 'deposit';
      }

      const receivedDate = dateIdx >= 0 ? String(r[dateIdx] || new Date().toISOString()) : new Date().toISOString();
      const estimatedCompletionDate = estDateIdx >= 0 ? String(r[estDateIdx] || '') : '';

      return {
        id: `job-sheet-${jobNo.replace(/[^a-zA-Z0-9]/g, '-')}${uniqueSuffix}`,
        jobNo,
        customerName,
        customerPhone,
        licensePlate,
        carBrand,
        carModel,
        mileage: 45000,
        issueDescription,
        technicianNotes,
        mechanicName,
        bayNumber: Math.min(3, Math.max(1, bayNumber)),
        status,
        priority: 'normal' as const,
        partsUsed: [],
        laborFee,
        discount,
        vatPercent: 7,
        totalAmount,
        paymentStatus,
        paymentMethod: 'transfer' as const,
        paidAmount: paymentStatus === 'paid' ? totalAmount : 0,
        receivedDate,
        estimatedCompletionDate,
        createdAt: receivedDate && !isNaN(new Date(receivedDate).getTime()) ? new Date(receivedDate).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
};

export interface AllSheetsPullResult {
  parts: SparePart[];
  customers: Customer[];
  jobOrders: JobOrder[];
  rawTabs: { [tabName: string]: FetchedSheetData };
  summary: {
    partsCount: number;
    customersCount: number;
    jobsCount: number;
    fetchedAt: string;
  };
}

/**
 * High-performance fetch of all primary sheets in one batch
 */
export const fetchAllSheetsDataFromGoogle = async (
  spreadsheetId: string = TARGET_SPREADSHEET_ID
): Promise<AllSheetsPullResult> => {
  const targetId = spreadsheetId || TARGET_SPREADSHEET_ID;
  const rawTabs: { [tabName: string]: FetchedSheetData } = {};

  let parts: SparePart[] = [];
  let customers: Customer[] = [];
  let jobOrders: JobOrder[] = [];

  // 1. Fetch Parts (Try "คลังสต็อกอะไหล่" first, then fallback "Sheet1")
  try {
    const partsData = await fetchSheetDataFromGoogle(targetId, 'คลังสต็อกอะไหล่');
    rawTabs['คลังสต็อกอะไหล่'] = partsData;
    parts = parseSparePartsFromRows(partsData.headers, partsData.rows);
  } catch (err) {
    console.warn('Fallback to Sheet1 for parts:', err);
    try {
      const sheet1Data = await fetchSheetDataFromGoogle(targetId, 'Sheet1');
      rawTabs['Sheet1'] = sheet1Data;
      parts = parseSparePartsFromRows(sheet1Data.headers, sheet1Data.rows);
    } catch (e2) {
      console.warn('Could not fetch parts from Sheet1 either:', e2);
    }
  }

  // 2. Fetch Customers ("ประวัติลูกค้าและรถยนต์")
  try {
    const custData = await fetchSheetDataFromGoogle(targetId, 'ประวัติลูกค้าและรถยนต์');
    rawTabs['ประวัติลูกค้าและรถยนต์'] = custData;
    customers = parseCustomersFromRows(custData.headers, custData.rows);
  } catch (err) {
    console.warn('Could not fetch customers tab:', err);
  }

  // 3. Fetch Jobs ("ใบสั่งซ่อมและสถานะ")
  try {
    const jobsData = await fetchSheetDataFromGoogle(targetId, 'ใบสั่งซ่อมและสถานะ');
    rawTabs['ใบสั่งซ่อมและสถานะ'] = jobsData;
    jobOrders = parseJobOrdersFromRows(jobsData.headers, jobsData.rows);
  } catch (err) {
    console.warn('Could not fetch job orders tab:', err);
  }

  return {
    parts,
    customers,
    jobOrders,
    rawTabs,
    summary: {
      partsCount: parts.length,
      customersCount: customers.length,
      jobsCount: jobOrders.length,
      fetchedAt: new Date().toLocaleTimeString('th-TH'),
    },
  };
};

