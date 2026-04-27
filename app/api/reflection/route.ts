import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMongoDb } from '@/lib/mongodb';

const bodySchema = z.object({
  email: z.string().max(320).optional(),
  phone: z.string().max(32).optional(),
  message: z.string().min(1).max(2000),
});

const REFLECTION_COLLECTION = 'reflection_submissions';

function normalizeEmail(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

function normalizePhone(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return undefined;
  if (raw.startsWith('+')) return raw.replace(/\s/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

async function sendEmailResend(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, error: 'Email is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL).' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Saviour — Sky Fortress reflection',
      text,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message || `Resend error (${res.status})` };
  }
  return { ok: true };
}

async function sendSmsTwilio(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return {
      ok: false,
      error: 'SMS is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).',
    };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string; error_message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message || data.error_message || `Twilio error (${res.status})` };
  }
  return { ok: true };
}

async function persistReflection(doc: {
  source: string;
  email?: string;
  phone?: string;
  message: string;
  emailSent: boolean;
  smsSent: boolean;
  sendErrors: string[];
  createdAt: Date;
}): Promise<{ saved: boolean; error?: string }> {
  try {
    const db = await getMongoDb();
    if (!db) {
      return { saved: false };
    }
    await db.collection(REFLECTION_COLLECTION).insertOne(doc);
    return { saved: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'MongoDB insert failed';
    return { saved: false, error: message };
  }
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const phone = normalizePhone(parsed.data.phone);
  const message = parsed.data.message.trim();

  if (!email && !phone) {
    return NextResponse.json(
      { ok: false, error: 'Provide a valid email and/or a phone number (at least 10 digits).' },
      { status: 400 }
    );
  }

  if (email) {
    const check = z.string().email().safeParse(email);
    if (!check.success) {
      return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
    }
  }

  const results: { channel: 'email' | 'sms'; ok: boolean; error?: string }[] = [];

  if (email) {
    results.push({ channel: 'email', ...(await sendEmailResend(email, message)) });
  }
  if (phone) {
    results.push({ channel: 'sms', ...(await sendSmsTwilio(phone, message)) });
  }

  const anyMsgOk = results.some((r) => r.ok);
  const sendErrors = results.filter((r) => !r.ok).map((r) => `${r.channel}: ${r.error || 'failed'}`);

  const persist = await persistReflection({
    source: 'sky-fortress-reflection',
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    message,
    emailSent: results.some((r) => r.channel === 'email' && r.ok),
    smsSent: results.some((r) => r.channel === 'sms' && r.ok),
    sendErrors,
    createdAt: new Date(),
  });

  if (!anyMsgOk && !persist.saved) {
    const mongoHint = process.env.MONGODB_URI
      ? persist.error || 'MongoDB write failed.'
      : 'Set MONGODB_URI (Atlas) and/or email & SMS env vars in .env.local.';
    return NextResponse.json(
      {
        ok: false,
        error: 'Could not send or save your reflection.',
        results,
        errors: [...sendErrors, ...(persist.error ? [`database: ${persist.error}`] : [mongoHint])],
      },
      { status: 502 }
    );
  }

  const warnings: string[] = [...sendErrors];
  if (process.env.MONGODB_URI && !persist.saved && persist.error) {
    warnings.push(`database: ${persist.error}`);
  }

  return NextResponse.json({
    ok: true,
    emailSent: results.some((r) => r.channel === 'email' && r.ok),
    smsSent: results.some((r) => r.channel === 'sms' && r.ok),
    savedToDatabase: persist.saved,
    partial: warnings.length > 0,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}
