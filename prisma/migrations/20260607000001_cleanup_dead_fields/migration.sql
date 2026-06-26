-- DropIndex
DROP INDEX IF EXISTS "User_clerkUserId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "clerkUserId";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN IF EXISTS "password";
