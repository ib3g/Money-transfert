/*
  Warnings:

  - Added the required column `senderName` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TRANSACTION_CREATED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "senderName" TEXT NOT NULL;
