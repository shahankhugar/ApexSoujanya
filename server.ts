import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import type {
  Client,
  MonthlyAllocation,
  ContentRequest,
  AuditLog,
  RequestType,
  RequestStatus,
  EditingStatus,
  ScriptVersion,
  PricingSettings,
  AuthUser,
  ScriptAttachment,
} from './src/types.ts';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// Helper to ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface UserCredential {
  email: string;
  password: string;
  user: AuthUser;
}

interface DatabaseSchema {
  clients: Client[];
  allocations: MonthlyAllocation[];
  requests: ContentRequest[];
  auditLogs: AuditLog[];
  pricingSettings: PricingSettings;
  users: UserCredential[];
  googleSheetConfig?: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    title: string;
    lastSyncedAt: string;
    autoSyncOnSubmission: boolean;
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthName(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Initial seed data
function getSeedData(): DatabaseSchema {
  const defaultClient: Client = {
    id: 'client-apex-01',
    name: 'Soujanya',
    businessName: 'Upgrade',
    email: 'Soujanya',
    phone: '+1 (555) 438-9201',
    brandHandle: '@upgrade.media',
    createdAt: '2026-06-01T09:00:00.000Z',
  };

  const secondaryClient: Client = {
    id: 'client-apex-02',
    name: 'Dr. Sarah Jenkins',
    businessName: 'Lumina Aesthetic Clinic',
    email: 'sarah@luminaaesthetics.com',
    phone: '+1 (555) 891-2304',
    brandHandle: '@lumina.aesthetic',
    createdAt: '2026-07-01T10:00:00.000Z',
  };

  const users: UserCredential[] = [
    // Admin accounts (Password: 2029)
    {
      email: 'Shashank',
      password: '2029',
      user: {
        id: 'user-admin-01',
        email: 'Shashank',
        name: 'Shashank',
        role: 'admin',
        title: 'Apexmedia Studio Lead & Director',
        avatarInitials: 'SH',
      },
    },
    {
      email: 'Tanishka',
      password: '2029',
      user: {
        id: 'user-admin-02',
        email: 'Tanishka',
        name: 'Tanishka',
        role: 'admin',
        title: 'Apexmedia Creative Director',
        avatarInitials: 'TA',
      },
    },
    {
      email: 'Navaneet',
      password: '2029',
      user: {
        id: 'user-admin-03',
        email: 'Navaneet',
        name: 'Navaneet',
        role: 'admin',
        title: 'Apexmedia Head of Production',
        avatarInitials: 'NA',
      },
    },
    {
      email: 'admin@apexmedia.com',
      password: '2029',
      user: {
        id: 'user-admin-04',
        email: 'admin@apexmedia.com',
        name: 'Apexmedia Studio Admin',
        role: 'admin',
        title: 'Executive Producer & Studio Director',
        avatarInitials: 'AP',
      },
    },
    // Client account for Upgrade (ID: Soujanya, Password: SoujanyaC21)
    {
      email: 'Soujanya',
      password: 'SoujanyaC21',
      user: {
        id: 'user-client-soujanya',
        email: 'Soujanya',
        name: 'Soujanya',
        role: 'client',
        clientId: defaultClient.id,
        businessName: 'Upgrade',
        title: 'Upgrade Lead',
        avatarInitials: 'SO',
      },
    },
    {
      email: 'sarah@luminaaesthetics.com',
      password: 'apexclient2026!',
      user: {
        id: 'user-client-01',
        email: 'sarah@luminaaesthetics.com',
        name: 'Dr. Sarah Jenkins',
        role: 'client',
        clientId: secondaryClient.id,
        businessName: secondaryClient.businessName,
        title: 'Founder & Medical Director',
        avatarInitials: 'SJ',
      },
    },
  ];

  // Default Pricing Settings
  const pricingSettings: PricingSettings = {
    id: 'pricing-global',
    clientId: defaultClient.id,
    enabled: true, // admin can toggle off to skip entire pricing table
    monthlyRetainer: '$2,500',
    billingCycle: 'Monthly (1st of Month)',
    includedReels: 4,
    includedScripts: 'Unlimited Ideation & Scripting',
    overagePerReel: '$450 per additional produced reel',
    rushFee: '$200 per 48-hr rush delivery',
    currency: 'USD',
    termsNotes: 'Retainer includes 4 full 4K studio/on-location reels with professional color grading & motion captions. Additional reels requested beyond monthly quota billed at standard overage rate upon client approval.',
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: 'Apexmedia Studio Director',
  };

  // Allocations for August 2026 (current), July 2026 (past), June 2026 (past)
  const allocations: MonthlyAllocation[] = [
    {
      id: 'alloc-2026-08-01',
      clientId: defaultClient.id,
      month: 8,
      year: 2026,
      productionLimit: 4,
      productionUsed: 2, // 2 / 4 Used currently
      monthName: 'August 2026',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-10T14:30:00.000Z',
    },
    {
      id: 'alloc-2026-07-01',
      clientId: defaultClient.id,
      month: 7,
      year: 2026,
      productionLimit: 4,
      productionUsed: 4, // 4 / 4 Used in July
      monthName: 'July 2026',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-28T18:00:00.000Z',
    },
    {
      id: 'alloc-2026-06-01',
      clientId: defaultClient.id,
      month: 6,
      year: 2026,
      productionLimit: 4,
      productionUsed: 3, // 3 / 4 Used in June
      monthName: 'June 2026',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-25T11:00:00.000Z',
    },
    {
      id: 'alloc-2026-08-02',
      clientId: secondaryClient.id,
      month: 8,
      year: 2026,
      productionLimit: 4,
      productionUsed: 1,
      monthName: 'August 2026',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-05T12:00:00.000Z',
    },
  ];

  const requests: ContentRequest[] = [
    // August 2026 - Production Reel #1 (Used slot)
    {
      id: 'req-aug-01',
      clientId: defaultClient.id,
      clientName: defaultClient.name,
      businessName: defaultClient.businessName,
      title: '5 Common Skincare Myths Debunked by a Dermatologist',
      ideaDescription: 'A fast-paced myth-busting video addressing misconceptions about pore size, sunscreen indoors, and scrubbing acne.',
      targetPlatform: 'Instagram Reels',
      preferredTone: 'Educational & Authoritative yet approachable',
      requestType: 'FULL_PRODUCTION',
      productionSlotConsumed: 1,
      status: 'Editing',
      month: 8,
      year: 2026,
      createdAt: '2026-08-03T11:20:00.000Z',
      updatedAt: '2026-08-12T16:45:00.000Z',
      currentScriptVersion: 2,
      googleDocUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
      scriptAttachment: {
        id: 'att-01',
        fileName: '5_Skincare_Myths_Final_Shoot_Script_V2.pdf',
        fileSize: '342 KB',
        fileType: 'pdf',
        fileUrl: '#',
        uploadedBy: 'Apexmedia Senior Editor',
        uploadedAt: '2026-08-05T14:30:00.000Z',
      },
      script: [
        {
          version: 1,
          hook: 'Stop believing these 5 viral skincare lies before you destroy your skin barrier!',
          body: '1. Pores do not open and close with hot water—they have no muscles. 2. SPF 50 is required even working beside a window. 3. Harsh physical scrubs cause micro-tears, switch to chemical exfoliants.',
          callToAction: 'Drop a "GLOW" in the comments for our dermatologist-approved morning routine checklist!',
          visualNotes: 'Fast cuts, bold on-screen red X graphics over myth screenshots, clinic background with crisp natural lighting.',
          content: 'HOOK: Stop believing these 5 viral skincare lies before you destroy your skin barrier!\n\nPOINT 1: Pores cannot open or close like doors. They do not have muscles!\nPOINT 2: Window glass filters UVB but lets in 50% of UVA aging rays. Daily indoor SPF is essential.\nPOINT 3: Physical walnut scrubs create micro-tears. Use gentle Lactic Acid instead.\n\nCTA: Comment "GLOW" and we will DM you the morning routine guide!',
          updatedBy: 'Apexmedia Creative Team',
          createdAt: '2026-08-04T10:00:00.000Z',
        },
        {
          version: 2,
          hook: 'If you are still washing your face with hot water to "open pores", stop right now.',
          body: 'We break down the 3 biggest skincare myths patients bring to our clinic every single day. Full breakdown on barrier repair.',
          callToAction: 'Save this post and share with someone whose skin barrier needs saving.',
          visualNotes: 'Macro b-roll of serum application, clean studio audio, Dr. Sarah on camera.',
          googleDocUrl: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
          content: 'HOOK: If you are still washing your face with steaming hot water to "open your pores", please watch this.\n\n1. Pores are not windows; steam only softens sebum, it does not dilate pores.\n2. Over-exfoliating ruins the acid mantle.\n3. Hydration comes from humectants, not heavy oils.\n\nCTA: Bookmark this reel for your next routine reset.',
          updatedBy: 'Apexmedia Senior Editor',
          createdAt: '2026-08-05T14:30:00.000Z',
        },
      ],
      production: {
        shootingDate: '2026-08-08',
        shootingTime: '10:00 AM - 1:00 PM',
        location: 'Lumina Clinic Main Suite, 4th Floor',
        crewNotes: '2-camera 4K setup, Sony FX3 with Aputure 300d lighting package.',
        editingStatus: 'Rough Cut',
        videoPreviewUrl: 'https://storage.googleapis.com/apexmedia-previews/lumina-reel-01-rough.mp4',
      },
      internalNotes: ['Client was very pleased with the revised hook on V2.', 'Shooting went smoothly, audio levels pristine.'],
      clientFeedback: ['Love the script draft! Looking forward to the color grading pass.'],
    },
    // August 2026 - Production Reel #2 (Used slot)
    {
      id: 'req-aug-02',
      clientId: defaultClient.id,
      clientName: defaultClient.name,
      businessName: defaultClient.businessName,
      title: 'Before & After: 90-Day Microneedling Transformation Journey',
      ideaDescription: 'Showcase real patient journey with step-by-step healing timeline, addressing pain level questions and actual texture smoothing results.',
      targetPlatform: 'Instagram Reels',
      preferredTone: 'Inspiring, aesthetic, authentic',
      requestType: 'FULL_PRODUCTION',
      productionSlotConsumed: 1,
      status: 'Shooting Scheduled',
      month: 8,
      year: 2026,
      createdAt: '2026-08-07T14:15:00.000Z',
      updatedAt: '2026-08-11T09:30:00.000Z',
      currentScriptVersion: 1,
      googleDocUrl: 'https://docs.google.com/document/d/1ExampleMicroneedlingScriptApexmedia2026',
      script: [
        {
          version: 1,
          hook: 'Is microneedling actually worth the hype and downtime? Here is a raw 90-day case study.',
          body: 'Walk through Day 1 erythema, Day 3 flaking, Day 14 collagen surge, and Month 3 scar reduction.',
          callToAction: 'Book a consultation via link in bio for August spots.',
          visualNotes: 'Split screen comparison, smooth pan across skin texture with macro lens.',
          content: 'HOOK: Is microneedling actually worth the redness? Here is what 90 days of collagen rebuilding actually looks like.\n\nTIMELINE:\n- Day 1: Mild sunburn look\n- Day 7: Glowing new epidermal layer\n- Day 90: 60% reduction in acne scarring depth\n\nCTA: Link in bio to schedule your consultation.',
          updatedBy: 'Apexmedia Creative Team',
          createdAt: '2026-08-08T11:00:00.000Z',
        },
      ],
      production: {
        shootingDate: '2026-08-18',
        shootingTime: '2:00 PM - 4:30 PM',
        location: 'Lumina Clinic - Room 2',
        crewNotes: 'Macro lens + ring light fill for crisp skin texture shots.',
        editingStatus: 'Not Started',
      },
      internalNotes: ['Patient consent signed and archived.'],
    },
    // August 2026 - Script Only #1 (0 slots consumed)
    {
      id: 'req-aug-03',
      clientId: defaultClient.id,
      clientName: defaultClient.name,
      businessName: defaultClient.businessName,
      title: 'Quick 30-Second Morning Ice-Rolling Ritual',
      ideaDescription: 'Short script for our in-house phone recording on the benefits of lymphatic drainage in the morning.',
      targetPlatform: 'TikTok',
      preferredTone: 'Casual, energetic, trendy',
      requestType: 'SCRIPT_ONLY',
      productionSlotConsumed: 0,
      status: 'Script Ready',
      month: 8,
      year: 2026,
      createdAt: '2026-08-09T08:45:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
      currentScriptVersion: 1,
      script: [
        {
          version: 1,
          hook: 'If you wake up puffy like I do, stop whatever you are doing and grab an ice roller.',
          body: 'Roll upwards along jawline toward lymph nodes behind the ears. Never roll downwards! 60 seconds is all it takes to instantly sculpt cheekbones.',
          callToAction: 'Try this tomorrow morning and tag us!',
          visualNotes: 'Selfie camera POV in bathroom vanity with good morning window lighting.',
          content: 'HOOK: Wake up with a puffy face? Stop and grab your stainless steel ice roller.\n\nTECHNIQUE:\n1. Neck first: open the drainage pathways.\n2. Jawline upward towards the ears.\n3. Under-eye very gently towards temples.\n\nCTA: Tag a friend who needs morning de-puffing magic!',
          updatedBy: 'Apexmedia Copywriter',
          createdAt: '2026-08-10T12:00:00.000Z',
        },
      ],
      internalNotes: ['Script delivered to client for self-filming.'],
    },
    // August 2026 - Script Only #2 (0 slots consumed)
    {
      id: 'req-aug-04',
      clientId: defaultClient.id,
      clientName: defaultClient.name,
      businessName: defaultClient.businessName,
      title: 'Top 3 Anti-Aging Ingredients Every 30-Something Needs',
      ideaDescription: 'Educational script breaking down Retinoids, Vitamin C, and Peptides.',
      targetPlatform: 'Instagram Reels',
      preferredTone: 'Professional & Informative',
      requestType: 'SCRIPT_ONLY',
      productionSlotConsumed: 0,
      status: 'Script in Progress',
      month: 8,
      year: 2026,
      createdAt: '2026-08-14T15:20:00.000Z',
      updatedAt: '2026-08-14T15:20:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-01',
      clientId: defaultClient.id,
      action: 'ALLOCATION_RESET',
      previousAllocation: 4,
      newAllocation: 0,
      actor: 'System',
      actorName: 'System Scheduler',
      details: 'Monthly production allocation initialized for August 2026 (0/4 used).',
      timestamp: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'audit-02',
      clientId: defaultClient.id,
      requestId: 'req-aug-01',
      requestTitle: '5 Common Skincare Myths Debunked by a Dermatologist',
      action: 'SLOT_CONSUMED',
      requestType: 'FULL_PRODUCTION',
      previousAllocation: 0,
      newAllocation: 1,
      actor: 'Client',
      actorName: defaultClient.name,
      details: 'Full Production Reel requested and confirmed. Consumed slot 1 of 4.',
      timestamp: '2026-08-03T11:20:00.000Z',
    },
    {
      id: 'audit-03',
      clientId: defaultClient.id,
      requestId: 'req-aug-02',
      requestTitle: 'Before & After: 90-Day Microneedling Transformation Journey',
      action: 'SLOT_CONSUMED',
      requestType: 'FULL_PRODUCTION',
      previousAllocation: 1,
      newAllocation: 2,
      actor: 'Client',
      actorName: defaultClient.name,
      details: 'Full Production Reel requested and confirmed. Consumed slot 2 of 4.',
      timestamp: '2026-08-07T14:15:00.000Z',
    },
    {
      id: 'audit-04',
      clientId: defaultClient.id,
      requestId: 'req-aug-03',
      requestTitle: 'Quick 30-Second Morning Ice-Rolling Ritual',
      action: 'REQUEST_CREATED',
      requestType: 'SCRIPT_ONLY',
      previousAllocation: 2,
      newAllocation: 2,
      actor: 'Client',
      actorName: defaultClient.name,
      details: 'Script Only request created. Production slots unchanged (2/4 used).',
      timestamp: '2026-08-09T08:45:00.000Z',
    },
  ];

  return {
    clients: [defaultClient, secondaryClient],
    allocations,
    requests,
    auditLogs,
    pricingSettings,
    users,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Always ensure latest users and clients are loaded
        this.data.users = getSeedData().users;
        this.data.clients = getSeedData().clients;
        if (!this.data.pricingSettings) {
          this.data.pricingSettings = getSeedData().pricingSettings;
        }
      } catch (err) {
        console.error('Error loading database file, re-seeding:', err);
        this.data = getSeedData();
        this.save();
      }
    } else {
      this.data = getSeedData();
      this.save();
    }
  }

