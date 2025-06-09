CREATE TABLE courses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  holes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO courses (id, name, location, holes)
VALUES
  ('b1f479cc-6c21-4ec5-9a53-72f2c30ff170', 'Maple Hill', 'Leicester, MA', 18),
  ('8e49d86b-bf74-4b38-88de-1996cc167058', 'Milo McIver', 'Estacada, OR', 27),
  ('69a7272b-3f61-47f2-8f4d-94f9a781708d', 'Pier Park', 'Portland, OR', 18),
  ('f017775d-22f3-4d3e-a65f-29106dcbb171', 'Memorial Park', 'Medford, OR', 20),
  ('ab870ced-038f-4411-bf89-97bd69e31929', 'Blue Lake', 'Fairview, OR', 18);
