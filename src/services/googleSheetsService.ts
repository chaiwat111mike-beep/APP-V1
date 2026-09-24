import { SparePart, Customer, JobOrder } from '../types';
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
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: scopes.join(' '),
          callback: async (response: any) => {
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
        });
        client.requestAccessToken();
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
  const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'delivered').length;

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
  const syncedTabs: string[] = [];
  const errors: string[] = [];

  const targetId = spreadsheetId || TARGET_SPREADSHEET_ID;

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
  let token = getStoredGoogleToken();
  if (!token) {
    token = await requestGoogleOAuthToken();
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
