import React, { useState, useEffect, useCallback } from 'react';
import { githubSync } from '../services/githubSync';
import { checkAuth, getAuthUrl, parseAuthRedirect, clearToken as clearGoogleToken, isOAuthConfigured } from '../services/googleTasks';
import { useNoteStore } from '../store/noteStore';
import { Github, Cloud, Check, X, RefreshCw, ExternalLink, Key, AlertCircle, LogOut } from 'lucide-react';

export default function SyncSettings({ onClose }: { onClose: () => void }) {
  const { notes, loadNotes } = useNoteStore();

  // GitHub state
  const [gitPat, setGitPat] = useState('');
  const [gitStatus, setGitStatus] = useState<'idle' | 'checking' | 'connected' | 'syncing'>('idle');
  const [gitMessage, setGitMessage] = useState('');
  const [gitConnected, setGitConnected] = useState(false);

  // Google Tasks state
  const [gAuthStatus, setGAuthStatus] = useState<'checking' | 'connected' | 'disconnected' | 'unconfigured'>('checking');
  const [gSyncing, setGSyncing] = useState(false);
  const [gMessage, setGMessage] = useState('');

  // ── Init ────────────────────────────────────────────────────────

  useEffect(() => {
    // Check if we just returned from Google OAuth redirect
    parseAuthRedirect();

    // Load GitHub token
    const initGitHub = async () => {
      const loaded = await githubSync.loadToken();
      setGitConnected(loaded);
      if (loaded) setGitStatus('connected');
    };
    initGitHub();

    // Check Google auth
    const result = checkAuth();
    if (!isOAuthConfigured()) {
      setGAuthStatus('unconfigured');
    } else if (result.authenticated) {
      setGAuthStatus('connected');
    } else {
      setGAuthStatus('disconnected');
    }
  }, []);

  // ── GitHub handlers ─────────────────────────────────────────────

  const handleGitConnect = async () => {
    if (!gitPat.trim()) return;
    setGitStatus('checking');
    setGitMessage('');
    const valid = await githubSync.setToken(gitPat.trim());
    if (valid) {
      setGitConnected(true);
      setGitStatus('connected');
      setGitMessage('GitHub authenticated successfully!');
      setGitPat('');
    } else {
      setGitConnected(false);
      setGitStatus('idle');
      setGitMessage('Invalid token. Make sure it has repo scope.');
    }
  };

  const handleGitDisconnect = () => {
    githubSync.clearToken();
    setGitConnected(false);
    setGitStatus('idle');
    setGitMessage('');
  };

  const handleGitSync = async () => {
    setGitStatus('syncing');
    setGitMessage('Syncing notes to GitHub...');
    const result = await githubSync.syncNotes(notes);
    setGitStatus(result.success ? 'connected' : 'connected');
    setGitMessage(result.message);
  };

  // ── Google handlers ─────────────────────────────────────────────

  const handleGoogleConnect = () => {
    const url = getAuthUrl();
    if (url) {
      window.location.href = url;
    } else {
      setGMessage('Google OAuth not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file.');
    }
  };

  const handleGoogleDisconnect = () => {
    clearGoogleToken();
    setGAuthStatus('disconnected');
    setGMessage('');
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Cloud size={20} />
            Cloud Sync Settings
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">

          {/* ────────── GitHub Section ────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Github size={20} className="text-gray-700" />
              <h3 className="font-medium">GitHub Sync</h3>
              {gitConnected && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={12} /> Connected
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500">
              Sync notes to <code className="bg-gray-100 px-1 rounded">Gestalt360/personal_docs</code> via GitHub API.
            </p>

            {!gitConnected ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={gitPat}
                    onChange={e => setGitPat(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleGitConnect()}
                  />
                  <button
                    onClick={handleGitConnect}
                    disabled={gitStatus === 'checking' || !gitPat.trim()}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
                  >
                    {gitStatus === 'checking' ? (
                      <><RefreshCw size={14} className="animate-spin" /> Verifying</>
                    ) : (
                      <><Key size={14} /> Connect</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Create a token at{' '}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener"
                     className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                    github.com/settings/tokens <ExternalLink size={10} />
                  </a>
                  {' '}with <code className="bg-gray-100 px-1 rounded">repo</code> scope.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={16} className="text-green-600" />
                  Authenticated as <span className="font-medium">{githubSync.tokenPreview}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGitSync}
                    disabled={gitStatus === 'syncing'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {gitStatus === 'syncing' ? (
                      <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
                    ) : (
                      <><RefreshCw size={14} /> Sync Now</>
                    )}
                  </button>
                  <button
                    onClick={handleGitDisconnect}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"
                  >
                    <LogOut size={14} /> Disconnect
                  </button>
                </div>
              </div>
            )}

            {gitMessage && (
              <div className={`text-sm p-2 rounded-lg ${
                gitMessage.includes('success') || gitMessage.includes('Authenticated')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {gitMessage}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* ────────── Google Tasks Section ────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud size={20} className="text-blue-600" />
              <h3 className="font-medium">Google Tasks</h3>
              {gAuthStatus === 'connected' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={12} /> Connected
                </span>
              )}
              {gAuthStatus === 'unconfigured' && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  Not configured
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500">
              Sync reminders to Google Tasks. Requires a Google Cloud project with the Tasks API enabled.
            </p>

            {gAuthStatus === 'connected' ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  Authenticated with Google
                </div>
                <button
                  onClick={handleGoogleDisconnect}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"
                >
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            ) : gAuthStatus === 'unconfigured' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Google OAuth not configured</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1 text-yellow-700">
                      <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener"
                            className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                      <li>Create an OAuth 2.0 Client ID (Web application)</li>
                      <li>Add your app's origin to Authorized JavaScript origins</li>
                      <li>Enable the Google Tasks API</li>
                      <li>Set <code className="bg-yellow-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-yellow-100 px-1 rounded">.env</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGoogleConnect}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                <Cloud size={14} /> Sign in with Google
              </button>
            )}

            {gMessage && (
              <div className="text-sm p-2 rounded-lg bg-red-50 text-red-700">
                {gMessage}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* ────────── Storage Info ────────── */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>Notes are stored locally in IndexedDB and sync to cloud services you connect.</p>
            <p>Total notes: <strong>{notes.length}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
