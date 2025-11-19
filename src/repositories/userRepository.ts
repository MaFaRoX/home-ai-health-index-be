import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface UserRecord extends RowDataPacket {
  id: number;
  full_name: string;
  username: string;
  email: string | null;
  password_hash: string | null;
  sex: 'male' | 'female' | 'other' | null;
  preferred_language: string;
  google_id: string | null;
  google_email: string | null;
  avatar_url: string | null;
  auth_provider: 'local' | 'google' | 'both';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  fullName: string;
  username: string;
  passwordHash: string;
  email?: string | null;
  sex?: 'male' | 'female' | 'other' | null;
  preferredLanguage?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  passwordHash?: string;
  preferredLanguage?: string;
  sex?: 'male' | 'female' | 'other' | null;
}

export async function findByUsername(username: string): Promise<UserRecord | null> {
  const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] ?? null;
}

export async function findById(userId: number): Promise<UserRecord | null> {
  const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0] ?? null;
}

export async function createUser(input: CreateUserInput): Promise<number> {
  const { fullName, username, passwordHash, email = null, sex = null, preferredLanguage = 'vi' } = input;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (full_name, username, email, password_hash, sex, preferred_language, auth_provider)
     VALUES (?, ?, ?, ?, ?, ?, 'local')`,
    [fullName, username, email, passwordHash, sex, preferredLanguage],
  );
  return result.insertId;
}

export async function updateUser(userId: number, input: UpdateUserInput): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.fullName !== undefined) {
    fields.push('full_name = ?');
    values.push(input.fullName);
  }
  if (input.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    values.push(input.passwordHash);
  }
  if (input.preferredLanguage !== undefined) {
    fields.push('preferred_language = ?');
    values.push(input.preferredLanguage);
  }
  if (input.sex !== undefined) {
    fields.push('sex = ?');
    values.push(input.sex);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(userId);
  await pool.execute<ResultSetHeader>(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export interface CreateGoogleUserInput {
  fullName: string;
  email: string;
  googleId: string;
  avatarUrl?: string;
  preferredLanguage?: string;
}

export async function findByGoogleId(googleId: string): Promise<UserRecord | null> {
  const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
  return rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
  const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] ?? null;
}

export async function createGoogleUser(input: CreateGoogleUserInput): Promise<number> {
  const { fullName, email, googleId, avatarUrl = null, preferredLanguage = 'vi' } = input;
  // Generate username from email (before @) or use Google ID as fallback
  let baseUsername = email.split('@')[0] || `google_${googleId.substring(0, 20)}`;
  // Clean username: remove special characters, limit length
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = `google_${googleId.substring(0, 20)}`;
  }
  
  // Check if username exists, append number if needed
  let username = baseUsername;
  let counter = 1;
  while (await findByUsername(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
    if (counter > 999) {
      // Fallback to Google ID if too many conflicts
      username = `google_${googleId}`;
      break;
    }
  }
  
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (full_name, username, email, google_id, google_email, avatar_url, preferred_language, auth_provider)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'google')`,
    [fullName, username, email, googleId, email, avatarUrl, preferredLanguage],
  );
  return result.insertId;
}

export async function linkGoogleAccount(
  userId: number,
  googleId: string,
  googleEmail: string,
  avatarUrl?: string,
): Promise<void> {
  await pool.execute(
    `UPDATE users 
     SET google_id = ?, google_email = ?, avatar_url = COALESCE(?, avatar_url),
         auth_provider = CASE WHEN password_hash IS NOT NULL THEN 'both' ELSE 'google' END
     WHERE id = ?`,
    [googleId, googleEmail, avatarUrl, userId],
  );
}

