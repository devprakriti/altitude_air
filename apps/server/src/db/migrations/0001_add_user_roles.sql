-- Add role constraints and set default values for user roles
-- Set default role for existing users
UPDATE "user" SET role = 'user' WHERE role IS NULL;

-- Add NOT NULL constraint and default value
ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE "user" ALTER COLUMN role SET NOT NULL;

-- Add check constraint to ensure only valid roles
ALTER TABLE "user" ADD CONSTRAINT user_role_check CHECK (role IN ('admin', 'user'));
