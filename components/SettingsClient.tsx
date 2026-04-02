'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import PageHeader from '@/components/ui/PageHeader';

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

    </div>
  );
}
