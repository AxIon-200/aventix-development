export type OrganizerStatus = "awaiting-verification" | "pending" | "approved" | "rejected" | "suspended";
export type OrganizerStatusFilter = OrganizerStatus | "all";
export type OrganizerDecision = "APPROVED" | "REJECTED" | "SUSPENDED";
export type OrganizerFilters = { status: OrganizerStatusFilter };

export type Organizer = {
  id: string;
  organizationName: string;
  applicantName: string;
  email: string;
  status: OrganizerStatus;
  version: number;
  submittedAt: string | null;
  eventsCount: number;
};

export type OrganizerDecisionRecord = {
  id: string;
  actorId: string;
  previousStatus: string;
  resultingStatus: string;
  reason: string | null;
  version: number;
  decidedAt: string;
  emailStatus: "PENDING" | "SENDING" | "ACCEPTED" | "FAILED" | "UNCERTAIN" | "SUPERSEDED";
  emailAttempts: number;
};

export type OrganizerDetails = {
  id: string;
  organizationName: string;
  status: OrganizerStatus;
  version: number;
  approvedAt: string | null;
  currentContact: {
    firstName: string; lastName: string; email: string; phoneNumber: string | null;
    emailVerified: boolean; status: string;
  };
  application: {
    firstName: string; lastName: string; email: string; phoneNumber: string | null;
    organizationName: string; organizationDescription: string; submittedAt: string;
  } | null;
  decisions: OrganizerDecisionRecord[];
  recentEvents: { id: string; name: string; status: string; eventDate: string | null; createdAt: string }[];
};

export type OrganizerStats = {
  total: number;
  awaitingVerification: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
};

export type DecisionResult = {
  status: OrganizerDecision;
  version: number;
  decisionId: string;
  emailStatus: OrganizerDecisionRecord["emailStatus"];
};
