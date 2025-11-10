import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface SessionRecord extends RowDataPacket {
  id: number;
  user_id: number;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
}

export async function createSession(userId: number, refreshToken: string, expiresAt: Date): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO sessions (user_id, refresh_token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, refreshToken, expiresAt],
  );
  return result.insertId;
}

export async function findSessionByToken(refreshToken: string): Promise<SessionRecord | null> {
  const [rows] = await pool.query<SessionRecord[]>(
    'SELECT * FROM sessions WHERE refresh_token = ? LIMIT 1',
    [refreshToken],
  );
  return rows[0] ?? null;
}

export async function deleteSessionByToken(refreshToken: string): Promise<void> {
  await pool.execute('DELETE FROM sessions WHERE refresh_token = ?', [refreshToken]);
}

export async function deleteSessionsByUserId(userId: number): Promise<void> {
  await pool.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

