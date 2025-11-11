import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface UserRecord extends RowDataPacket {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  sex: 'male' | 'female' | 'other' | null;
  preferred_language: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  fullName: string;
  phone: string;
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

export async function findByPhone(phone: string): Promise<UserRecord | null> {
  const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
  return rows[0] ?? null;
}

export async function findById(userId: number): Promise<UserRecord | null> {
  const [rows] = await pool.query<UserRecord[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0] ?? null;
}

export async function createUser(input: CreateUserInput): Promise<number> {
  const { fullName, phone, passwordHash, email = null, sex = null, preferredLanguage = 'vi' } = input;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (full_name, phone, email, password_hash, sex, preferred_language)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, phone, email, passwordHash, sex, preferredLanguage],
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

