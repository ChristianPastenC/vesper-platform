import { getApiUrl } from '../config';

const getChallenge = async (): Promise<string | null> => {
  const API_URL = getApiUrl();
  const getRes = await fetch(`${API_URL}/api/handshake`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!getRes.ok) return null;

  const data = await getRes.json();
  return data.encoded_challenge || data || null;
};

const verifyChallenge = async (challenge: unknown): Promise<boolean> => {
  const API_URL = getApiUrl();
  const rawChallenge = typeof challenge === 'string' ? challenge : JSON.stringify(challenge);

  const postRes = await fetch(`${API_URL}/api/handshake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Challenge-Token': rawChallenge,
    },
  });

  if (!postRes.ok) return false;

  const postData = await postRes.json();
  const responseValue = postData.status || postData.message || postData.result || postData;
  return responseValue === 'channel_verified';
};

export const validateHandshake = async (): Promise<boolean> => {
  try {
    const challenge = await getChallenge();
    if (!challenge) return false;

    return await verifyChallenge(challenge);
  } catch (error) {
    console.error('[HandshakeValidator] Handshake failed:', error);
    return false;
  }
};
