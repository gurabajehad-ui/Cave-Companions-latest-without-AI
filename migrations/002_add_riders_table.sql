CREATE TABLE IF NOT EXISTS riders (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'OFFLINE',
  current_latitude NUMERIC,
  current_longitude NUMERIC,
  last_location_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Extend orders to support Local Delivery
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id TEXT REFERENCES riders(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS local_delivery_route JSONB;
