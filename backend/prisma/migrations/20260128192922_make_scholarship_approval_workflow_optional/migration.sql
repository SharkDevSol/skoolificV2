-- DropForeignKey
ALTER TABLE "school_comms"."Scholarship" DROP CONSTRAINT "Scholarship_approvalWorkflowId_fkey";

-- AlterTable
ALTER TABLE "school_comms"."Scholarship" ALTER COLUMN "approvalWorkflowId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "school_comms"."Scholarship" ADD CONSTRAINT "Scholarship_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "school_comms"."ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