  private save() {
    ensureDataDir();
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public getUsers(): UserCredential[] {
    return this.data.users || [];
  }

  public authenticate(email: string, pass: string): AuthUser | null {
    const found = this.data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === pass
    );
    return found ? found.user : null;
  }

  public getPricingSettings(): PricingSettings {
    return this.data.pricingSettings;
  }

  public updatePricingSettings(settings: Partial<PricingSettings>, adminName = 'Apexmedia Admin'): PricingSettings {
    this.data.pricingSettings = {
      ...this.data.pricingSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: adminName,
    };

    this.data.auditLogs.unshift({
      id: `audit-price-${Date.now()}`,
      clientId: this.data.pricingSettings.clientId || 'global',
      action: 'PRICING_UPDATED',
      previousAllocation: 0,
      newAllocation: 0,
      actor: 'Admin Team',
      actorName: adminName,
      details: `Client pricing & retainer settings updated. Pricing display: ${this.data.pricingSettings.enabled ? 'ENABLED' : 'HIDDEN'}. Retainer: ${this.data.pricingSettings.monthlyRetainer}.`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return this.data.pricingSettings;
  }

  public getClient(id: string): Client | undefined {
    return this.data.clients.find((c) => c.id === id);
  }

  public getClients(): Client[] {
    return this.data.clients;
  }

  public getAllocation(clientId: string, month: number, year: number): MonthlyAllocation {
    let alloc = this.data.allocations.find(
      (a) => a.clientId === clientId && a.month === month && a.year === year
    );

    if (!alloc) {
      // Auto-initialize new month with 0 / 4 used
      alloc = {
        id: `alloc-${year}-${String(month).padStart(2, '0')}-${clientId}`,
        clientId,
        month,
        year,
        productionLimit: 4,
        productionUsed: 0,
        monthName: getMonthName(month, year),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.allocations.push(alloc);

      // Add audit log for new month initialization
      this.data.auditLogs.unshift({
        id: `audit-init-${Date.now()}`,
        clientId,
        action: 'ALLOCATION_RESET',
        previousAllocation: 0,
        newAllocation: 0,
        actor: 'System',
        actorName: 'Automated Monthly Engine',
        details: `Monthly production allocation initialized for ${alloc.monthName} (0/4 used).`,
        timestamp: new Date().toISOString(),
      });

      this.save();
    }

    return alloc;
  }

  public getAllocationsForClient(clientId: string): MonthlyAllocation[] {
    return this.data.allocations
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }

  /**
   * Admin can alter or reset monthly production usage numbers directly
   */
  public updateAllocationUsage(
    allocationId: string,
    params: { productionUsed: number; productionLimit?: number; reason?: string; adminName?: string }
  ): MonthlyAllocation {
    const alloc = this.data.allocations.find((a) => a.id === allocationId);
    if (!alloc) throw new Error('Allocation record not found');

    const prevUsed = alloc.productionUsed;
    const prevLimit = alloc.productionLimit;

    alloc.productionUsed = Math.max(0, params.productionUsed);
    if (typeof params.productionLimit === 'number') {
      alloc.productionLimit = Math.max(1, params.productionLimit);
    }
    alloc.updatedAt = new Date().toISOString();

    this.data.auditLogs.unshift({
      id: `audit-alloc-mod-${Date.now()}`,
      clientId: alloc.clientId,
      action: 'ALLOCATION_MODIFIED',
      previousAllocation: prevUsed,
      newAllocation: alloc.productionUsed,
      actor: 'Admin Team',
      actorName: params.adminName || 'Apexmedia Studio Lead',
      details: `Admin modified monthly allocation for ${alloc.monthName}: Reel Usage changed from ${prevUsed}/${prevLimit} to ${alloc.productionUsed}/${alloc.productionLimit}. Note: ${params.reason || 'Manual quota adjustment by administrator.'}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return alloc;
  }

  /**
   * Admin 1-Click Reset month usage to 0/4
   */
  public resetMonthAllocation(allocationId: string, adminName = 'Apexmedia Studio Lead', reason?: string): MonthlyAllocation {
    const alloc = this.data.allocations.find((a) => a.id === allocationId);
    if (!alloc) throw new Error('Allocation record not found');

    const prevUsed = alloc.productionUsed;
    alloc.productionUsed = 0;
    alloc.updatedAt = new Date().toISOString();

    this.data.auditLogs.unshift({
      id: `audit-reset-${Date.now()}`,
      clientId: alloc.clientId,
      action: 'ALLOCATION_RESET',
      previousAllocation: prevUsed,
      newAllocation: 0,
      actor: 'Admin Team',
      actorName: adminName,
      details: `Admin cleared & reset monthly usage for ${alloc.monthName} back to 0/${alloc.productionLimit}. Reason: ${reason || 'Monthly usage cleared / approved reset.'}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return alloc;
  }

  public getGoogleSheetConfig() {
    return this.data.googleSheetConfig || null;
  }

  public setGoogleSheetConfig(config: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    title: string;
    lastSyncedAt: string;
    autoSyncOnSubmission?: boolean;
  }) {
    this.data.googleSheetConfig = {
      spreadsheetId: config.spreadsheetId,
      spreadsheetUrl: config.spreadsheetUrl,
      title: config.title,
      lastSyncedAt: config.lastSyncedAt,
      autoSyncOnSubmission: config.autoSyncOnSubmission ?? true,
    };
    this.save();
    return this.data.googleSheetConfig;
  }

  public getRequests(clientId?: string, month?: number, year?: number): ContentRequest[] {
    return this.data.requests
      .filter((r) => {
        if (clientId && r.clientId !== clientId) return false;
        if (month && r.month !== month) return false;
        if (year && r.year !== year) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getRequestById(id: string): ContentRequest | undefined {
    return this.data.requests.find((r) => r.id === id);
  }

  /**
   * ATOMIC Request creation with transaction lock
   */
  public createRequest(params: {
    clientId: string;
    title: string;
    ideaDescription: string;
    requestType: RequestType;
    targetPlatform?: 'Instagram Reels' | 'TikTok' | 'YouTube Shorts' | 'LinkedIn Video' | 'Multi-Platform';
    preferredTone?: string;
    month: number;
    year: number;
    actorName?: string;
  }): { request: ContentRequest; allocation: MonthlyAllocation } {
    const client = this.getClient(params.clientId);
    if (!client) throw new Error('Client not found');

    const alloc = this.getAllocation(params.clientId, params.month, params.year);
    const now = new Date().toISOString();

    if (params.requestType === 'FULL_PRODUCTION') {
      if (alloc.productionUsed >= alloc.productionLimit) {
        throw new Error('ALLOCATION_LIMIT_EXCEEDED');
      }

      const prevUsage = alloc.productionUsed;
      alloc.productionUsed += 1;
      alloc.updatedAt = now;

      const newRequest: ContentRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clientId: client.id,
        clientName: client.name,
        businessName: client.businessName,
        title: params.title.trim(),
        ideaDescription: params.ideaDescription.trim(),
        targetPlatform: params.targetPlatform || 'Instagram Reels',
        preferredTone: params.preferredTone || 'Engaging & Authentic',
        requestType: 'FULL_PRODUCTION',
        productionSlotConsumed: 1,
        status: 'Submitted',
        month: params.month,
        year: params.year,
        createdAt: now,
        updatedAt: now,
        internalNotes: ['Full production reel initiated. Awaiting ideation & script draft.'],
      };

      this.data.requests.unshift(newRequest);

      this.data.auditLogs.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        clientId: client.id,
        requestId: newRequest.id,
        requestTitle: newRequest.title,
        action: 'SLOT_CONSUMED',
        requestType: 'FULL_PRODUCTION',
        previousAllocation: prevUsage,
        newAllocation: alloc.productionUsed,
        actor: 'Client',
        actorName: params.actorName || client.name,
        details: `Full Production Reel confirmed for ${alloc.monthName}. Consumed slot ${alloc.productionUsed} of ${alloc.productionLimit}. Remaining: ${alloc.productionLimit - alloc.productionUsed}.`,
        timestamp: now,
      });

      this.save();
      return { request: newRequest, allocation: alloc };
    } else {
      const newRequest: ContentRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clientId: client.id,
        clientName: client.name,
        businessName: client.businessName,
        title: params.title.trim(),
        ideaDescription: params.ideaDescription.trim(),
        targetPlatform: params.targetPlatform || 'Instagram Reels',
        preferredTone: params.preferredTone || 'Engaging & Educational',
        requestType: 'SCRIPT_ONLY',
        productionSlotConsumed: 0,
        status: 'Submitted',
        month: params.month,
        year: params.year,
        createdAt: now,
        updatedAt: now,
        internalNotes: ['Script only requested. No video shoot or edit.'],
      };

      this.data.requests.unshift(newRequest);

      this.data.auditLogs.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        clientId: client.id,
        requestId: newRequest.id,
        requestTitle: newRequest.title,
        action: 'REQUEST_CREATED',
        requestType: 'SCRIPT_ONLY',
        previousAllocation: alloc.productionUsed,
        newAllocation: alloc.productionUsed,
        actor: 'Client',
        actorName: params.actorName || client.name,
        details: `Script Only idea submitted. Production slots unchanged (${alloc.productionUsed}/${alloc.productionLimit} used).`,
        timestamp: now,
      });

      this.save();
      return { request: newRequest, allocation: alloc };
    }
  }

  /**
   * Delete Request with optional slot refund
   */
  public deleteRequest(
    requestId: string,
    refundSlot = true,
    actorName = 'Apexmedia Studio Lead'
  ): { deletedId: string; allocation?: MonthlyAllocation } {
    const idx = this.data.requests.findIndex((r) => r.id === requestId);
    if (idx === -1) throw new Error('Request not found');

    const req = this.data.requests[idx];
    let alloc: MonthlyAllocation | undefined;

    if (req.productionSlotConsumed === 1 && refundSlot) {
      alloc = this.getAllocation(req.clientId, req.month, req.year);
      const prevUsed = alloc.productionUsed;
      alloc.productionUsed = Math.max(0, alloc.productionUsed - 1);
      alloc.updatedAt = new Date().toISOString();

      this.data.auditLogs.unshift({
        id: `audit-del-${Date.now()}`,
        clientId: req.clientId,
        requestId: req.id,
        requestTitle: req.title,
        action: 'REQUEST_DELETED',
        previousAllocation: prevUsed,
        newAllocation: alloc.productionUsed,
        actor: 'Admin Team',
        actorName,
        details: `Request "${req.title}" deleted. 1 Production Reel slot refunded back to client (${alloc.productionUsed}/${alloc.productionLimit} used).`,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.data.auditLogs.unshift({
        id: `audit-del-${Date.now()}`,
        clientId: req.clientId,
        requestId: req.id,
        requestTitle: req.title,
        action: 'REQUEST_DELETED',
        previousAllocation: 0,
        newAllocation: 0,
        actor: 'Admin Team',
        actorName,
        details: `Request "${req.title}" removed from portal.`,
        timestamp: new Date().toISOString(),
      });
    }

    this.data.requests.splice(idx, 1);
    this.save();
    return { deletedId: requestId, allocation: alloc };
  }

  /**
   * Convert SCRIPT_ONLY to FULL_PRODUCTION (Requires slot check)
   */
  public convertToFullProduction(requestId: string, actorName = 'Client'): { request: ContentRequest; allocation: MonthlyAllocation } {
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Request not found');
    if (req.requestType === 'FULL_PRODUCTION') throw new Error('Already Full Production');

    const alloc = this.getAllocation(req.clientId, req.month, req.year);
    if (alloc.productionUsed >= alloc.productionLimit) {
      throw new Error('ALLOCATION_LIMIT_EXCEEDED');
    }

    const prevUsage = alloc.productionUsed;
    alloc.productionUsed += 1;
    alloc.updatedAt = new Date().toISOString();

    req.requestType = 'FULL_PRODUCTION';
    req.productionSlotConsumed = 1;
    req.updatedAt = new Date().toISOString();
    req.internalNotes = req.internalNotes || [];
    req.internalNotes.push(`Converted from Script Only to Full Production on ${new Date().toLocaleDateString()}.`);

    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: req.clientId,
      requestId: req.id,
      requestTitle: req.title,
      action: 'CONVERTED_TO_PRODUCTION',
      requestType: 'FULL_PRODUCTION',
      previousAllocation: prevUsage,
      newAllocation: alloc.productionUsed,
      actor: 'Client',
      actorName,
      details: `Request converted from Script Only to Full Production. Consumed slot ${alloc.productionUsed} of ${alloc.productionLimit}.`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { request: req, allocation: alloc };
  }

  /**
   * Admin Release Production Slot
   */
  public releaseProductionSlot(requestId: string, reason: string, adminName = 'Admin Team'): { request: ContentRequest; allocation: MonthlyAllocation } {
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Request not found');
    if (req.productionSlotConsumed !== 1) throw new Error('Request does not currently consume a production slot');

    const alloc = this.getAllocation(req.clientId, req.month, req.year);
    const prevUsage = alloc.productionUsed;
    alloc.productionUsed = Math.max(0, alloc.productionUsed - 1);
    alloc.updatedAt = new Date().toISOString();

    req.productionSlotConsumed = 0;
    req.slotReleasedAt = new Date().toISOString();
    req.slotReleasedBy = adminName;
    req.slotReleaseReason = reason;
    req.updatedAt = new Date().toISOString();
    req.internalNotes = req.internalNotes || [];
    req.internalNotes.push(`[SLOT RELEASED by ${adminName}]: ${reason}`);

    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: req.clientId,
      requestId: req.id,
      requestTitle: req.title,
      action: 'SLOT_RELEASED',
      requestType: req.requestType,
      previousAllocation: prevUsage,
      newAllocation: alloc.productionUsed,
      actor: 'Admin Team',
      actorName: adminName,
      details: `Production slot released back to client. Allocation changed from ${prevUsage}/${alloc.productionLimit} to ${alloc.productionUsed}/${alloc.productionLimit}. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { request: req, allocation: alloc };
  }

  /**
   * Update Request Status
   */
  public updateStatus(requestId: string, status: RequestStatus, actorName = 'Admin Team'): ContentRequest {
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    const prevStatus = req.status;
    req.status = status;
    req.updatedAt = new Date().toISOString();

    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: req.clientId,
      requestId: req.id,
      requestTitle: req.title,
      action: 'STATUS_UPDATED',
      previousAllocation: 0,
      newAllocation: 0,
      actor: 'Admin Team',
      actorName,
      details: `Status updated from "${prevStatus}" to "${status}".`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return req;
  }

  /**
   * Save or Update Script Version with Google Doc & Attachment support
   */
  public saveScript(
    requestId: string,
    scriptData: {
      content?: string;
      hook?: string;
      body?: string;
      callToAction?: string;
      visualNotes?: string;
      googleDocUrl?: string;
      attachment?: ScriptAttachment;
    },
    updatedBy = 'Apexmedia Writer'
  ): ContentRequest {
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    req.script = req.script || [];
    const newVer = req.script.length + 1;

    const fullContent = scriptData.content || [
      scriptData.hook ? `HOOK: ${scriptData.hook}` : '',
      scriptData.body ? `\nBODY:\n${scriptData.body}` : '',
      scriptData.callToAction ? `\nCTA: ${scriptData.callToAction}` : '',
      scriptData.visualNotes ? `\nVISUAL NOTES: ${scriptData.visualNotes}` : '',
      scriptData.googleDocUrl ? `\nGOOGLE DOC: ${scriptData.googleDocUrl}` : '',
    ].filter(Boolean).join('\n');

    const newVersion: ScriptVersion = {
      version: newVer,
      content: fullContent,
      hook: scriptData.hook,
      body: scriptData.body,
      callToAction: scriptData.callToAction,
      visualNotes: scriptData.visualNotes,
      googleDocUrl: scriptData.googleDocUrl,
      attachment: scriptData.attachment,
      updatedBy,
      createdAt: new Date().toISOString(),
    };

    req.script.push(newVersion);
    req.currentScriptVersion = newVer;
    if (scriptData.googleDocUrl) {
      req.googleDocUrl = scriptData.googleDocUrl;
    }
    if (scriptData.attachment) {
      req.scriptAttachment = scriptData.attachment;
    }
    if (req.status === 'Submitted' || req.status === 'Script in Progress') {
      req.status = 'Script Ready';
    }
    req.updatedAt = new Date().toISOString();

    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: req.clientId,
      requestId: req.id,
      requestTitle: req.title,
      action: 'SCRIPT_UPDATED',
      previousAllocation: 0,
      newAllocation: 0,
      actor: 'Admin Team',
      actorName: updatedBy,
      details: `Script Version ${newVer} drafted & published. ${scriptData.googleDocUrl ? 'Attached Google Doc script.' : ''} ${scriptData.attachment ? `Uploaded file: ${scriptData.attachment.fileName}.` : ''}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return req;
  }

  /**
   * Update Production Schedule & Editing Status
   */
  public updateProduction(requestId: string, details: Partial<ContentRequest['production']>, updatedBy = 'Admin Team'): ContentRequest {
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    req.production = {
      editingStatus: 'Not Started',
      ...req.production,
      ...details,
    };

    if (details?.shootingDate && req.status === 'Script Ready') {
      req.status = 'Shooting Scheduled';
    }
    if (details?.editingStatus && details.editingStatus !== 'Not Started' && details.editingStatus !== 'Completed') {
      req.status = 'Editing';
    }
    if (details?.editingStatus === 'Completed') {
      req.status = 'Ready for Review';
    }

    req.updatedAt = new Date().toISOString();

    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: req.clientId,
      requestId: req.id,
      requestTitle: req.title,
      action: 'SHOOTING_SCHEDULED',
      previousAllocation: 0,
      newAllocation: 0,
      actor: 'Admin Team',
      actorName: updatedBy,
      details: `Production details updated. Shoot: ${details?.shootingDate || 'TBD'}, Editing: ${details?.editingStatus || 'Current'}.`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return req;
  }

  /**
   * Add internal or client feedback notes
   */
  public addNote(requestId: string, note: string, type: 'internal' | 'client', authorName: string): ContentRequest {
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    const timestamp = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatted = `[${timestamp} by ${authorName}]: ${note}`;

    if (type === 'internal') {
      req.internalNotes = req.internalNotes || [];
      req.internalNotes.push(formatted);
    } else {
      req.clientFeedback = req.clientFeedback || [];
      req.clientFeedback.push(formatted);
      if (req.status === 'Script Ready' || req.status === 'Ready for Review') {
        req.status = 'Revisions Requested';
      }
    }
    req.updatedAt = new Date().toISOString();
    this.save();
    return req;
  }

  public getAuditLogs(clientId?: string): AuditLog[] {
    return this.data.auditLogs
      .filter((log) => !clientId || log.clientId === clientId)
      .slice(0, 100);
  }
}

const db = new Database();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API ROUTES FIRST

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: "Apexmedia's Production Engine", timestamp: new Date().toISOString() });
  });

  // Auth credentials & Login endpoints
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const user = db.authenticate(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid ID or password. Please check credentials.' });
      }
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Demo user credentials helper
  app.get('/api/auth/credentials', (req, res) => {
    const users = db.getUsers().map((u) => ({
      email: u.email,
      password: u.password,
      role: u.user.role,
      name: u.user.name,
      businessName: u.user.businessName,
      title: u.user.title,
    }));
    res.json(users);
  });

  // Bootstrap data for initial load
  app.get('/api/bootstrap', (req, res) => {
    try {
      const clientId = (req.query.clientId as string) || 'client-apex-01';
      const month = req.query.month ? parseInt(req.query.month as string, 10) : 8;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;

      const client = db.getClient(clientId) || db.getClients()[0];
      const currentAllocation = db.getAllocation(client.id, month, year);
      const allAllocations = db.getAllocationsForClient(client.id);
      const requests = db.getRequests(client.id);
      const auditLogs = db.getAuditLogs(client.id);
      const pricingSettings = db.getPricingSettings();

      res.json({
        client,
        clients: db.getClients(),
        currentAllocation,
        allAllocations,
        requests,
        auditLogs,
        pricingSettings,
        googleSheetConfig: db.getGoogleSheetConfig(),
        activeMonth: {
          month,
          year,
          monthName: getMonthName(month, year),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Google Sheets integration configuration endpoint
  app.get('/api/google-sheets/config', (req, res) => {
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      currentSheet: db.getGoogleSheetConfig(),
    });
  });

  // Google Sheets full sync endpoint (creates sheet if needed & formats with headers and styles)
  app.post('/api/google-sheets/sync', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Google OAuth token' });
      }
      const accessToken = authHeader.replace('Bearer ', '').trim();

      const {
        clientId = 'client-apex-01',
        createNew = false,
        spreadsheetId: requestedSheetId,
        customTitle,
      } = req.body;

      const client = db.getClient(clientId) || db.getClients()[0];
      const requests = db.getRequests(clientId);
      const allocations = db.getAllocationsForClient(clientId);
      const currentAlloc = allocations[0] || db.getAllocation(clientId, 8, 2026);

      let targetSheetId = requestedSheetId;
      let sheetUrl = '';
      const sheetTitle = customTitle || `Apexmedia — ${client.businessName} (Video Production Pipeline & Allocations)`;

      // Step 1: Create a new spreadsheet if requested or if none exists
      if (createNew || !targetSheetId) {
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            properties: {
              title: sheetTitle,
            },
            sheets: [
              {
                properties: {
                  title: 'Video Requests Pipeline',
                  gridProperties: { rowCount: 100, columnCount: 15, frozenRowCount: 1 },
                },
              },
              {
                properties: {
                  title: 'Monthly Quotas & Retainer',
                  gridProperties: { rowCount: 50, columnCount: 8, frozenRowCount: 1 },
                },
              },
            ],
          }),
        });

        const createdData = await createRes.json();
        if (!createRes.ok || !createdData.spreadsheetId) {
          throw new Error(createdData.error?.message || 'Failed to create Google Spreadsheet');
        }

        targetSheetId = createdData.spreadsheetId;
        sheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`;
      } else {
        sheetUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`;
      }

      // Step 2: Populate Sheet 1 (Video Requests Pipeline)
      const requestHeaders = [
        'Request ID',
        'Client / Brand',
        'Video Title',
        'Service Type',
        'Status',
        'Reel Slot Used',
        'Month',
        'Target Platform',
        'Google Doc Script URL',
        'Attachment Name',
        'Shoot Date',
        'Editing Stage',
        'Idea Brief',
        'Submitted At',
        'Last Updated',
      ];

      const requestRows = requests.map((r) => [
        r.id,
        r.businessName,
        r.title,
        r.requestType === 'FULL_PRODUCTION' ? 'Full Production Reel' : 'Script Only',
        r.status,
        r.productionSlotConsumed,
        getMonthName(r.month, r.year),
        r.targetPlatform || 'Instagram Reels',
        r.googleDocUrl || '',
        r.scriptAttachment?.fileName || '',
        r.production?.shootingDate || '',
        r.production?.editingStatus || 'Not Started',
        r.ideaDescription || '',
        r.createdAt,
        r.updatedAt,
      ]);

      const requestsData = [requestHeaders, ...requestRows];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/Video Requests Pipeline!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            range: 'Video Requests Pipeline!A1',
            majorDimension: 'ROWS',
            values: requestsData,
          }),
        }
      );

      // Step 3: Populate Sheet 2 (Monthly Quotas & Retainer)
      const allocHeaders = [
        'Allocation Month',
        'Client Brand',
        'Production Reels Limit',
        'Reels Used',
        'Slots Remaining',
        'Unlimited Scripts Active',
        'Monthly Retainer',
        'Last Modified',
      ];

      const pricing = db.getPricingSettings();
      const allocRows = allocations.map((a) => [
        a.monthName,
        client.businessName,
        a.productionLimit,
        a.productionUsed,
        Math.max(0, a.productionLimit - a.productionUsed),
        'YES (Included)',
        pricing.monthlyRetainer || '$2,500',
        a.updatedAt,
      ]);

      const allocData = [allocHeaders, ...allocRows];

      // Clear & set values in Sheet 2
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/Monthly Quotas & Retainer!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            range: 'Monthly Quotas & Retainer!A1',
            majorDimension: 'ROWS',
            values: allocData,
          }),
        }
      );

      // Save spreadsheet config in local database
      const updatedConfig = db.setGoogleSheetConfig({
        spreadsheetId: targetSheetId,
        spreadsheetUrl: sheetUrl,
        title: sheetTitle,
        lastSyncedAt: new Date().toISOString(),
        autoSyncOnSubmission: true,
      });

      res.json({
        success: true,
        spreadsheetId: targetSheetId,
        spreadsheetUrl: sheetUrl,
        title: sheetTitle,
        updatedRows: requests.length,
        config: updatedConfig,
        message: `Successfully synchronized ${requests.length} video requests and ${allocations.length} monthly quotas to Google Sheets!`,
      });
    } catch (err: any) {
      console.error('Google Sheets Sync Error:', err);
      res.status(500).json({ error: err.message || 'Google Sheets synchronization failed' });
    }
  });

  // Google Sheets append single row on new idea submission
  app.post('/api/google-sheets/append-row', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Google OAuth token' });
      }
      const accessToken = authHeader.replace('Bearer ', '').trim();

      const { requestId, spreadsheetId: customSheetId } = req.body;
      const config = db.getGoogleSheetConfig();
      const targetSheetId = customSheetId || config?.spreadsheetId;

      if (!targetSheetId) {
        return res.status(400).json({ error: 'No active Google Spreadsheet configured to append to' });
      }

      const reqObj = db.getRequestById(requestId);
      if (!reqObj) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const newRow = [
        reqObj.id,
        reqObj.businessName,
        reqObj.title,
        reqObj.requestType === 'FULL_PRODUCTION' ? 'Full Production Reel' : 'Script Only',
        reqObj.status,
        reqObj.productionSlotConsumed,
        getMonthName(reqObj.month, reqObj.year),
        reqObj.targetPlatform || 'Instagram Reels',
        reqObj.googleDocUrl || '',
        reqObj.scriptAttachment?.fileName || '',
        reqObj.production?.shootingDate || '',
        reqObj.production?.editingStatus || 'Not Started',
        reqObj.ideaDescription || '',
        reqObj.createdAt,
        reqObj.updatedAt,
      ];

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/Video Requests Pipeline!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            range: 'Video Requests Pipeline!A1',
            majorDimension: 'ROWS',
            values: [newRow],
          }),
        }
      );

      const appendData = await appendRes.json();
      res.json({ success: true, appendData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Pricing settings endpoints
  app.get('/api/pricing', (req, res) => {
    res.json(db.getPricingSettings());
  });

  app.put('/api/pricing', (req, res) => {
    try {
      const { enabled, monthlyRetainer, includedReels, includedScripts, overagePerReel, rushFee, termsNotes, adminName } = req.body;
      const updated = db.updatePricingSettings({
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
        monthlyRetainer,
        includedReels: typeof includedReels === 'number' ? includedReels : undefined,
        includedScripts,
        overagePerReel,
        rushFee,
        termsNotes,
      }, adminName || 'Apexmedia Admin');
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Clients
  app.get('/api/clients', (req, res) => {
    res.json(db.getClients());
  });

  // Allocations
  app.get('/api/allocations', (req, res) => {
    const clientId = (req.query.clientId as string) || 'client-apex-01';
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    if (month && year) {
      const alloc = db.getAllocation(clientId, month, year);
      return res.json(alloc);
    }

    const allocs = db.getAllocationsForClient(clientId);
    res.json(allocs);
  });

  // Alter / Direct Edit Monthly Allocation Usage (Admin action)
  app.put('/api/allocations/:id', (req, res) => {
    try {
      const { productionUsed, productionLimit, reason, adminName } = req.body;
      if (typeof productionUsed !== 'number') {
        return res.status(400).json({ error: 'productionUsed number is required' });
      }
      const updated = db.updateAllocationUsage(req.params.id, {
        productionUsed,
        productionLimit,
        reason,
        adminName,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reset Month Allocation Usage to 0/4 (Admin action)
  app.post('/api/allocations/:id/reset', (req, res) => {
    try {
      const { adminName, reason } = req.body;
      const updated = db.resetMonthAllocation(req.params.id, adminName, reason);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get Requests
  app.get('/api/requests', (req, res) => {
    const clientId = req.query.clientId as string | undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const requests = db.getRequests(clientId, month, year);
    res.json(requests);
  });

  // Get Single Request
  app.get('/api/requests/:id', (req, res) => {
    const request = db.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
  });

  // CREATE Content Request (Full validation & atomic slot enforcement)
  app.post('/api/requests', (req, res) => {
    try {
      const {
        clientId,
        title,
        ideaDescription,
        requestType,
        targetPlatform,
        preferredTone,
        month = 8,
        year = 2026,
        actorName,
      } = req.body;

      if (!title || !ideaDescription || !requestType) {
        return res.status(400).json({
          error: 'MISSING_FIELDS',
          message: 'Title, idea description, and service request type are required.',
        });
      }

      if (requestType !== 'SCRIPT_ONLY' && requestType !== 'FULL_PRODUCTION') {
        return res.status(400).json({
          error: 'INVALID_TYPE',
          message: 'Request type must be SCRIPT_ONLY or FULL_PRODUCTION.',
        });
      }

      const result = db.createRequest({
        clientId: clientId || 'client-apex-01',
        title,
        ideaDescription,
        requestType,
        targetPlatform,
        preferredTone,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        actorName,
      });

      res.status(201).json(result);
    } catch (err: any) {
      if (err.message === 'ALLOCATION_LIMIT_EXCEEDED') {
        return res.status(400).json({
          error: 'ALLOCATION_LIMIT_EXCEEDED',
          message: 'You have already allocated all 4 full-production reels for this month. You can still submit this idea as a Script Only request.',
        });
      }
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Delete Request (Admin / Client deletion with refund option)
  app.delete('/api/requests/:id', (req, res) => {
    try {
      const refundSlot = req.query.refundSlot !== 'false';
      const actorName = (req.query.actorName as string) || 'Apexmedia Studio Lead';
      const result = db.deleteRequest(req.params.id, refundSlot, actorName);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Convert Script Only to Full Production
  app.post('/api/requests/:id/convert', (req, res) => {
    try {
      const { actorName } = req.body;
      const result = db.convertToFullProduction(req.params.id, actorName);
      res.json(result);
    } catch (err: any) {
      if (err.message === 'ALLOCATION_LIMIT_EXCEEDED') {
        return res.status(400).json({
          error: 'ALLOCATION_LIMIT_EXCEEDED',
          message: 'All 4 full-production reels have already been allocated for this month.',
        });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // Release Production Slot (Admin Action)
  app.post('/api/requests/:id/release-slot', (req, res) => {
    try {
      const { reason, adminName } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'A reason for releasing the production slot is required.' });
      }
      const result = db.releaseProductionSlot(req.params.id, reason, adminName || 'Admin Team');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update Request Status
  app.patch('/api/requests/:id/status', (req, res) => {
    try {
      const { status, actorName } = req.body;
      if (!status) return res.status(400).json({ error: 'Status is required' });
      const updated = db.updateStatus(req.params.id, status, actorName);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Save / Update Script (Includes Google Docs link & script attachments)
  app.post('/api/requests/:id/script', (req, res) => {
    try {
      const { content, hook, body, callToAction, visualNotes, googleDocUrl, attachment, updatedBy } = req.body;
      const updated = db.saveScript(
        req.params.id,
        { content, hook, body, callToAction, visualNotes, googleDocUrl, attachment },
        updatedBy
      );
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update Production details
  app.patch('/api/requests/:id/production', (req, res) => {
    try {
      const { shootingDate, shootingTime, location, crewNotes, editingStatus, videoPreviewUrl, updatedBy } = req.body;
      const updated = db.updateProduction(
        req.params.id,
        { shootingDate, shootingTime, location, crewNotes, editingStatus, videoPreviewUrl },
        updatedBy
      );
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Add notes / feedback
  app.post('/api/requests/:id/notes', (req, res) => {
    try {
      const { note, type = 'internal', authorName = 'Team' } = req.body;
      if (!note) return res.status(400).json({ error: 'Note text required' });
      const updated = db.addNote(req.params.id, note, type, authorName);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    const clientId = req.query.clientId as string | undefined;
    res.json(db.getAuditLogs(clientId));
  });

  // Data Export (CSV & JSON format)
  app.get('/api/export', (req, res) => {
    try {
      const format = (req.query.format as string) || 'json';
      const clientId = (req.query.clientId as string) || 'client-apex-01';
      const client = db.getClient(clientId) || db.getClients()[0];
      const requests = db.getRequests(clientId);
      const allocations = db.getAllocationsForClient(clientId);
      const auditLogs = db.getAuditLogs(clientId);
      const pricingSettings = db.getPricingSettings();

      if (format === 'csv') {
        const headers = [
          'ID',
          'Client Name',
          'Business Name',
          'Month/Year',
          'Idea Title',
          'Request Type',
          'Production Slot Consumed',
          'Status',
          'Google Docs Script',
          'PDF / Doc File',
          'Shooting Date',
          'Editing Status',
          'Script Versions Count',
          'Created Date',
        ];

        const rows = requests.map((r) => [
          `"${r.id}"`,
          `"${r.clientName}"`,
          `"${r.businessName}"`,
          `"${getMonthName(r.month, r.year)}"`,
          `"${r.title.replace(/"/g, '""')}"`,
          `"${r.requestType}"`,
          r.productionSlotConsumed,
          `"${r.status}"`,
          `"${r.googleDocUrl || 'N/A'}"`,
          `"${r.scriptAttachment?.fileName || 'N/A'}"`,
          `"${r.production?.shootingDate || 'N/A'}"`,
          `"${r.production?.editingStatus || 'N/A'}"`,
          r.script?.length || 0,
          `"${r.createdAt}"`,
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="apexmedia-${client.businessName.toLowerCase().replace(/\s+/g, '-')}-requests.csv"`);
        return res.send(csvContent);
      }

      // JSON format
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        client,
        allocations,
        requests,
        pricingSettings,
        auditLogs,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="apexmedia-${client.businessName.toLowerCase().replace(/\s+/g, '-')}-data.json"`);
      res.json(exportPayload);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

