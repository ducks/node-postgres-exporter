CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  hole_count INT
);

INSERT INTO courses (name, location, hole_count) VALUES
('Pier Park', 'Portland, OR', 18),
('Milo McIver', 'Estacada, OR', 27),
('Blue Lake', 'Fairview, OR', 18),
('Memorial Park', 'Medford, OR', 20),
('Maple Hill', 'Leicester, MA', 18),
('Rocklin', 'Rocklin, CA', 18),
('Jones Supreme', 'Emporia, KS', 18);
