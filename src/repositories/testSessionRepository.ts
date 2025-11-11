import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface TestSessionRow extends RowDataPacket {
  id: number;
  user_id: number;
  label: string | null;
  month: number;
  year: number;
  measured_at: Date;
  created_at: Date;
}

export interface MeasurementRow extends RowDataPacket {
  id: number;
  test_session_id: number;
  indicator_id: number;
  value: number;
  created_at: Date;
  indicator_slug: string;
  indicator_name: string;
  indicator_unit: string;
  reference_min: number | null;
  reference_max: number | null;
  reference_male_min: number | null;
  reference_male_max: number | null;
  reference_female_min: number | null;
  reference_female_max: number | null;
  reference_text: string | null;
}

export interface InsertTestSessionInput {
  userId: number;
  label: string | null;
  month: number;
  year: number;
  measuredAt: string; // YYYY-MM-DD
}

export interface UpdateTestSessionInput {
  sessionId: number;
  label: string | null;
  month: number;
  year: number;
  measuredAt: string;
}

export interface MeasurementInput {
  indicatorId: number;
  value: number;
}

export async function insertTestSession(
  connection: PoolConnection,
  input: InsertTestSessionInput,
): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `
    INSERT INTO test_sessions (user_id, label, month, year, measured_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    [input.userId, input.label, input.month, input.year, input.measuredAt],
  );
  return result.insertId;
}

export async function updateTestSession(
  connection: PoolConnection,
  input: UpdateTestSessionInput,
): Promise<void> {
  await connection.execute(
    `
    UPDATE test_sessions
    SET label = ?, month = ?, year = ?, measured_at = ?
    WHERE id = ?
    `,
    [input.label, input.month, input.year, input.measuredAt, input.sessionId],
  );
}

export async function deleteTestSession(userId: number, sessionId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM test_sessions WHERE id = ? AND user_id = ?',
    [sessionId, userId],
  );
  return result.affectedRows > 0;
}

export async function listTestSessionsByUser(userId: number): Promise<TestSessionRow[]> {
  const [rows] = await pool.query<TestSessionRow[]>(
    `
    SELECT id, user_id, label, month, year, measured_at, created_at
    FROM test_sessions
    WHERE user_id = ?
    ORDER BY measured_at DESC, id DESC
    `,
    [userId],
  );
  return rows;
}

export async function getTestSessionById(userId: number, sessionId: number): Promise<TestSessionRow | null> {
  const [rows] = await pool.query<TestSessionRow[]>(
    `
    SELECT id, user_id, label, month, year, measured_at, created_at
    FROM test_sessions
    WHERE user_id = ? AND id = ?
    LIMIT 1
    `,
    [userId, sessionId],
  );
  return rows[0] ?? null;
}

export async function insertMeasurements(
  connection: PoolConnection,
  sessionId: number,
  measurements: MeasurementInput[],
): Promise<void> {
  if (measurements.length === 0) {
    return;
  }

  const rowsSql = measurements.map(() => '(?, ?, ?)').join(', ');
  const params: number[] = [];
  measurements.forEach(m => {
    params.push(sessionId, m.indicatorId, m.value);
  });

  await connection.execute(
    `
    INSERT INTO measurements (test_session_id, indicator_id, value)
    VALUES ${rowsSql}
    `,
    params,
  );
}

export async function upsertMeasurements(
  connection: PoolConnection,
  sessionId: number,
  measurements: MeasurementInput[],
): Promise<void> {
  if (measurements.length === 0) {
    await connection.execute('DELETE FROM measurements WHERE test_session_id = ?', [sessionId]);
    return;
  }

  const indicatorIds = measurements.map(m => m.indicatorId);
  const indicatorPlaceholders = indicatorIds.map(() => '?').join(', ');

  await connection.execute(
    `DELETE FROM measurements
     WHERE test_session_id = ?
       AND indicator_id NOT IN (${indicatorPlaceholders})`,
    [sessionId, ...indicatorIds],
  );

  const rowsSql = measurements.map(() => '(?, ?, ?)').join(', ');
  const params: number[] = [];
  measurements.forEach(m => {
    params.push(sessionId, m.indicatorId, m.value);
  });

  await connection.execute(
    `
    INSERT INTO measurements (test_session_id, indicator_id, value)
    VALUES ${rowsSql}
    ON DUPLICATE KEY UPDATE value = VALUES(value)
    `,
    params,
  );
}

export async function listMeasurementsBySessionIds(
  sessionIds: number[],
  language: string,
): Promise<MeasurementRow[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const [rows] = await pool.query<MeasurementRow[]>(
    `
    SELECT
      m.id,
      m.test_session_id,
      m.indicator_id,
      m.value,
      m.created_at,
      i.slug AS indicator_slug,
      COALESCE(t.translated_name, i.display_name) AS indicator_name,
      i.unit AS indicator_unit,
      COALESCE(t.translated_reference_text, i.reference_text) AS reference_text,
      i.reference_min,
      i.reference_max,
      i.reference_male_min,
      i.reference_male_max,
      i.reference_female_min,
      i.reference_female_max
    FROM measurements m
    INNER JOIN indicators i ON i.id = m.indicator_id
    LEFT JOIN indicator_translations t
      ON t.indicator_id = i.id AND t.language = ?
    WHERE m.test_session_id IN (?)
    ORDER BY m.test_session_id ASC, i.id ASC
    `,
    [language, sessionIds],
  );
  return rows;
}

