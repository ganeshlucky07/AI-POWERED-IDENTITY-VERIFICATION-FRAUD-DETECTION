
export enum KycStatus {
  IDLE = 'IDLE',
  SCANNING_ID = 'SCANNING_ID',
  CAPTURING_SELFIE = 'CAPTURING_SELFIE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface ExtractedData {
  fullName: string;
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  issuingCountry: string;
  documentType: string;
}

export interface FraudCheck {
  check: string;
  passed: boolean;
  details: string;
}

export interface KycResult {
  id: string;
  timestamp: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  faceMatchScore: number; // 0-100
  extractedData: ExtractedData;
  fraudChecks: FraudCheck[];
  reasoning: string;
}

export interface KycState {
  status: KycStatus;
  idImage: string | null; // Base64
  selfieImage: string | null; // Base64
  result: KycResult | null;
  error: string | null;
}

export interface DeviceIntel {
  ip: string;
  os: string;
  browser: string;
  lastSeen: number;
  userAgent: string;
}

// Auth Types
export interface User {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  kycResult?: KycResult | null;
  history: KycResult[];
  
  // Permanent Security Storage
  deviceHistory: DeviceIntel[];
  lastKnownDevice?: DeviceIntel;
  accountCreated: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
