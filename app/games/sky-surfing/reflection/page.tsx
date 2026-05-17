'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

const REFLECTION_PROMPT =
  'While being a Saviour in the digital environment is different than in real life expericences, the effects of how you feel may be similar. If you will, take a few seconds to send yourself or someone else a message, and share how your help or their help, impacted you.';

type ApiSuccess = {
  ok: true;
  emailSent?: boolean;
  smsSent?: boolean;
  savedToDatabase?: boolean;
  partial?: boolean;
  warnings?: string[];
};

type ApiError = {
  ok: false;
  error?: string;
  errors?: string[];
};

export default function SkySurfingReflectionPage() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setStatus('idle');

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setStatus('error');
      setFeedback('Please write a short message before continuing.');
      return;
    }
    if (!trimmedPhone && !trimmedEmail) {
      setStatus('error');
      setFeedback('Enter a phone number or an email address (or both) where you would like to send this note.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          message: trimmedMessage,
          source: 'sky-surfing-reflection',
        }),
      });

      const data = (await res.json()) as ApiSuccess | ApiError;

      if (!res.ok || !data.ok) {
        const err = data as ApiError;
        const parts = [err.error, ...(err.errors || [])].filter(Boolean);
        setStatus('error');
        setFeedback(parts.join('\n') || 'Something went wrong. Try again later.');
        return;
      }

      const ok = data as ApiSuccess;
      const lines: string[] = [];
      if (ok.emailSent || ok.smsSent) {
        const channels: string[] = [];
        if (ok.emailSent) channels.push('email');
        if (ok.smsSent) channels.push('SMS');
        lines.push(`Message delivered via ${channels.join(' and ')}.`);
      }
      if (ok.savedToDatabase) {
        lines.push(
          lines.length > 0 ? 'A copy was saved in the database.' : 'Your reflection was saved securely in the database.'
        );
      }
      let msg = lines.join(' ');
      if (ok.partial && ok.warnings?.length) {
        msg += `\n\nNote: ${ok.warnings.join(' ')}`;
      }
      setStatus('success');
      setFeedback(msg.trim() || 'Done.');
    } catch {
      setStatus('error');
      setFeedback('Network error. Check your connection and try again.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-sky-950 to-cyan-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Air Surfing</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Reflection</h1>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 shadow-2xl">
          <p className="text-xl md:text-2xl leading-relaxed text-cyan-50 font-medium mb-8">{REFLECTION_PROMPT}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="surfing-reflection-phone" className="block text-sm font-semibold text-cyan-200">
                  Phone number <span className="text-white/50 font-normal">(optional if you use email)</span>
                </label>
                <input
                  id="surfing-reflection-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={status === 'submitting'}
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="surfing-reflection-email" className="block text-sm font-semibold text-cyan-200">
                  Email address <span className="text-white/50 font-normal">(optional if you use phone)</span>
                </label>
                <input
                  id="surfing-reflection-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'submitting'}
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="surfing-reflection-message" className="block text-sm font-semibold text-cyan-200">
                Your message
              </label>
              <textarea
                id="surfing-reflection-message"
                rows={6}
                maxLength={2000}
                placeholder="Write a short note to yourself…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === 'submitting'}
                className="w-full resize-y rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
              />
              <p className="text-xs text-white/50">{message.length} / 2000 characters</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                {status === 'submitting' ? 'Sending…' : 'Send reflection'}
              </button>
            </div>
          </form>

          {feedback && (
            <div
              className={`mt-6 rounded-lg border p-4 text-sm whitespace-pre-wrap ${
                status === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-100'
                  : 'border-red-500/40 bg-red-950/40 text-red-100'
              }`}
            >
              {feedback}
            </div>
          )}
        </Card>

        <div className="flex w-full max-w-md mx-auto flex-col items-center gap-4">
          <Link
            href="/games/sky-surfing/ending"
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-center font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 transition"
          >
            Ending Credits
          </Link>
          <Link
            href="/landing"
            className="text-sm font-medium text-cyan-200/90 underline-offset-4 hover:text-cyan-100 hover:underline"
          >
            Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}
