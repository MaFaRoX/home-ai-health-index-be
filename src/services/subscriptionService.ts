import { AppError } from '../utils/errors';
import {
  findAppBySlug,
  findPlanBySlug,
  getUserSubscription,
  getUserSubscriptions,
  createSubscription,
  updateSubscriptionStatus,
  SubscriptionWithPlan,
} from '../repositories/subscriptionRepository';

export interface SubscriptionFeatures {
  [key: string]: unknown;
}

export interface Subscription {
  id: number;
  appSlug: string;
  appName: string;
  planSlug: string;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: Date;
  endDate: Date;
  remainingDays: number;
  features: SubscriptionFeatures;
}

function parseFeatures(featuresJson: string | null): SubscriptionFeatures {
  if (!featuresJson) return {};
  try {
    return JSON.parse(featuresJson) as SubscriptionFeatures;
  } catch {
    return {};
  }
}

function calculateRemainingDays(endDate: Date): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function mapSubscription(record: SubscriptionWithPlan): Subscription {
  return {
    id: record.id,
    appSlug: record.app_slug,
    appName: record.app_name,
    planSlug: record.plan_slug,
    planName: record.plan_name,
    status: record.status,
    startDate: record.start_date,
    endDate: record.end_date,
    remainingDays: calculateRemainingDays(record.end_date),
    features: parseFeatures(record.features),
  };
}

export async function getUserSubscriptionForApp(
  userId: number,
  appSlug: string,
): Promise<Subscription | null> {
  const app = await findAppBySlug(appSlug);
  if (!app) {
    throw new AppError(404, `App '${appSlug}' not found`);
  }

  const subscription = await getUserSubscription(userId, app.id);
  if (!subscription) {
    return null;
  }

  // Check if subscription is expired
  if (subscription.status === 'active' && subscription.end_date.getTime() < Date.now()) {
    await updateSubscriptionStatus(subscription.id, 'expired');
    return null;
  }

  return mapSubscription(subscription);
}

export async function getAllUserSubscriptions(userId: number): Promise<Subscription[]> {
  const subscriptions = await getUserSubscriptions(userId);
  return subscriptions.map(mapSubscription);
}

export async function checkFeatureAccess(
  userId: number,
  appSlug: string,
  feature: string,
): Promise<boolean> {
  const subscription = await getUserSubscriptionForApp(userId, appSlug);
  if (!subscription || subscription.status !== 'active') {
    return false;
  }

  const features = subscription.features;
  const featureValue = features[feature];

  // Feature exists and is truthy
  if (featureValue === true) {
    return true;
  }

  // Feature is a number (e.g., max_cvs: 10)
  if (typeof featureValue === 'number') {
    return featureValue > 0 || featureValue === -1; // -1 means unlimited
  }

  // Feature is 'all' (e.g., templates: 'all')
  if (featureValue === 'all') {
    return true;
  }

  return false;
}

export async function isPremium(userId: number, appSlug: string): Promise<boolean> {
  const subscription = await getUserSubscriptionForApp(userId, appSlug);
  return subscription !== null && subscription.status === 'active' && subscription.planSlug === 'premium';
}

export async function getRemainingDays(userId: number, appSlug: string): Promise<number> {
  const subscription = await getUserSubscriptionForApp(userId, appSlug);
  if (!subscription || subscription.status !== 'active') {
    return 0;
  }
  return subscription.remainingDays;
}

export async function createUserSubscription(
  userId: number,
  appSlug: string,
  planSlug: string,
  durationDays: number,
  paymentMethod: string | null = null,
): Promise<Subscription> {
  const app = await findAppBySlug(appSlug);
  if (!app) {
    throw new AppError(404, `App '${appSlug}' not found`);
  }

  const plan = await findPlanBySlug(app.id, planSlug);
  if (!plan) {
    throw new AppError(404, `Plan '${planSlug}' not found for app '${appSlug}'`);
  }

  // Check if user already has an active subscription
  const existingSubscription = await getUserSubscription(userId, app.id);
  if (existingSubscription && existingSubscription.status === 'active') {
    throw new AppError(409, 'User already has an active subscription for this app');
  }

  await createSubscription(userId, app.id, plan.id, durationDays, paymentMethod);
  
  // Fetch the created subscription
  const subscription = await getUserSubscription(userId, app.id);
  if (!subscription) {
    throw new AppError(500, 'Failed to retrieve created subscription');
  }

  return mapSubscription(subscription);
}

export async function cancelSubscription(userId: number, appSlug: string): Promise<void> {
  const app = await findAppBySlug(appSlug);
  if (!app) {
    throw new AppError(404, `App '${appSlug}' not found`);
  }

  const subscription = await getUserSubscription(userId, app.id);
  if (!subscription) {
    throw new AppError(404, 'No active subscription found');
  }

  if (subscription.status !== 'active') {
    throw new AppError(400, 'Subscription is not active');
  }

  await updateSubscriptionStatus(subscription.id, 'cancelled');
}

