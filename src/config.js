// ─────────────────────────────────────────────────────────────────────────────
// Allway Driver — Supabase Configuration
//
// 1. Go to https://supabase.com → your project → Settings → API
// 2. Copy "Project URL" → SUPABASE_URL
// 3. Copy "anon public" key → SUPABASE_ANON_KEY
//
// ── TABLE: drivers ────────────────────────────────────────────────────────────
//
//   CREATE TABLE drivers (
//     id          UUID PRIMARY KEY REFERENCES auth.users(id),
//     full_name   TEXT NOT NULL,
//     phone       TEXT,
//     car_model   TEXT,
//     plate       TEXT,
//     car_type    TEXT DEFAULT 'comfort',  -- 'comfort' | 'xl'
//     rating      FLOAT DEFAULT 5.0,
//     total_trips INT   DEFAULT 0,
//     accept_rate INT   DEFAULT 100,
//     push_token  TEXT,
//     photo_url   TEXT,
//     status      TEXT DEFAULT 'offline',  -- 'offline' | 'available' | 'on_trip'
//     online      BOOLEAN DEFAULT false,
//     lat         FLOAT8,
//     lng         FLOAT8,
//     heading     FLOAT4 DEFAULT 0,
//     speed       FLOAT4 DEFAULT 0,
//     last_seen   TIMESTAMPTZ
//   );
//   ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can read own"   ON drivers FOR SELECT USING (auth.uid() = id);
//   CREATE POLICY "driver can update own" ON drivers FOR UPDATE USING (auth.uid() = id);
//   -- Enable Realtime for live profile updates (rating, total_trips, etc.):
//   ALTER TABLE drivers REPLICA IDENTITY FULL;
//   -- Add 'drivers' to the supabase_realtime publication in Dashboard → Database → Replication.
//
// ── TABLE: driver_locations ───────────────────────────────────────────────────
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
//   -- CRM reads this table via service-role (no RLS restriction needed for service role).
//
// ── TABLE: driver_shifts ──────────────────────────────────────────────────────
//
//   CREATE TABLE driver_shifts (
//     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     driver_id  UUID REFERENCES drivers(id),
//     started_at TIMESTAMPTZ DEFAULT now(),
//     ended_at   TIMESTAMPTZ,
//     duration_s INT
//   );
//   ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can access own shifts" ON driver_shifts FOR ALL USING (auth.uid() = driver_id);
//
// ── TABLE: trips ──────────────────────────────────────────────────────────────
//
//   CREATE TABLE trips (
//     id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     driver_id           UUID REFERENCES drivers(id),  -- NULL until a driver claims it
//     customer_id         UUID,
//     customer_name       TEXT,
//     customer_phone      TEXT,
//     pickup_address      TEXT,
//     pickup_lat          FLOAT8,
//     pickup_lng          FLOAT8,
//     dropoff_address     TEXT,
//     dropoff_lat         FLOAT8,
//     dropoff_lng         FLOAT8,
//     fare_usd            NUMERIC(10,2),
//     distance_km         NUMERIC(6,1),
//     status              TEXT DEFAULT 'pending',
//       -- 'pending' | 'accepted' | 'picked_up' | 'completed' | 'no_show' | 'cancelled'
//     ride_type           TEXT DEFAULT 'comfort',  -- 'comfort' | 'xl'
//     preferred_driver_id UUID REFERENCES drivers(id),
//     passenger_count     INT  DEFAULT 1,
//     allow_debt          BOOLEAN DEFAULT false,
//     payment_method      TEXT,  -- 'cash' | 'card' | 'wish' | 'wallet' | 'debt' | 'split|...'
//     cancel_reason       TEXT,
//     customer_rating     INT,
//     duration_min        INT,
//     dispatch_timeout_at TIMESTAMPTZ,
//     requested_at        TIMESTAMPTZ DEFAULT now(),
//     accepted_at         TIMESTAMPTZ,
//     pickup_at           TIMESTAMPTZ,
//     completed_at        TIMESTAMPTZ
//   );
//   ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
//
//   -- Drivers can read their own trips AND any unassigned pending trips (dispatch).
//   CREATE POLICY "driver can read trips" ON trips FOR SELECT USING (
//     auth.uid() = driver_id
//     OR (status = 'pending' AND driver_id IS NULL)
//   );
//   -- Drivers can claim an unassigned pending trip OR update their own trips.
//   CREATE POLICY "driver can update trips" ON trips FOR UPDATE USING (
//     auth.uid() = driver_id
//     OR (status = 'pending' AND driver_id IS NULL)
//   );
//
//   -- Enable Realtime so drivers receive new dispatches instantly:
//   ALTER TABLE trips REPLICA IDENTITY FULL;
//   -- Add 'trips' to the supabase_realtime publication in Dashboard → Database → Replication.
//
// ── TABLE: incidents ──────────────────────────────────────────────────────────
//
//   CREATE TABLE incidents (
//     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     driver_id     UUID REFERENCES drivers(id),
//     trip_id       UUID REFERENCES trips(id),
//     title         TEXT,
//     incident_type TEXT,  -- 'accident' | 'complaint' | 'road_hazard' | 'vehicle_damage' | 'other'
//     severity      TEXT,  -- 'low' | 'medium' | 'high' | 'critical'
//     voice_path    TEXT,  -- storage path in the 'incident-recordings' bucket
//     submitted_by  TEXT DEFAULT 'driver',
//     created_at    TIMESTAMPTZ DEFAULT now()
//   );
//   ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "driver can insert own incidents" ON incidents FOR INSERT WITH CHECK (auth.uid() = driver_id);
//   CREATE POLICY "driver can read own incidents"   ON incidents FOR SELECT USING (auth.uid() = driver_id);
//
// ── STORAGE BUCKETS ───────────────────────────────────────────────────────────
//
//   1. 'driver-photos'       — public bucket, stores driver profile photos.
//      Path format: {driver_uuid}/profile.jpg
//      RLS: allow authenticated users to upload/update only their own folder.
//
//   2. 'incident-recordings' — private bucket, stores voice reports.
//      Path format: {driver_uuid}/{timestamp}.m4a
//      RLS: allow authenticated users to upload to their own folder.
//      CRM reads via service-role signed URLs.
//
// ── DRIVER ACCOUNT CREATION ───────────────────────────────────────────────────
//
//   Run once per driver in Supabase Auth + SQL editor:
//   1. Create auth user:
//      Email    → {phone_e164}@allwaytaxi.driver  (e.g. +96171234567@allwaytaxi.driver)
//      Password → driver's 4–6 digit PIN
//   2. Insert driver row (use the UUID from auth.users):
//      INSERT INTO drivers (id, full_name, phone, car_model, plate, car_type)
//      VALUES ('<auth-uuid>', 'Ahmad Khoury', '+96171234567', 'Toyota Corolla', 'B 24681', 'comfort');
//
// ── DISPATCHING A TRIP (from CRM) ─────────────────────────────────────────────
//
//   INSERT INTO trips (customer_name, customer_phone, pickup_address, pickup_lat, pickup_lng,
//                      dropoff_address, dropoff_lat, dropoff_lng, fare_usd, distance_km,
//                      ride_type, status)
//   VALUES ('John Doe', '+961 70 000 000', 'Hamra, Beirut', 33.8938, 35.5018,
//           'ABC Mall, Dbayeh', 33.9209, 35.6017, 22.00, 14.0, 'comfort', 'pending');
//   -- Leave driver_id NULL — the first driver to accept claims it atomically.
// ─────────────────────────────────────────────────────────────────────────────

