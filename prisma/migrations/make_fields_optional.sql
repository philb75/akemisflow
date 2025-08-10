-- Make fields optional in contractors table
ALTER TABLE contractors 
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

-- Remove unique constraint from email if it exists
ALTER TABLE contractors 
  DROP CONSTRAINT IF EXISTS contractors_email_key;

-- Make fields optional in airwallex_contractors table  
ALTER TABLE airwallex_contractors
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;