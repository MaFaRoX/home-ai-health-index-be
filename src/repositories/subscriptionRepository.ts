import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface AppRecord extends RowDataPacket {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface SubscriptionPlanRecord extends RowDataPacket {
  id: number;
  app_id: number;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string | null; // JSON string
  created_at: Date;
}

export interface UserSubscriptionRecord extends RowDataPacket {
  id: number;
  user_id: number;
  app_id: number;
  plan_id: number;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  start_date: Date;
  end_date: Date;
  auto_renew: boolean;
  payment_method: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionWithPlan extends UserSubscriptionRecord {
  plan_slug: string;
  plan_name: string;
  app_slug: string;
  app_name: string;
  features: string | null;
}

export async function findAppBySlug(slug: string): Promise<AppRecord | null> {
  const [rows] = await pool.query<AppRecord[]>('SELECT * FROM apps WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] ?? null;
}

export async function findPlanBySlug(appId: number, planSlug: string): Promise<SubscriptionPlanRecord | null> {
  const [rows] = await pool.query<SubscriptionPlanRecord[]>(
    'SELECT * FROM subscription_plans WHERE app_id = ? AND slug = ? LIMIT 1',
    [appId, planSlug],
  );
  return rows[0] ?? null;
}

export async function getUserSubscription(
  userId: number,
  appId: number,
): Promise<SubscriptionWithPlan | null> {
  const [rows] = await pool.query<SubscriptionWithPlan[]>(
    `SELECT 
      us.*,
      sp.slug as plan_slug,
      sp.name as plan_name,
      sp.features,
      a.slug as app_slug,
      a.name as app_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    JOIN apps a ON us.app_id = a.id
    WHERE us.user_id = ? AND us.app_id = ? AND us.status = 'active'
    ORDER BY us.end_date DESC
    LIMIT 1`,
    [userId, appId],
  );
  return rows[0] ?? null;
}

export async function getUserSubscriptions(userId: number): Promise<SubscriptionWithPlan[]> {
  const [rows] = await pool.query<SubscriptionWithPlan[]>(
    `SELECT 
      us.*,
      sp.slug as plan_slug,
      sp.name as plan_name,
      sp.features,
      a.slug as app_slug,
      a.name as app_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    JOIN apps a ON us.app_id = a.id
    WHERE us.user_id = ?
    ORDER BY us.created_at DESC`,
    [userId],
  );
  return rows;
}

export async function createSubscription(
  userId: number,
  appId: number,
  planId: number,
  durationDays: number,
  paymentMethod: string | null = null,
): Promise<number> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO user_subscriptions (user_id, app_id, plan_id, status, start_date, end_date, payment_method)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    [userId, appId, planId, startDate, endDate, paymentMethod],
  );
  return result.insertId;
}

export async function updateSubscriptionStatus(
  subscriptionId: number,
  status: 'active' | 'expired' | 'cancelled' | 'pending',
): Promise<void> {
  await pool.execute('UPDATE user_subscriptions SET status = ? WHERE id = ?', [status, subscriptionId]);
}

export async function expireOldSubscriptions(): Promise<void> {
  await pool.execute(
    `UPDATE user_subscriptions 
     SET status = 'expired' 
     WHERE status = 'active' AND end_date < NOW()`,
  );
}

