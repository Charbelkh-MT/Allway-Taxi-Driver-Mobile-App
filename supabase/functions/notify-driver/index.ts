import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DISPATCH_RADIUS_KM = 15;
const EXPO_PUSH_URL      = 'https://exp.host/--/api/v2/push/send';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const payload    = await req.json();
    const trip       = payload.record;

    // Only fire for new pending unassigned trips
    if (trip.status !== 'pending' || trip.driver_id) {
      return new Response('Skip', { status: 200 });
    }

    const supabase    = createClient(supabaseUrl, supabaseServiceKey);
    const rideType    = trip.ride_type             ?? 'comfort';
    const pickupLat   = trip.pickup_lat            ?? null;
    const pickupLng   = trip.pickup_lng            ?? null;
    const preferredId = trip.preferred_driver_id   ?? null;

    // Build query — online, available, correct car type, push token present
    let query = supabase
      .from('drivers')
      .select('id, push_token, lat, lng')
      .eq('online', true)
      .eq('status', 'available')
      .eq('car_type', rideType)
      .not('push_token', 'is', null);

    // Preferred driver — notify only them
    if (preferredId) query = query.eq('id', preferredId);

    const { data: drivers, error } = await query;
    if (error) throw error;
    if (!drivers?.length) {
      console.log('[notify-driver] No matching drivers');
      return new Response('No drivers', { status: 200 });
    }

    const pickup  = trip.pickup_address ?? 'Unknown pickup';
    const dropoff = trip.dropoff_address ?? 'Unknown dropoff';
    const fare    = trip.fare_usd != null ? `  ·  $${Number(trip.fare_usd).toFixed(0)}` : '';

    const messages = drivers
      .filter(driver => {
        // No driver position yet — include them
        if (!driver.lat || !driver.lng) return true;
        // No trip pickup coords — include all
        if (!pickupLat || !pickupLng) return true;
        return haversineKm(driver.lat, driver.lng, pickupLat, pickupLng) <= DISPATCH_RADIUS_KM;
      })
      .filter(d => d.push_token?.startsWith('ExponentPushToken'))
      .map(driver => ({
        to:        driver.push_token,
        title:     preferredId ? '⭐ Requested Trip' : '🚕 New Trip Request',
        body:      `${pickup} → ${dropoff}${fare}`,
        data:      { tripId: trip.id },
        sound:     'default',
        priority:  'high',
        channelId: 'trip-alerts-v2',
        ttl:       84,
      }));

    if (!messages.length) {
      console.log('[notify-driver] All drivers out of range');
      return new Response('All out of range', { status: 200 });
    }

    // Chunk into batches of 100 (Expo push API limit)
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    const results = await Promise.all(
      chunks.map(chunk =>
        fetch(EXPO_PUSH_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body:    JSON.stringify(chunk),
        }).then(r => r.json())
      )
    );

    console.log(`[notify-driver] Notified ${messages.length} driver(s):`, JSON.stringify(results));
    return new Response(JSON.stringify({ notified: messages.length }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[notify-driver] Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
