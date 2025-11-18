import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface CVRecord extends RowDataPacket {
  id: number;
  user_id: number;
  app_id: number;
  title: string;
  cv_data: string; // JSON string (CAST to CHAR ensures string type)
  template_id: number;
  is_public: boolean;
  share_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCVInput {
  userId: number;
  appId: number;
  title: string;
  cvData: unknown; // Will be JSON stringified
  templateId?: number;
}

export interface UpdateCVInput {
  title?: string;
  cvData?: unknown;
  templateId?: number;
  isPublic?: boolean;
}

export async function createCV(input: CreateCVInput): Promise<number> {
  const { userId, appId, title, cvData, templateId = 1 } = input;
  const cvDataJson = JSON.stringify(cvData);
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO cvs (user_id, app_id, title, cv_data, template_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, appId, title, cvDataJson, templateId],
  );
  return result.insertId;
}

export async function findCVsByUser(userId: number, appId: number): Promise<CVRecord[]> {
  const [rows] = await pool.query<CVRecord[]>(
    `SELECT id, user_id, app_id, title, 
            JSON_UNQUOTE(JSON_EXTRACT(cv_data, '$')) as cv_data,
            template_id, is_public, share_token, created_at, updated_at
     FROM cvs 
     WHERE user_id = ? AND app_id = ?
     ORDER BY updated_at DESC`,
    [userId, appId],
  );
  return rows;
}

export async function findCVById(cvId: number, userId?: number): Promise<CVRecord | null> {
  if (userId) {
    const [rows] = await pool.query<CVRecord[]>(
      `SELECT id, user_id, app_id, title, 
              JSON_UNQUOTE(JSON_EXTRACT(cv_data, '$')) as cv_data,
              template_id, is_public, share_token, created_at, updated_at
       FROM cvs WHERE id = ? AND user_id = ? LIMIT 1`,
      [cvId, userId],
    );
    return rows[0] ?? null;
  }
  const [rows] = await pool.query<CVRecord[]>(
    `SELECT id, user_id, app_id, title, 
            JSON_UNQUOTE(JSON_EXTRACT(cv_data, '$')) as cv_data,
            template_id, is_public, share_token, created_at, updated_at
     FROM cvs WHERE id = ? LIMIT 1`, 
    [cvId]
  );
  return rows[0] ?? null;
}

export async function findCVByShareToken(shareToken: string): Promise<CVRecord | null> {
  const [rows] = await pool.query<CVRecord[]>(
    `SELECT id, user_id, app_id, title, 
            JSON_UNQUOTE(JSON_EXTRACT(cv_data, '$')) as cv_data,
            template_id, is_public, share_token, created_at, updated_at
     FROM cvs WHERE share_token = ? AND is_public = TRUE LIMIT 1`,
    [shareToken],
  );
  return rows[0] ?? null;
}

export async function updateCV(cvId: number, userId: number, input: UpdateCVInput): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    values.push(input.title);
  }

  if (input.cvData !== undefined) {
    fields.push('cv_data = ?');
    values.push(JSON.stringify(input.cvData));
  }

  if (input.templateId !== undefined) {
    fields.push('template_id = ?');
    values.push(input.templateId);
  }

  if (input.isPublic !== undefined) {
    fields.push('is_public = ?');
    values.push(input.isPublic);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(cvId, userId);
  await pool.execute<ResultSetHeader>(
    `UPDATE cvs SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values,
  );
}

export async function deleteCV(cvId: number, userId: number): Promise<void> {
  await pool.execute('DELETE FROM cvs WHERE id = ? AND user_id = ?', [cvId, userId]);
}

export async function updateShareToken(cvId: number, userId: number, shareToken: string | null): Promise<void> {
  await pool.execute('UPDATE cvs SET share_token = ? WHERE id = ? AND user_id = ?', [
    shareToken,
    cvId,
    userId,
  ]);
}

export async function countCVsByUser(userId: number, appId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM cvs WHERE user_id = ? AND app_id = ?',
    [userId, appId],
  );
  return rows[0]?.count ?? 0;
}

