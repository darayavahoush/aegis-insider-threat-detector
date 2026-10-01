/**
 * AEGIS - API Client for FastAPI Backend
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE}/profiles`);
  return res.json();
}

export async function fetchProfileDetails(profileId) {
  const res = await fetch(`${API_BASE}/profiles/${profileId}`);
  if (!res.ok) throw new Error('Profile not found');
  return res.json();
}

export async function evaluateTelemetry(payload) {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Evaluation request failed');
  return res.json();
}

export async function enrollProfile(profileData) {
  const res = await fetch(`${API_BASE}/profiles/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await fetch(`${API_BASE}/logs`);
  return res.json();
}

export async function clearAuditLogs() {
  const res = await fetch(`${API_BASE}/logs`, { method: 'DELETE' });
  return res.json();
}

export async function quarantineSession(profileId) {
  const res = await fetch(`${API_BASE}/quarantine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId })
  });
  return res.json();
}

export async function triggerStepUp(profileId) {
  const res = await fetch(`${API_BASE}/step-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId })
  });
  return res.json();
}
