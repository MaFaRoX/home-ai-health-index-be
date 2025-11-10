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

