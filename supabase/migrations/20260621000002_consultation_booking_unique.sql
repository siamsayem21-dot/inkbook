-- Belt-and-suspenders: ensure one booking per consultation at the DB level.
-- NULLs are excluded from UNIQUE in PostgreSQL, so unbooked consultations
-- (booking_id IS NULL) are unaffected.
ALTER TABLE consultations
  ADD CONSTRAINT consultations_booking_id_unique UNIQUE (booking_id);
