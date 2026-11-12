// Branch Manager identities used by the existing refund-review API.
// The manager's password is entered at approval time and is never stored here.
export interface BranchManagerContact {
  name: string;
  email: string;
}

const branchManagers: Record<string, BranchManagerContact> = {
  london: {
    name: "Branch Manager - London",
    email: "bmanager.london@steakz.com",
  },
  leeds: {
    name: "Branch Manager - Leeds",
    email: "bmanager.leeds@steakz.com",
  },
  manchester: {
    name: "Branch Manager - Manchester",
    email: "bmanager.manchester@steakz.com",
  },
  liverpool: {
    name: "Branch Manager - Liverpool",
    email: "bmanager.liverpool@steakz.com",
  },
  birmingham: {
    name: "Branch Manager - Birmingham",
    email: "bmanager.birmingham@steakz.com",
  },
};

export function getBranchManagerForBranch(
  branchName?: string | null,
): BranchManagerContact | null {
  if (!branchName) return null;

  // Normalize branch names so matching is case-insensitive.
  return branchManagers[branchName.trim().toLowerCase()] ?? null;
}
