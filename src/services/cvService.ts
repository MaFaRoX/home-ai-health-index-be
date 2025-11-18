import { AppError } from '../utils/errors';
import {
  createCV,
  findCVsByUser,
  findCVById,
  findCVByShareToken,
  updateCV,
  deleteCV,
  updateShareToken,
  countCVsByUser,
  CVRecord,
} from '../repositories/cvRepository';
import { findAppBySlug } from '../repositories/subscriptionRepository';
import { getUserSubscriptionForApp } from './subscriptionService';
import crypto from 'crypto';

export interface CVData {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    linkedinLabel: string;
    website: string;
    websiteLabel: string;
    facebook: string;
    facebookLabel: string;
    zalo: string;
    zaloLabel: string;
    photo: string;
    showLinkedinQR?: boolean;
    showPortfolioQR?: boolean;
  };
  profile: string;
  workExperience: Array<{
    position: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    responsibilities: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    startDate: string;
    endDate: string;
    details: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  languages: Array<{
    name: string;
    level: string;
  }>;
  certifications: string[];
  customSections: Array<{
    title: string;
    content: string;
  }>;
}

export interface CV {
  id: number;
  userId: number;
  title: string;
  cvData: CVData;
  templateId: number;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function parseCVData(cvDataJson: string | object): CVData {
  try {
    // MySQL JSON columns can be returned as parsed objects by mysql2 driver
    // We use CAST in SQL to ensure string, but handle both for safety
    if (typeof cvDataJson === 'object' && cvDataJson !== null && !Array.isArray(cvDataJson)) {
      return cvDataJson as CVData;
    }
    // If it's a string, parse it
    if (typeof cvDataJson === 'string') {
      return JSON.parse(cvDataJson) as CVData;
    }
    throw new Error(`Invalid CV data type: ${typeof cvDataJson}`);
  } catch (error) {
    console.error('Failed to parse CV data:', error);
    console.error('CV data type:', typeof cvDataJson);
    console.error('CV data value:', cvDataJson);
    throw new AppError(500, 'Invalid CV data format');
  }
}

function mapCV(record: CVRecord): CV {
  return {
    id: record.id,
    userId: record.user_id,
    title: record.title,
    cvData: parseCVData(record.cv_data),
    templateId: record.template_id,
    isPublic: record.is_public,
    shareToken: record.share_token,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function validateCVData(data: unknown): data is CVData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const cv = data as Partial<CVData>;
  return (
    typeof cv.personalInfo === 'object' &&
    typeof cv.profile === 'string' &&
    Array.isArray(cv.workExperience) &&
    Array.isArray(cv.education) &&
    typeof cv.skills === 'object' &&
    Array.isArray(cv.languages) &&
    Array.isArray(cv.certifications)
  );
}

async function checkCVLimit(userId: number, appSlug: string): Promise<void> {
  const app = await findAppBySlug(appSlug);
  if (!app) {
    throw new AppError(404, `App '${appSlug}' not found`);
  }

  const subscription = await getUserSubscriptionForApp(userId, appSlug);
  const maxCVs = subscription
    ? (subscription.features.max_cvs as number | undefined)
    : undefined;

  // If max_cvs is -1, unlimited
  if (maxCVs === -1) {
    return;
  }

  // Default limit for free users
  const limit = maxCVs ?? 1;
  const currentCount = await countCVsByUser(userId, app.id);

  if (currentCount >= limit) {
    throw new AppError(
      403,
      `You have reached the maximum number of CVs (${limit}) for your plan. Upgrade to premium for unlimited CVs.`,
    );
  }
}

export async function createUserCV(
  userId: number,
  appSlug: string,
  title: string,
  cvData: unknown,
  templateId: number = 1,
): Promise<CV> {
  if (!validateCVData(cvData)) {
    throw new AppError(400, 'Invalid CV data structure');
  }

  await checkCVLimit(userId, appSlug);

  const app = await findAppBySlug(appSlug);
  if (!app) {
    throw new AppError(404, `App '${appSlug}' not found`);
  }

  const cvId = await createCV({
    userId,
    appId: app.id,
    title,
    cvData,
    templateId,
  });

  const cvRecord = await findCVById(cvId);
  if (!cvRecord) {
    throw new AppError(500, 'Failed to retrieve created CV');
  }

  return mapCV(cvRecord);
}

export async function getUserCVs(userId: number, appSlug: string): Promise<CV[]> {
  const app = await findAppBySlug(appSlug);
  if (!app) {
    throw new AppError(404, `App '${appSlug}' not found`);
  }

  const cvRecords = await findCVsByUser(userId, app.id);
  return cvRecords.map(mapCV);
}

export async function getCV(cvId: number, userId?: number): Promise<CV> {
  const cvRecord = await findCVById(cvId, userId);
  if (!cvRecord) {
    throw new AppError(404, 'CV not found');
  }

  // If userId provided, ensure it matches
  if (userId && cvRecord.user_id !== userId) {
    throw new AppError(403, 'Access denied');
  }

  return mapCV(cvRecord);
}

export async function getSharedCV(shareToken: string): Promise<CV> {
  const cvRecord = await findCVByShareToken(shareToken);
  if (!cvRecord) {
    throw new AppError(404, 'Shared CV not found or not public');
  }

  return mapCV(cvRecord);
}

export async function updateUserCV(
  cvId: number,
  userId: number,
  updates: { title?: string; cvData?: unknown; templateId?: number },
): Promise<CV> {
  // Verify CV exists and belongs to user
  const existingCV = await findCVById(cvId, userId);
  if (!existingCV) {
    throw new AppError(404, 'CV not found');
  }

  // Validate CV data if provided
  if (updates.cvData && !validateCVData(updates.cvData)) {
    throw new AppError(400, 'Invalid CV data structure');
  }

  await updateCV(cvId, userId, updates);

  const updatedCV = await findCVById(cvId, userId);
  if (!updatedCV) {
    throw new AppError(500, 'Failed to retrieve updated CV');
  }

  return mapCV(updatedCV);
}

export async function deleteUserCV(cvId: number, userId: number): Promise<void> {
  const cvRecord = await findCVById(cvId, userId);
  if (!cvRecord) {
    throw new AppError(404, 'CV not found');
  }

  await deleteCV(cvId, userId);
}

export async function shareCV(cvId: number, userId: number, isPublic: boolean): Promise<string | null> {
  const cvRecord = await findCVById(cvId, userId);
  if (!cvRecord) {
    throw new AppError(404, 'CV not found');
  }

  let shareToken: string | null = null;

  if (isPublic) {
    // Generate unique share token
    shareToken = crypto.randomBytes(32).toString('hex');
    await updateShareToken(cvId, userId, shareToken);
    await updateCV(cvId, userId, { isPublic: true });
  } else {
    await updateShareToken(cvId, userId, null);
    await updateCV(cvId, userId, { isPublic: false });
  }

  return shareToken;
}

