-- Rename phone column to username and extend length
-- Changes phone VARCHAR(20) to username VARCHAR(100)

ALTER TABLE users 
  CHANGE COLUMN phone username VARCHAR(100) NOT NULL;

-- Note: The unique constraint and index are automatically preserved by CHANGE COLUMN

