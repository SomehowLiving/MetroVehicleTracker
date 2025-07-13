
-- Add Aadhaar number to vehicles table
ALTER TABLE vehicles ADD COLUMN driver_aadhaar_number VARCHAR(12) UNIQUE;
ALTER TABLE vehicles ADD COLUMN number_of_loaders INTEGER DEFAULT 0;

-- Add Aadhaar number to vehicle_loaders table
ALTER TABLE vehicle_loaders ADD COLUMN aadhaar_number VARCHAR(12) NOT NULL UNIQUE;

-- Add Aadhaar number to vendor_supervisors table
ALTER TABLE vendor_supervisors ADD COLUMN aadhaar_number VARCHAR(12) NOT NULL UNIQUE;

-- Add fraud detection fields to checkins table
ALTER TABLE checkins ADD COLUMN is_fraudulent BOOLEAN DEFAULT FALSE;
ALTER TABLE checkins ADD COLUMN fraud_flags JSONB;
ALTER TABLE checkins ADD COLUMN fraud_notes TEXT;

-- Create fraud_logs table
CREATE TABLE fraud_logs (
  id SERIAL PRIMARY KEY,
  checkin_id INTEGER NOT NULL REFERENCES checkins(id),
  fraud_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_fraud_logs_checkin_id ON fraud_logs(checkin_id);
CREATE INDEX idx_fraud_logs_unresolved ON fraud_logs(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_checkins_fraudulent ON checkins(is_fraudulent) WHERE is_fraudulent = TRUE;
CREATE INDEX idx_vehicle_loaders_aadhaar ON vehicle_loaders(aadhaar_number);
CREATE INDEX idx_vendor_supervisors_aadhaar ON vendor_supervisors(aadhaar_number);
CREATE INDEX idx_vehicles_driver_aadhaar ON vehicles(driver_aadhaar_number);
