'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import PageHeader from '@/components/ui/PageHeader';
import TripIntelligenceCard from './TripIntelligenceCard';

interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export default function SettingsClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  // Memory management state
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: { emergencyContactName?: string | null; emergencyContactEmail?: string | null }) => {
        setName(data.emergencyContactName ?? '');
        setEmail(data.emergencyContactEmail ?? '');
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const fetchMemories = useCallback(() => {
    setMemoriesLoading(true);
    fetch('/api/agent/memory')
      .then((res) => res.json())
      .then((data: { memories?: MemoryEntry[] }) => {
        setMemories(data.memories ?? []);
        setMemoriesLoading(false);
      })
      .catch(() => {
        setMemoriesLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDeleteMemory = useCallback(async (id: string) => {
    setMemoryError(null);
    setDeletingMemoryId(id);
    try {
      const res = await fetch('/api/agent/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setMemoryError(data.error ?? 'Failed to delete memory');
        return;
      }
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setMemoryError('Failed to delete memory. Please try again.');
    } finally {
      setDeletingMemoryId(null);
    }
  }, []);

  const handleClearAllMemory = useCallback(async () => {
    setMemoryError(null);
    setClearingMemory(true);
    try {
      const res = await fetch('/api/agent/memory', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setMemoryError(data.error ?? 'Failed to clear memory');
        return;
      }
      setMemories([]);
    } catch {
      setMemoryError('Failed to clear memory. Please try again.');
    } finally {
      setClearingMemory(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaved(false);

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Failed to save settings');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [name, email]);

  const handleTestEmail = useCallback(async () => {
    setTestEmailResult(null);
    setTestEmailError(null);
    setTestingEmail(true);

    try {
      const res = await fetch('/api/settings/test-email', { method: 'POST' });
      const data = await res.json() as { success?: boolean; sentTo?: string; error?: string };

      if (!res.ok || !data.success) {
        setTestEmailError(data.error ?? 'Failed to send test email');
        return;
      }

      setTestEmailResult(`Test email sent to ${data.sentTo ?? 'your Gmail address'}`);
    } catch {
      setTestEmailError('Failed to send test email. Check your network connection.');
    } finally {
      setTestingEmail(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-sm text-stone-500 dark:text-stone-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Settings" />

      {/* Emergency Contact */}
      <Card>
        <p className="text-sm font-bold text-stone-900 dark:text-stone-50 mb-3">
          Emergency Contact
        </p>
        <div className="space-y-3">
          <Input
            label="Name"
            placeholder="e.g. Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="e.g. jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              Save Contact
            </Button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Saved
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Email Configuration */}
      <Card>
        <p className="text-sm font-bold text-stone-900 dark:text-stone-50 mb-3">
          Email Configuration
        </p>
        <div className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Float plan emails are sent via Gmail SMTP. Configure your credentials in the{' '}
            <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">.env</code>{' '}
            file using{' '}
            <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">GMAIL_USER</code>{' '}
            and{' '}
            <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">GMAIL_APP_PASSWORD</code>.
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-500">
            Configured in .env file
          </p>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestEmail}
              loading={testingEmail}
            >
              Send Test Email
            </Button>
            {testEmailResult && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">{testEmailResult}</p>
            )}
            {testEmailError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{testEmailError}</p>
            )}
          </div>
        </div>
      </Card>

      {/* My Camping Profile */}
      <TripIntelligenceCard />

      {/* Agent Memory */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
            Agent Memory
          </p>
          {memories.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearAllMemory}
              loading={clearingMemory}
            >
              Clear All
            </Button>
          )}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          Facts and preferences the assistant has learned from your conversations.
        </p>
        {memoryError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{memoryError}</p>
        )}
        {memoriesLoading ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading memories...</p>
        ) : memories.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No memories yet. Chat with the assistant to build up your profile.
          </p>
        ) : (
          <ul className="space-y-2">
            {memories.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-2 rounded-md bg-stone-50 dark:bg-stone-800 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-0.5">
                    {m.key}
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-100 break-words">
                    {m.value}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMemory(m.id)}
                  disabled={deletingMemoryId === m.id}
                  className="flex-shrink-0 text-xs text-stone-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                  aria-label={`Delete memory: ${m.key}`}
                >
                  {deletingMemoryId === m.id ? '...' : '✕'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

    </div>
  );
}
