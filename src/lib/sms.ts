/**
 * SMS Utility for Semaphore API via Backend
 */

export async function sendSMS(to: string, message: string) {
  try {
    const response = await fetch('/api/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await response.json();
    console.log('Semaphore API Response:', data);
    return { success: response.ok, data };
  } catch (error) {
    console.error('SMS Send Failed:', error);
    return { success: false, error };
  }
}
