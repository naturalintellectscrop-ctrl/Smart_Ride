/**
 * Android notification channels.
 *
 * On Android 8+ the SOUND, vibration and heads-up behaviour of a notification
 * are properties of its CHANNEL, not of the notification payload. A payload
 * that says `sound: true` is ignored if its channel was created without one —
 * which is what happened here: no channel was ever created, so every alert
 * landed on the implicit default channel at default importance and produced a
 * short system "ding" at best.
 *
 * That matters most for a ride offer. A driver is looking at the road, not the
 * screen, and an offer expires in seconds. It needs to ring like a call, not
 * tick like an email.
 *
 * Channels are created once at launch. Android will not let an app change a
 * channel's importance or sound after creation — the user owns those settings
 * from that point on — so the ids below are versioned. Bumping the suffix
 * creates a new channel when the alert behaviour genuinely has to change,
 * rather than silently failing to apply.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Ride/delivery offers. Rings loudly and insistently; time-critical. */
export const CHANNEL_RIDE_OFFERS = 'ride-offers-v1';

/** Trip and order progress. Audible but ordinary. */
export const CHANNEL_TRIP_UPDATES = 'trip-updates-v1';

/** Everything else — promos, receipts, system notices. */
export const CHANNEL_GENERAL = 'general-v1';

/**
 * The offer alert pattern: two long buzzes with a short gap, repeated. Long
 * enough to feel through a jacket pocket while riding, and distinct from the
 * single pulse of an ordinary notification so a driver can tell what it is
 * without looking.
 */
export const OFFER_VIBRATION_PATTERN = [0, 400, 200, 400];

let configured = false;

/**
 * Create the notification channels. Safe to call more than once; Android
 * treats a repeat create of an existing id as a no-op for the fields it
 * refuses to change.
 */
export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || configured) return;
  configured = true;

  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_RIDE_OFFERS, {
      name: 'Ride & delivery offers',
      description: 'Rings when a new job is offered to you. Time-critical.',
      // MAX is what earns a heads-up banner and a full-attention sound while
      // the driver is in another app.
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: OFFER_VIBRATION_PATTERN,
      enableVibrate: true,
      // Offers are worth showing on a locked screen — that is usually where
      // the phone is when one arrives.
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_TRIP_UPDATES, {
      name: 'Trip & order updates',
      description: 'Your driver is arriving, your order is on the way.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250],
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_GENERAL, {
      name: 'General',
      description: 'Receipts, promotions and account notices.',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  } catch (err) {
    // A channel failure must never stop the app launching — the driver would
    // rather have a silent offer than no app.
    console.warn('[notifications] channel setup failed:', err);
  }
}
