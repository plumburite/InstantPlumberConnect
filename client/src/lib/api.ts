export async function sendAuthCode(payload: {
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}) {
  const res = await fetch("/api/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to send code" }));
    throw new Error(err.message || "Failed to send code");
  }
  return res.json();
}

export async function verifyAuthCode(payload: {
  email?: string;
  phoneNumber?: string;
  code: string;
}) {
  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to verify code" }));
    throw new Error(err.message || "Failed to verify code");
  }
  return res.json();
}