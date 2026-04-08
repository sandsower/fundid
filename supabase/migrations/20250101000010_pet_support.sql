-- Pet support: pet_details, item_photos, sightings tables + phone contact
-- Part of dyr.fundid.is (pet recovery hub)

-- =============================================================================
-- 1. Extend items table with phone contact support
-- =============================================================================

ALTER TABLE items ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Extend contact_method to support phone options
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_contact_method_check;
ALTER TABLE items ADD CONSTRAINT items_contact_method_check
  CHECK (contact_method IN ('email', 'anonymous', 'phone', 'phone_and_email'));

-- =============================================================================
-- 2. Pet details (1:1 extension of items where category = 'pet')
-- =============================================================================

CREATE TABLE pet_details (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'horse', 'bird', 'rabbit', 'other')),
  breed TEXT,
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  distinctive_markings TEXT,
  size TEXT CHECK (size IN ('small', 'medium', 'large')),
  sex TEXT CHECK (sex IN ('male', 'female', 'unknown')),
  age_group TEXT CHECK (age_group IN ('baby', 'young', 'adult', 'senior')),
  has_collar BOOLEAN,
  collar_description TEXT,
  microchip_number TEXT,
  pet_name TEXT,
  temperament TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pet_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pet details for active items"
  ON pet_details FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM items WHERE id = pet_details.item_id AND status IN ('active', 'resolved')
  ));

CREATE INDEX idx_pet_details_species ON pet_details(species);
CREATE INDEX idx_pet_details_primary_color ON pet_details(primary_color);

-- =============================================================================
-- 3. Multiple photos per item
-- =============================================================================

CREATE TABLE item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read photos for active items"
  ON item_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM items WHERE id = item_photos.item_id AND status IN ('active', 'resolved')
  ));

CREATE INDEX idx_item_photos_item_id ON item_photos(item_id);

-- =============================================================================
-- 4. Sightings (community reports linked to a lost pet)
-- =============================================================================

CREATE TABLE sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  sighted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  photo_url TEXT,
  reporter_name TEXT NOT NULL,
  reporter_contact TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED
);

ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sightings for active items"
  ON sightings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM items WHERE id = sightings.item_id AND status IN ('active', 'resolved')
  ));

CREATE INDEX idx_sightings_item_id ON sightings(item_id);
CREATE INDEX idx_sightings_sighted_at ON sightings(sighted_at);
CREATE INDEX idx_sightings_geom ON sightings USING GIST(geom);

-- =============================================================================
-- 5. Spatial query: find sightings for a pet
-- =============================================================================

CREATE OR REPLACE FUNCTION nearby_sightings(
  target_item_id UUID,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  item_id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  sighted_at TIMESTAMPTZ,
  note TEXT,
  photo_url TEXT,
  reporter_name TEXT,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $$
  SELECT
    s.id, s.item_id, s.latitude, s.longitude, s.location_name,
    s.sighted_at, s.note, s.photo_url, s.reporter_name, s.created_at,
    ST_Distance(s.geom::geography, i.geom::geography) AS distance_meters
  FROM sightings s
  JOIN items i ON i.id = target_item_id
  WHERE s.item_id = target_item_id
    AND ST_DWithin(s.geom::geography, i.geom::geography, radius_km * 1000)
  ORDER BY s.sighted_at ASC;
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- 6. Matching query: find potential matches between lost and found pets
-- =============================================================================

CREATE OR REPLACE FUNCTION matching_pets(
  target_item_id UUID,
  radius_km DOUBLE PRECISION DEFAULT 15
)
RETURNS TABLE (
  item_id UUID,
  match_score INTEGER,
  species TEXT,
  breed TEXT,
  primary_color TEXT,
  pet_name TEXT,
  distance_meters DOUBLE PRECISION,
  item_type TEXT,
  title TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
  WITH target AS (
    SELECT i.id, i.type, i.geom, i.created_at AS target_created,
           pd.species, pd.breed, pd.primary_color, pd.secondary_color, pd.size, pd.sex
    FROM items i
    JOIN pet_details pd ON pd.item_id = i.id
    WHERE i.id = target_item_id
  )
  SELECT
    i.id AS item_id,
    (
      CASE WHEN pd.species = t.species THEN 30 ELSE 0 END +
      CASE WHEN pd.breed IS NOT NULL AND pd.breed = t.breed THEN 25 ELSE 0 END +
      CASE WHEN pd.primary_color = t.primary_color THEN 15 ELSE 0 END +
      CASE WHEN pd.secondary_color IS NOT NULL AND pd.secondary_color = t.secondary_color THEN 5 ELSE 0 END +
      CASE WHEN pd.size IS NOT NULL AND pd.size = t.size THEN 10 ELSE 0 END +
      CASE WHEN pd.sex IS NOT NULL AND pd.sex = t.sex THEN 5 ELSE 0 END +
      CASE
        WHEN ST_Distance(i.geom::geography, t.geom::geography) < 1000 THEN 10
        WHEN ST_Distance(i.geom::geography, t.geom::geography) < 5000 THEN 5
        ELSE 0
      END
    )::INTEGER AS match_score,
    pd.species, pd.breed, pd.primary_color, pd.pet_name,
    ST_Distance(i.geom::geography, t.geom::geography) AS distance_meters,
    i.type AS item_type, i.title, i.image_url, i.created_at
  FROM items i
  JOIN pet_details pd ON pd.item_id = i.id
  CROSS JOIN target t
  WHERE i.id != target_item_id
    AND i.status = 'active'
    AND i.category = 'pet'
    AND i.type != t.type
    AND pd.species = t.species
    AND ST_DWithin(i.geom::geography, t.geom::geography, radius_km * 1000)
    AND i.created_at > t.target_created - INTERVAL '30 days'
  ORDER BY match_score DESC, distance_meters ASC
  LIMIT 20;
$$ LANGUAGE sql STABLE;
