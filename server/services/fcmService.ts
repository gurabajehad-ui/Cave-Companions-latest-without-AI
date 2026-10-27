import webpush from 'web-push';

// Configure VAPID keys
// In a real app, these should be in environment variables
const vapidPublicKey = 'BDZJ8SbU0aAGWQJD3x19rXlCYokBjGH2hGYUn_XnjGiE9X5DRtp_kTGjSPgb6snMqWeLVxMyyXiaRXylglLD9vQ';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY'; // Need to set this

webpush.setVapidDetails(
  'mailto:jameulislam338@gmail.com',
  vapidPublicKey,
  vapidPrivateKey
);

export async function sendPushNotification(subscription: any, title: string, body: string) {
  const payload = JSON.stringify({ title, body });
  try {
    await webpush.sendNotification(subscription, payload);
    console.log('Successfully sent push notification');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
