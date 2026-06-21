/**
 * googleTasks.ts — Browser-based Google Tasks sync via REST API
 *
 * Uses Google's OAuth 2.0 implicit grant flow for client-side auth.
 * Stores access tokens in localStorage with expiration tracking.
 *
 * To enable:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID (Web application type)
 *   3. Add your app's origin to Authorized JavaScript origins
 *   4. Enable the Google Tasks API at https://console.cloud.google.com/apis/library/tasks.googleapis.com
 *   5. Set VITE_GOOGLE_CLIENT_ID in your .env file
 */

const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const TOKEN_KEY = 'google_tasks_token';
const TOKEN_EXPIRY_KEY = 'google_tasks_token_expiry';
const DISCOVERY_DOCS = ['https://tasks.googleapis.com/$discovery/rest?version=v1'];

// ── Types ──────────────────────────────────────────────────────────

export interface TaskList {
  id: string;
  title: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status?: string;
  completed?: string;
}

export interface TasksResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  authenticated: boolean;
}

// ── Token Management ───────────────────────────────────────────────

function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;

  // Check if token is expired (with 5 min buffer)
  if (Date.now() >= parseInt(expiry, 10) - 300000) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

function storeToken(token: string, expiresIn: number = 3600): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ── OAuth Flow ─────────────────────────────────────────────────────

/**
 * Get the Google OAuth client ID from environment or empty string.
 */
export function getClientId(): string {
  return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
}

/**
 * Check if OAuth is configured (client ID is set).
 */
export function isOAuthConfigured(): boolean {
  return getClientId().length > 0;
}

/**
 * Generate the Google OAuth consent URL for implicit grant flow.
 */
export function getAuthUrl(redirectUri?: string): string {
  const clientId = getClientId();
  if (!clientId) return '';

  const redirect = redirectUri || window.location.origin + '/';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    scope: SCOPES.join(' '),
    response_type: 'token',
    include_granted_scopes: 'true',
    state: 'lifeos-keep-tasks',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Parse OAuth token from the URL fragment after redirect.
 * Should be called on app startup to capture the redirect response.
 */
export function parseAuthRedirect(): boolean {
  const hash = window.location.hash.substring(1);
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');

  if (accessToken && state === 'lifeos-keep-tasks') {
    storeToken(accessToken, expiresIn ? parseInt(expiresIn, 10) : 3600);
    // Clean the URL
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    return true;
  }

  return false;
}

/**
 * Check authentication status.
 */
export function checkAuth(): TasksResult {
  const token = getStoredToken();
  if (!isOAuthConfigured()) {
    return { success: false, authenticated: false, error: 'Google OAuth not configured. Set VITE_GOOGLE_CLIENT_ID.' };
  }
  return {
    success: !!token,
    authenticated: !!token,
    error: token ? undefined : 'Not authenticated with Google.',
  };
}

// ── Google Tasks REST API ──────────────────────────────────────────

/**
 * Make an authenticated request to the Google Tasks API.
 */
async function tasksApiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<TasksResult<T>> {
  const token = getStoredToken();
  if (!token) {
    return { success: false, error: 'Not authenticated', authenticated: false };
  }

  try {
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      clearToken();
      return { success: false, error: 'Token expired. Re-authenticate.', authenticated: false };
    }

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `API error ${response.status}: ${body}`, authenticated: true };
    }

    const data = await response.json();
    return { success: true, data, authenticated: true };
  } catch (err: any) {
    return { success: false, error: err.message, authenticated: !!token };
  }
}

/**
 * Get the default task list ID (first list, or '@default').
 */
async function getDefaultTaskListId(): Promise<string> {
  const result = await tasksApiFetch<{ items?: TaskList[] }>('/users/@me/lists');
  if (result.success && result.data?.items && result.data.items.length > 0) {
    return result.data.items[0].id;
  }
  return '@default';
}

/**
 * Create a new task in Google Tasks.
 */
export async function createTask(
  title: string,
  options: { due?: string; notes?: string } = {}
): Promise<TasksResult<Task>> {
  try {
    const tasklistId = await getDefaultTaskListId();
    const body: Record<string, string> = { title, status: 'needsAction' };
    if (options.due) body.due = new Date(options.due).toISOString();
    if (options.notes) body.notes = options.notes;

    return tasksApiFetch<Task>(`/lists/${encodeURIComponent(tasklistId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    return { success: false, error: err.message, authenticated: !!getStoredToken() };
  }
}

/**
 * List tasks from the default task list.
 */
export async function listTasks(maxResults: number = 100): Promise<TasksResult<Task[]>> {
  try {
    const tasklistId = await getDefaultTaskListId();
    const result = await tasksApiFetch<{ items?: Task[] }>(
      `/lists/${encodeURIComponent(tasklistId)}/tasks?maxResults=${maxResults}&showHidden=true`
    );
    if (result.success && result.data) {
      return { ...result, data: result.data.items || [] };
    }
    return { success: false, authenticated: !!getStoredToken(), error: result.error, data: [] };
  } catch (err: any) {
    return { success: false, error: err.message, authenticated: !!getStoredToken(), data: [] };
  }
}

/**
 * Update a task in Google Tasks.
 */
export async function updateTask(
  taskId: string,
  updates: Partial<{ title: string; due: string; notes: string; status: string }>
): Promise<TasksResult<Task>> {
  try {
    const tasklistId = await getDefaultTaskListId();

    // First get the full task to get its ETag
    const existing = await tasksApiFetch<Task>(
      `/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`
    );
    if (!existing.success) return existing;

    const body = { ...existing.data, ...updates };
    return tasksApiFetch<Task>(
      `/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    );
  } catch (err: any) {
    return { success: false, error: err.message, authenticated: !!getStoredToken() };
  }
}

/**
 * Delete a task from Google Tasks.
 */
export async function deleteTask(taskId: string): Promise<TasksResult<void>> {
  try {
    const tasklistId = await getDefaultTaskListId();
    return tasksApiFetch<void>(
      `/lists/${encodeURIComponent(tasklistId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'DELETE' }
    );
  } catch (err: any) {
    return { success: false, error: err.message, authenticated: !!getStoredToken() };
  }
}
