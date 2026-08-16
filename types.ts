export type RequestType = 'SCRIPT_ONLY' | 'FULL_PRODUCTION';

export type RequestStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Script in Progress'
  | 'Script Ready'
  | 'Shooting Scheduled'
  | 'Editing'
  | 'Ready for Review'
  | 'Completed'
  | 'Revisions Requested';

export type EditingStatus =
  | 'Not Started'
  | 'Raw Footage Review'
  | 'Rough Cut'
  | 'Color & Sound Design'
  | 'Final Polish'
  | 'Completed';

export interface Client {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  brandHandle?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  clientId?: string;
  businessName?: string;
  avatarInitials: string;
  title: string;
}

export interface MonthlyAllocation {
  id: string;
  clientId: string;
  month: number; // 1-12
  year: number;  // e.g. 2026
  productionLimit: number; // default: 4
  productionUsed: number;  // 0 - 4 (can be altered/reset by admin)
  monthName: string;       // "August 2026"
  createdAt: string;
  updatedAt: string;
}

export interface ScriptAttachment {
  id: string;
  fileName: string;
  fileSize?: string;
  fileType: 'pdf' | 'doc' | 'docx' | 'google_doc' | 'link';
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ScriptVersion {
  version: number;
  content: string;
  hook?: string;
  body?: string;
  callToAction?: string;
  visualNotes?: string;
  googleDocUrl?: string;
  attachment?: ScriptAttachment;
  updatedBy: string;
  createdAt: string;
}

export interface ProductionDetails {
  shootingDate?: string;
  shootingTime?: string;
  location?: string;
  crewNotes?: string;
  editingStatus: EditingStatus;
  videoPreviewUrl?: string;
  completedAt?: string;
}

export interface ContentRequest {
  id: string;
  clientId: string;
  clientName: string;
  businessName: string;
  title: string;
  ideaDescription: string;
  targetPlatform?: 'Instagram Reels' | 'TikTok' | 'YouTube Shorts' | 'LinkedIn Video' | 'Multi-Platform';
  preferredTone?: string;
  requestType: RequestType;
  productionSlotConsumed: 0 | 1;
  status: RequestStatus;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
  script?: ScriptVersion[];
  currentScriptVersion?: number;
  googleDocUrl?: string;
  scriptAttachment?: ScriptAttachment;
  production?: ProductionDetails;
  internalNotes?: string[];
  clientFeedback?: string[];
  rejectionReason?: string;
  slotReleasedAt?: string;
  slotReleasedBy?: string;
  slotReleaseReason?: string;
}

export interface PricingSettings {
  id: string;
  clientId?: string;
  enabled: boolean; // if false, entire pricing table is hidden from client
  monthlyRetainer: string; // e.g. "$2,500"
  billingCycle: string;    // e.g. "Monthly"
  includedReels: number;   // e.g. 4
  includedScripts: string; // e.g. "Unlimited"
  overagePerReel: string;  // e.g. "$450 / additional reel"
  rushFee: string;         // e.g. "$200 / rush shoot"
  currency: string;        // "USD"
  termsNotes: string;      // custom invoice & payment terms
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  clientId: string;
  requestId?: string;
  requestTitle?: string;
  action:
    | 'REQUEST_CREATED'
    | 'REQUEST_DELETED'
    | 'SLOT_CONSUMED'
    | 'SLOT_RELEASED'
    | 'CONVERTED_TO_PRODUCTION'
    | 'STATUS_UPDATED'
    | 'SCRIPT_UPDATED'
    | 'SHOOTING_SCHEDULED'
    | 'ALLOCATION_RESET'
    | 'ALLOCATION_MODIFIED'
    | 'PRICING_UPDATED';
  requestType?: RequestType;
  previousAllocation: number;
  newAllocation: number;
  actor: 'Client' | 'Admin Team' | 'System';
  actorName: string;
  details: string;
  timestamp: string;
}

export interface GoogleSheetIntegration {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSyncedAt: string;
  autoSyncOnSubmission: boolean;
}

export interface AppBootstrapData {
  client: Client;
  clients: Client[];
  currentAllocation: MonthlyAllocation;
  allAllocations: MonthlyAllocation[];
  requests: ContentRequest[];
  auditLogs: AuditLog[];
  pricingSettings: PricingSettings;
  googleSheetConfig?: GoogleSheetIntegration;
  activeMonth: { month: number; year: number; monthName: string };
}

