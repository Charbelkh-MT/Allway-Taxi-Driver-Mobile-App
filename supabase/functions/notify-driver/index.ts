import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const trip    = payload.record;

    // Only fire for new pending unassigned trips
    if (trip.status !== 'pending' || trip.driver_id) {
      return new Response('Skip', { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all online available drivers that have a push token
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, push_token')
      .eq('online', true)
      .eq('status', 'available')
      .not('push_token', 'is', null);

    if (error) throw error;
    if (!drivers?.length) {
      console.log('[notify-driver] No online drivers to notify');
      return new Response('No drivers', { status: 200 });
    }

    // Build one message per driver
    const pickup  = trip.pickup_address  ?? 'Unknown pickup';
    const dropoff = trip.dropoff_address ?? 'Unknown dropoff';
    const fare    = trip.fare_usd        != null ? `$${Number(trip.fare_usd).toFixed(0)}` : '';

    const messages = drivers.map(driver => ({
      to:                driver.push_token,
      title:             '🚕 New Trip Request',
      body:              `${pickup} → ${dropoff}${fare ? `  ·  ${fare}` : ''}`,
      data:              { tripId: trip.id },
      sound:             'default',
      priority:          'high',
      channelId:         'trip-alerts-v2',
      ttl:               84,     // expire after 84s (matches trip countdown)
    }));

    // Send to Expo Push API (handles up to 100 messages per request)
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log(`[notify-driver] Notified ${messages.length} driver(s):`, JSON.stringify(result));

    return new Response(JSON.stringify({ notified: messages.length }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[notify-driver] Error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
