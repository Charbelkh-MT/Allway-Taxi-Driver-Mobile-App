// ─────────────────────────────────────────────────────────────────────────────
// Allway Driver — Supabase Configuration
//
// 1. Go to https://supabase.com → your project → Settings → API
// 2. Copy "Project URL" → SUPABASE_URL
// 3. Copy "anon public" key → SUPABASE_ANON_KEY
//
// Required Supabase tables (run these in the SQL editor):
//
//   CREATE TABLE drivers (
//     id          UUID PRIMARY KEY REFERENCES auth.users(id),
//     name        TEXT NOT NULL,
//     phone       TEXT,
//     vehicle     TEXT,
//     plate       TEXT,
//     rating      FLOAT DEFAULT 5.0,
//     total_trips INT   DEFAULT 0,
//     accept_rate INT   DEFAULT 100,
//     push_token  TEXT
//   );
//   ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can read own" ON drivers FOR SELECT USING (auth.uid() = id);
//   CREATE POLICY "driver can update own" ON drivers FOR UPDATE USING (auth.uid() = id);
//   -- Enable Realtime for driver profile updates (rating, totalTrips, etc.):
//   ALTER TABLE drivers REPLICA IDENTITY FULL;
//   -- Add 'drivers' table to supabase_realtime publication in Dashboard → Database → Replication.
//
//   CREATE TABLE driver_locations (
//     driver_id  UUID PRIMARY KEY REFERENCES drivers(id),
//     lat        FLOAT8,
//     lng        FLOAT8,
//     heading    FLOAT4 DEFAULT 0,
//     speed      FLOAT4 DEFAULT 0,
//     is_online  BOOLEAN DEFAULT false,
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );
//   ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can upsert own" ON driver_locations FOR ALL USING (auth.uid() = driver_id);
//   -- CRM service-role can read all for Mapbox map (no RLS needed for service role)
//
//   CREATE TABLE driver_shifts (
//     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     driver_id   UUID REFERENCES drivers(id),
//     started_at  TIMESTAMPTZ DEFAULT now(),
//     ended_at    TIMESTAMPTZ,
//     duration_s  INT
//   );
//   ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can access own shifts" ON driver_shifts FOR ALL USING (auth.uid() = driver_id);
//
// Driver account creation (run once per driver in Supabase Auth):
//   Email   →  {phone_e164}@allwaytaxi.driver   (e.g. +96171234567@allwaytaxi.driver)
//   Password → driver's PIN
//   Then insert a row in `drivers` with the same UUID from auth.users.
//
// `trips` table schema (run in Supabase SQL editor):
//
//   CREATE TABLE trips (
//     id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     driver_id        UUID REFERENCES drivers(id),
//     customer_id      UUID,
//     customer_name    TEXT,
//     customer_phone   TEXT,
//     pickup_address   TEXT,
//     dropoff_address  TEXT,
//     fare_usd         NUMERIC(10,2),
//     distance_km      NUMERIC(6,1),
//     status           TEXT DEFAULT 'dispatching',  -- 'dispatching' | 'accepted' | 'completed' | 'cancelled'
//     requested_at     TIMESTAMPTZ DEFAULT now()
//   );
//   ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can read own trips"   ON trips FOR SELECT USING (auth.uid() = driver_id);
//   CREATE POLICY "driver can update own trips" ON trips FOR UPDATE USING (auth.uid() = driver_id);
//
//   -- Enable Realtime so the driver app receives new dispatches instantly:
//   ALTER TABLE trips REPLICA IDENTITY FULL;
//   -- Then in Supabase Dashboard → Database → Replication → supabase_realtime publication, add the `trips` table.
//
// To dispatch a trip to a driver (from CRM / dashboard):
//   INSERT INTO trips (driver_id, customer_name, customer_phone, pickup_address, dropoff_address, fare_usd, distance_km, status)
//   VALUES ('<driver-uuid>', 'John Doe', '+961 70 000 000', 'Hamra, Beirut', 'ABC Mall, Dbayeh', 22.00, 14.0, 'dispatching');
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = 'https://hfybipzfzmxucuiaxbeu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWJpcHpmem14dWN1aWF4YmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTE1OTMsImV4cCI6MjA5MTU4NzU5M30.EBOrBEk-_d02799FL3JjcNkRCi-sED0T_ZnTrksdicY';

// Table names
export const TABLE_TRIPS     = 'trips';
export const TABLE_DRIVERS   = 'drivers';
export const TABLE_LOCATIONS = 'driver_locations';
export const TABLE_SHIFTS    = 'driver_shifts';

// Column map for the `trips` table
export const TRIP_COLS = {
  id:            'id',
  driverId:      'driver_id',
  customerId:    'customer_id',
  customerName:  'customer_name',
  customerPhone: 'customer_phone',
  pickupAddress: 'pickup_address',
  pickupLat:     'pickup_lat',
  pickupLng:     'pickup_lng',
  dropoffAddress:'dropoff_address',
  dropoffLat:    'dropoff_lat',
  dropoffLng:    'dropoff_lng',
  fare:          'fare_usd',
  distanceKm:    'distance_km',
  status:        'status',
  paymentMethod: 'payment_method',
  allowDebt:     'allow_debt',
  cancelReason:  'cancel_reason',
  createdAt:     'requested_at',
  // Trip status values: 'pending' | 'accepted' | 'picked_up' | 'completed' | 'no_show' | 'cancelled'
};

// Column map for the `drivers` table
export const DRIVER_COLS = {
  id:          'id',
  name:        'full_name',
  phone:       'phone',
  vehicle:     'car_model',
  plate:       'plate',
  rating:      'rating',
  totalTrips:  'total_trips',
  acceptRate:  'accept_rate',
  pushToken:   'push_token',
  photoUrl:    'photo_url',
  status:      'status',
};
