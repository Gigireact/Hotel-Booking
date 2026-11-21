// idcheck-client.js -> calls the ID check service. Needs Node 18 or newer. No extra packages.
// Set two environment variables: IDCHECK_URL and IDCHECK_API_KEY (see .env.example).

async function verifyId({ photoBuffer, idType, guestName }) {
  // photoBuffer: the raw JPG/PNG bytes (a Buffer).  idType: "NIN", "DRIVERS_LICENSE" or "PASSPORT".
  // guestName: first name + surname from the booking, for example "Amina Okafor".
  const base = (process.env.IDCHECK_URL || "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/verify-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.IDCHECK_API_KEY || "",
    },
    body: JSON.stringify({
      image_base64: photoBuffer.toString("base64"),
      id_type: idType,
      guest_name: guestName,
    }),
    signal: AbortSignal.timeout(15000), // give up after 15 seconds
  });
  if (!res.ok) {
    const err = new Error(`ID check service answered HTTP ${res.status}`);
    err.status = res.status; // 413 too big, 415 wrong type, 422 bad input, 401 bad key
    throw err;
  }
  return res.json(); // { result, failure_reason, message, processing_time_ms }
}

// Wakes the service if it is asleep (free hosting sleeps after 15 minutes without traffic, and waking
// takes up to a minute). Call this when a guest OPENS the pre-arrival check-in page, not when they upload.
// It never throws, and you do not need to wait for it.
function warmUp() {
  const base = (process.env.IDCHECK_URL || "").replace(/\/$/, "");
  return fetch(`${base}/health`, { signal: AbortSignal.timeout(90000) }).catch(
    () => {},
  );
}

module.exports = { verifyId, warmUp };
