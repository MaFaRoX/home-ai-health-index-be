import {
  deleteTestSession,
  getTestSessionById,
  insertMeasurements,
  insertTestSession,
  listMeasurementsBySessionIds,
  listTestSessionsByUser,
  MeasurementInput,
  MeasurementRow,
  TestSessionRow,
  updateTestSession,
  upsertMeasurements,
} from '../repositories/testSessionRepository';
import { ensureIndicatorExists } from './indicatorService';
import { withTransaction } from '../utils/db';
import { AppError } from '../utils/errors';

export interface MeasurementRequest {
  indicatorSlug: string;
  value: number;
}

export interface CreateTestSessionRequest {
  label?: string | null;
  measuredAt: string; // YYYY-MM-DD
  measurements?: MeasurementRequest[];
}

export interface UpdateTestSessionRequest {
  label?: string | null;
  measuredAt?: string;
  measurements?: MeasurementRequest[];
}

export interface MeasurementResponse {
  id: number;
  indicatorId: number;
  indicatorSlug: string;
  indicatorName: string;
  unit: string;
  value: number;
  referenceText: string | null;
  referenceRange: {
    min: number | null;
    max: number | null;
    male?: { min: number | null; max: number | null };
    female?: { min: number | null; max: number | null };
  };
}

export interface TestSessionResponse {
  id: number;
  label: string | null;
  month: number;
  year: number;
  measuredAt: string;
  createdAt: string;
  measurements: MeasurementResponse[];
}

const DEFAULT_LANGUAGE = 'vi';

function normalizeLabel(label?: string | null): string | null {
  if (!label) {
    return null;
  }
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, 50);
}

function normalizeMeasuredAt(measuredAt: string | undefined): { isoDate: string; month: number; year: number } {
  if (!measuredAt) {
    throw new AppError(400, 'measuredAt is required');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredAt)) {
    throw new AppError(400, 'measuredAt must be in YYYY-MM-DD format');
  }

  const date = new Date(`${measuredAt}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'Invalid measuredAt date');
  }

  const month = Number(measuredAt.slice(5, 7));
  const year = Number(measuredAt.slice(0, 4));

  if (month < 1 || month > 12) {
    throw new AppError(400, 'Invalid month in measuredAt');
  }

  return { isoDate: measuredAt, month, year };
}

function mapMeasurementRow(row: MeasurementRow): MeasurementResponse {
  return {
    id: row.id,
    indicatorId: row.indicator_id,
    indicatorSlug: row.indicator_slug,
    indicatorName: row.indicator_name,
    unit: row.indicator_unit,
    value: row.value,
    referenceText: row.reference_text,
    referenceRange: {
      min: row.reference_min,
      max: row.reference_max,
      male: row.reference_male_min !== null || row.reference_male_max !== null
        ? { min: row.reference_male_min, max: row.reference_male_max }
        : undefined,
      female: row.reference_female_min !== null || row.reference_female_max !== null
        ? { min: row.reference_female_min, max: row.reference_female_max }
        : undefined,
    },
  };
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapSessionRow(
  row: TestSessionRow,
  measurementRows: MeasurementRow[],
): TestSessionResponse {
  return {
    id: row.id,
    label: row.label,
    month: row.month,
    year: row.year,
    measuredAt: formatDateOnly(row.measured_at),
    createdAt: row.created_at.toISOString(),
    measurements: measurementRows.map(mapMeasurementRow),
  };
}

async function validateMeasurementInputs(
  measurementInputs: MeasurementRequest[] | undefined,
): Promise<MeasurementInput[]> {
  if (!measurementInputs || measurementInputs.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: MeasurementInput[] = [];

  for (const measurement of measurementInputs) {
    const slug = measurement.indicatorSlug?.trim();
    if (!slug) {
      throw new AppError(400, 'indicatorSlug is required for each measurement');
    }
    if (seen.has(slug)) {
      throw new AppError(400, `Duplicate indicator slug: ${slug}`);
    }
    seen.add(slug);

    if (typeof measurement.value !== 'number' || !Number.isFinite(measurement.value)) {
      throw new AppError(400, `Invalid value for indicator ${slug}`);
    }

    const indicator = await ensureIndicatorExists(slug);
    normalized.push({
      indicatorId: indicator.id,
      value: measurement.value,
    });
  }

  return normalized;
}

export async function listTestSessions(userId: number, language = DEFAULT_LANGUAGE): Promise<TestSessionResponse[]> {
  const sessions = await listTestSessionsByUser(userId);
  const sessionIds = sessions.map(session => session.id);
  const measurementRows = await listMeasurementsBySessionIds(sessionIds, language);

  const measurementMap = new Map<number, MeasurementRow[]>();
  measurementRows.forEach(row => {
    if (!measurementMap.has(row.test_session_id)) {
      measurementMap.set(row.test_session_id, []);
    }
    measurementMap.get(row.test_session_id)!.push(row);
  });

  return sessions.map(session => mapSessionRow(session, measurementMap.get(session.id) ?? []));
}

export async function getTestSessionDetail(
  userId: number,
  sessionId: number,
  language = DEFAULT_LANGUAGE,
): Promise<TestSessionResponse> {
  const session = await getTestSessionById(userId, sessionId);
  if (!session) {
    throw new AppError(404, 'Test session not found');
  }

  const measurements = await listMeasurementsBySessionIds([session.id], language);
  return mapSessionRow(session, measurements);
}

export async function createTestSession(
  userId: number,
  input: CreateTestSessionRequest,
  language = DEFAULT_LANGUAGE,
): Promise<TestSessionResponse> {
  const label = normalizeLabel(input.label ?? null);
  const { isoDate, month, year } = normalizeMeasuredAt(input.measuredAt);

  const sessionId = await withTransaction(async connection => {
    const measurements = await validateMeasurementInputs(input.measurements);
    const sessionId = await insertTestSession(connection, {
      userId,
      label,
      month,
      year,
      measuredAt: isoDate,
    });

    await insertMeasurements(connection, sessionId, measurements);
    return sessionId;
  });

  return getTestSessionDetail(userId, sessionId, language);
}

export async function updateTestSessionDetails(
  userId: number,
  sessionId: number,
  input: UpdateTestSessionRequest,
  language = DEFAULT_LANGUAGE,
): Promise<TestSessionResponse> {
  const session = await getTestSessionById(userId, sessionId);
  if (!session) {
    throw new AppError(404, 'Test session not found');
  }

  const label = input.label !== undefined ? normalizeLabel(input.label) : session.label;
  const measuredInfo = input.measuredAt ? normalizeMeasuredAt(input.measuredAt) : {
    isoDate: session.measured_at.toISOString().slice(0, 10),
    month: session.month,
    year: session.year,
  };

  await withTransaction(async connection => {
    const measurements = await validateMeasurementInputs(input.measurements);

    await updateTestSession(connection, {
      sessionId,
      label,
      month: measuredInfo.month,
      year: measuredInfo.year,
      measuredAt: measuredInfo.isoDate,
    });

    if (input.measurements) {
      await upsertMeasurements(connection, sessionId, measurements);
    }
  });

  return getTestSessionDetail(userId, sessionId, language);
}

export async function removeTestSession(userId: number, sessionId: number): Promise<void> {
  const deleted = await deleteTestSession(userId, sessionId);
  if (!deleted) {
    throw new AppError(404, 'Test session not found');
  }
}

