export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  if (event.title) payload.title = event.title;
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;

  return JSON.stringify(payload);
}

export function parseQRPayload(rawPayload: string): ParseQRResult {
  try {
    const payload = JSON.parse(rawPayload) as Partial<QRPayload>;

    if (payload.v !== 1 || typeof payload.event !== 'string' || !payload.event) {
      return { ok: false, message: 'Not an attendance QR code.' };
    }

    return {
      ok: true,
      payload: {
        v: 1,
        event: payload.event,
        title: payload.title,
        start: payload.start,
        end: payload.end,
      },
    };
  } catch {
    return { ok: false, message: 'Invalid QR code.' };
  }
}
