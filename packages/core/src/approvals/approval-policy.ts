export type ApprovalDecision = "required" | "not_required" | "denied";

export interface ApprovalRequest {
  action: string;
  requesterSlackUserId: string;
  risk: "read" | "write" | "infrastructure";
}

export function getApprovalDecision(request: ApprovalRequest): ApprovalDecision {
  if (request.risk === "read") {
    return "not_required";
  }

  return "required";
}