export const DISPATCHER_PHONE = '+9611234567'; // replace before go-live

export const SUPABASE_URL = 'https://hfybipzfzmxucuiaxbeu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWJpcHpmem14dWN1aWF4YmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTE1OTMsImV4cCI6MjA5MTU4NzU5M30.EBOrBEk-_d02799FL3JjcNkRCi-sED0T_ZnTrksdicY';

// Table names
export const TABLE_TRIPS     = 'trips';
export const TABLE_DRIVERS   = 'drivers';
export const TABLE_LOCATIONS = 'driver_locations';
export const TABLE_SHIFTS    = 'driver_shifts';
export const TABLE_INCIDENTS = 'incidents';
export const BUCKET_INCIDENTS = 'incident-recordings';

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
  allowDebt:          'allow_debt',
  cancelReason:       'cancel_reason',
  rideType:           'ride_type',
  preferredDriverId:  'preferred_driver_id',
  passengerCount:     'passenger_count',
  dispatchTimeoutAt:  'dispatch_timeout_at',
  acceptedAt:         'accepted_at',
  pickupAt:           'pickup_at',
  durationMin:        'duration_min',
  distanceKm:         'distance_km',
  customerRating:     'customer_rating',
  dropoffLat:         'dropoff_lat',
  dropoffLng:         'dropoff_lng',
  createdAt:          'requested_at',
  // Trip status values: 'pending' | 'accepted' | 'picked_up' | 'completed' | 'no_show' | 'cancelled'
  // ride_type values: 'comfort' | 'xl'
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
  carType:     'car_type',
  online:      'online',
};
