-- Function to enforce monotonically increasing version on updates
-- Based on gaze-executor pattern
CREATE OR REPLACE FUNCTION enforce_version_increment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS NULL OR OLD.version IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.version <= OLD.version THEN
    RAISE EXCEPTION 'version must be incremented (old %, new %)', OLD.version, NEW.version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to events table
CREATE TRIGGER version_increment_trigger
  BEFORE UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.version IS NOT NULL AND NEW.version IS NOT NULL)
  EXECUTE FUNCTION enforce_version_increment();

-- Apply trigger to snapshots table
CREATE TRIGGER version_increment_trigger
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  WHEN (OLD.version IS NOT NULL AND NEW.version IS NOT NULL)
  EXECUTE FUNCTION enforce_version_increment();

-- Apply trigger to orders table (read model)
CREATE TRIGGER version_increment_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.version IS NOT NULL AND NEW.version IS NOT NULL)
  EXECUTE FUNCTION enforce_version_increment();

-- Apply trigger to order_history table
CREATE TRIGGER version_increment_trigger
  BEFORE UPDATE ON order_history
  FOR EACH ROW
  WHEN (OLD.version IS NOT NULL AND NEW.version IS NOT NULL)
  EXECUTE FUNCTION enforce_version_increment();
