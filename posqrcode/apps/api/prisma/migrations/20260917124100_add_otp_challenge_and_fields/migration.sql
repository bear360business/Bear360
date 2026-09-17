-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OtpPurpose" AS ENUM ('signup', 'forgot');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "OtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "verifiedTokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OtpChallenge_email_purpose_idx" ON "OtpChallenge"("email", "purpose");

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '+91 98765 43210';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT 'Chennai';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "cuisine" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "ownerName" TEXT NOT NULL DEFAULT 'Owner';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "mapsLink" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "planId" "PlanId" NOT NULL DEFAULT 'basic';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "industryId" TEXT NOT NULL DEFAULT 'restaurants';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "status" "RestaurantStatus" NOT NULL DEFAULT 'trial';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "gstRatePct" DECIMAL(5,2) NOT NULL DEFAULT 5;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "gstin" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "opensAt" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "closesAt" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "logoImage" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "emoji" TEXT NOT NULL DEFAULT '🍽️';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "razorpayCustomerId" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "razorpayPlanId" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
