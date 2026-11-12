import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Building2,
  RefreshCw,
  Plus,
  X,
  Eye,
  EyeOff,
  Pencil,
  UserMinus,
  UserPlus,
  ArrowRightLeft,
  KeyRound,
} from "lucide-react";

import {
  getAdminUsers,
  getAdminBranches,
  createAdminUser,
  updateAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
  transferAdminUser,
  resetAdminUserPassword,
  type AdminUser,
  type AdminBranch,
  type CreateAdminUserInput,
  type UpdateAdminUserInput,
} from "../admin.service";

const roles = [
  { label: "All Roles", value: "ALL" },
  { label: "System Administrator", value: "ADMIN" },
  { label: "Headquarters Manager", value: "HEADQUARTERS_MANAGER" },
  { label: "Branch Manager", value: "BRANCH_MANAGER" },
  { label: "Server", value: "SERVER" },
  { label: "Cook", value: "COOK" },
];

const statuses = [
  { label: "All Statuses", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

const branchRoles: AdminUser["role"][] = ["BRANCH_MANAGER", "SERVER", "COOK"];
const roleLabels: Record<AdminUser["role"], string> = {
  ADMIN: "System Administrator",
  HEADQUARTERS_MANAGER: "Headquarters Manager",
  BRANCH_MANAGER: "Branch Manager",
  SERVER: "Server",
  COOK: "Cook",
};

function getApiError(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as {
      response?: { data?: { message?: unknown; error?: unknown } };
    }).response;
    const message = response?.data?.message ?? response?.data?.error;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : fallback;
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="rounded-lg bg-gray-100 p-2 text-gray-700"><Icon size={20} /></div>
      </div>
      <p className="mt-4 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

type ModalMode = "create" | "edit" | "deactivate" | "reactivate" | "transfer" | "reset" | null;

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "" as CreateAdminUserInput["role"] | "",
  branchId: "",
};

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [transferForm, setTransferForm] = useState({ newBranchId: "", reason: "" });
  const [resetPassword, setResetPassword] = useState("");

  const formRequiresBranch = form.role !== "" && branchRoles.includes(form.role);

  async function loadUsers(showRefresh = false) {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setPageError("");
    try {
      const result = await getAdminUsers();
      setUsers(result);
    } catch (error) {
      console.error("Unable to load users:", error);
      setPageError(getApiError(error, "Unable to load user information. Please try again."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function loadActiveBranches() {
    try {
      const result = await getAdminBranches();
      setBranches(result.filter((branch) => branch.isActive));
    } catch (error) {
      console.error("Unable to load branches:", error);
      setModalError(getApiError(error, "Unable to load active branches. Please try again."));
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  // Automatically dismiss successful-action notices after four seconds.
  useEffect(() => {
    if (!successNotice) return;
    const timeoutId = window.setTimeout(() => setSuccessNotice(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [successNotice]);

  function closeModal() {
    if (isSaving) return;
    setModalMode(null);
    setSelectedUser(null);
    setModalError("");
    setShowPassword(false);
    setForm(emptyForm);
    setTransferForm({ newBranchId: "", reason: "" });
    setResetPassword("");
  }

  async function openCreateModal() {
    setSelectedUser(null);
    setForm(emptyForm);
    setModalError("");
    setShowPassword(false);
    setModalMode("create");
    await loadActiveBranches();
  }

  async function openEditModal(user: AdminUser) {
    setSelectedUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      role: user.role,
      branchId: user.branchId ?? "",
    });
    setModalError("");
    setModalMode("edit");
    await loadActiveBranches();
  }

  async function openActionModal(mode: Exclude<ModalMode, "create" | "edit" | null>, user: AdminUser) {
    setSelectedUser(user);
    setModalError("");
    setModalMode(mode);
    if (mode === "transfer") {
      setTransferForm({ newBranchId: "", reason: "" });
      await loadActiveBranches();
    }
    if (mode === "reset") setResetPassword("");
  }

  async function handleCreateOrUpdate() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();

    if (!firstName || !lastName || !email || !form.role) {
      setModalError("Please complete all required fields.");
      return;
    }
    if (firstName.length < 2 || lastName.length < 2) {
      setModalError("First and last names must contain at least 2 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setModalError("Please enter a valid email address.");
      return;
    }
    if (modalMode === "create" && form.password.length < 8) {
      setModalError("The initial password must contain at least 8 characters.");
      return;
    }
    if (formRequiresBranch && !form.branchId) {
      setModalError("Please select an active branch for this role.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    try {
      if (modalMode === "create") {
        const payload: CreateAdminUserInput = {
          firstName,
          lastName,
          email,
          password: form.password,
          role: form.role as CreateAdminUserInput["role"],
          ...(formRequiresBranch ? { branchId: form.branchId } : {}),
        };
        await createAdminUser(payload);
        setSuccessNotice("User account created successfully.");
      } else if (modalMode === "edit" && selectedUser) {
        const payload: UpdateAdminUserInput = {
          firstName,
          lastName,
          email,
          role: form.role as AdminUser["role"],
          branchId: formRequiresBranch ? form.branchId : null,
        };
        await updateAdminUser(selectedUser.id, payload);
        setSuccessNotice("User account updated successfully.");
      }
      setModalMode(null);
      setSelectedUser(null);
      await loadUsers(true);
    } catch (error) {
      console.error("Unable to save user:", error);
      setModalError(getApiError(error, "Unable to save the account. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateOrReactivate() {
    if (!selectedUser || (modalMode !== "deactivate" && modalMode !== "reactivate")) return;
    setIsSaving(true);
    setModalError("");
    try {
      if (modalMode === "deactivate") {
        await deactivateAdminUser(selectedUser.id);
        setSuccessNotice("User account deactivated successfully.");
      } else {
        await reactivateAdminUser(selectedUser.id);
        setSuccessNotice("User account reactivated successfully.");
      }
      setModalMode(null);
      setSelectedUser(null);
      await loadUsers(true);
    } catch (error) {
      console.error("Unable to change user status:", error);
      setModalError(getApiError(error, "Unable to update the account status. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTransfer() {
    if (!selectedUser) return;
    if (!transferForm.newBranchId) {
      setModalError("Please select a destination branch.");
      return;
    }
    if (transferForm.reason.trim().length > 500) {
      setModalError("The transfer reason cannot exceed 500 characters.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await transferAdminUser(selectedUser.id, {
        newBranchId: transferForm.newBranchId,
        ...(transferForm.reason.trim() ? { reason: transferForm.reason.trim() } : {}),
      });
      const destinationBranch = branches.find((branch) => branch.id === transferForm.newBranchId);
      setSuccessNotice(`Employee successfully transferred to ${destinationBranch?.name ?? "the selected branch"}.`);
      setModalMode(null);
      setSelectedUser(null);
      await loadUsers(true);
    } catch (error) {
      console.error("Unable to transfer employee:", error);
      setModalError(getApiError(error, "Unable to transfer this employee. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    if (resetPassword.length < 8 || resetPassword.length > 100) {
      setModalError("The new password must contain between 8 and 100 characters.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await resetAdminUserPassword(selectedUser.id, resetPassword);
      setSuccessNotice("User password reset successfully.");
      setModalMode(null);
      setSelectedUser(null);
      setResetPassword("");
    } catch (error) {
      console.error("Unable to reset password:", error);
      setModalError(getApiError(error, "Unable to reset the password. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;
  const branchAssignedUsers = users.filter((user) => user.branchId !== null).length;

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const matchesSearch = !search || fullName.includes(search) || user.email.toLowerCase().includes(search);
      const matchesRole = selectedRole === "ALL" || user.role === selectedRole;
      const matchesStatus = selectedStatus === "ALL" ||
        (selectedStatus === "ACTIVE" && user.isActive) ||
        (selectedStatus === "INACTIVE" && !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  if (isLoading) {
    return <div className="flex min-h-64 items-center justify-center"><p className="text-sm text-gray-500">Loading user information...</p></div>;
  }

  if (pageError && users.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <p className="text-sm text-red-700">{pageError}</p>
        <button onClick={() => void loadUsers()} className="mt-4 flex items-center gap-2 rounded-lg bg-[#1F2937] px-4 py-2 text-sm text-white hover:bg-[#374151]">
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage system accounts, roles, passwords, and branch assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => void openCreateModal()} className="flex items-center gap-2 rounded-lg bg-[#1F2937] px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            <Plus size={16} /> Create User
          </button>
          <button onClick={() => void loadUsers(true)} disabled={isRefreshing} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {successNotice && (
        <div role="status" aria-live="polite" className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{successNotice}</span>
          <button type="button" onClick={() => setSuccessNotice("")} className="ml-4 rounded p-1 text-green-700 hover:bg-green-100" aria-label="Dismiss success message"><X size={16} /></button>
        </div>
      )}
      {pageError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Users" value={users.length} description="All registered accounts" icon={Users} />
        <SummaryCard title="Active Users" value={activeUsers} description="Currently active accounts" icon={UserCheck} />
        <SummaryCard title="Inactive Users" value={inactiveUsers} description="Deactivated accounts" icon={UserX} />
        <SummaryCard title="Branch-Assigned Users" value={branchAssignedUsers} description="Accounts assigned to branches" icon={Building2} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-gray-900">User Directory</h2>
          <p className="mt-1 text-sm text-gray-500">Search, filter, and manage registered system accounts.</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name or email..." className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937]" />
          </div>
          <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1F2937]">
            {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1F2937]">
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead><tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="px-3 py-3">User</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Branch</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date Created</th><th className="px-3 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-4"><p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p><p className="mt-1 text-xs text-gray-500">{user.email}</p></td>
                  <td className="px-3 py-4 text-gray-600">{roleLabels[user.role]}</td>
                  <td className="px-3 py-4 text-gray-600">{user.branch ? `${user.branch.branchCode} · ${user.branch.name}` : "Headquarters"}</td>
                  <td className="px-3 py-4"><span className={`rounded-full px-3 py-1 text-xs font-medium ${user.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="px-3 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-4"><div className="flex flex-wrap items-center gap-2">
                    <button title="Edit user" onClick={() => void openEditModal(user)} className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"><Pencil size={15} /></button>
                    {user.isActive ? (
                      <>
                        {branchRoles.includes(user.role) && <button title="Transfer branch" onClick={() => void openActionModal("transfer", user)} className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"><ArrowRightLeft size={15} /></button>}
                        <button title="Reset password" onClick={() => void openActionModal("reset", user)} className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"><KeyRound size={15} /></button>
                        <button title="Deactivate user" onClick={() => void openActionModal("deactivate", user)} className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"><UserMinus size={15} /></button>
                      </>
                    ) : (
                      <>
                        <button title="Reset password" onClick={() => void openActionModal("reset", user)} className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-100"><KeyRound size={15} /></button>
                        <button title="Reactivate user" onClick={() => void openActionModal("reactivate", user)} className="rounded-md border border-green-200 p-2 text-green-700 hover:bg-green-50"><UserPlus size={15} /></button>
                      </>
                    )}
                  </div></td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-500">No users match your search or filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">Showing {filteredUsers.length} of {users.length} users</div>
      </section>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="user-modal-title" className="my-8 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 id="user-modal-title" className="text-lg font-semibold text-gray-900">
                  {modalMode === "create" ? "Create User" : modalMode === "edit" ? "Edit User" : modalMode === "deactivate" ? "Deactivate User" : modalMode === "reactivate" ? "Reactivate User" : modalMode === "transfer" ? "Transfer Employee" : "Reset Password"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} · ${selectedUser.email}` : "Create a new Steakz RMIS system account."}</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isSaving} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50" aria-label="Close modal"><X size={20} /></button>
            </div>

            {(modalMode === "create" || modalMode === "edit") && (
              <div className="space-y-5 px-6 py-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label htmlFor="user-first-name" className="mb-1.5 block text-sm font-medium text-gray-700">First Name</label><input id="user-first-name" value={form.firstName} onChange={(event) => setForm((old) => ({ ...old, firstName: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F2937]" /></div>
                  <div><label htmlFor="user-last-name" className="mb-1.5 block text-sm font-medium text-gray-700">Last Name</label><input id="user-last-name" value={form.lastName} onChange={(event) => setForm((old) => ({ ...old, lastName: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F2937]" /></div>
                </div>
                <div><label htmlFor="user-email" className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label><input id="user-email" type="email" value={form.email} onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F2937]" /></div>
                {modalMode === "create" && <div><label htmlFor="user-password" className="mb-1.5 block text-sm font-medium text-gray-700">Initial Password</label><div className="relative"><input id="user-password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm((old) => ({ ...old, password: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-11 text-sm outline-none focus:border-[#1F2937]" /><button type="button" onClick={() => setShowPassword((old) => !old)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="mt-1 text-xs text-gray-500">Must contain at least 8 characters.</p></div>}
                <div><label htmlFor="user-role" className="mb-1.5 block text-sm font-medium text-gray-700">System Role</label><select id="user-role" value={form.role} onChange={(event) => setForm((old) => ({ ...old, role: event.target.value as CreateAdminUserInput["role"] | "", branchId: "" }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F2937]"><option value="">Select a role</option>{roles.filter((role) => role.value !== "ALL").map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
                {formRequiresBranch && <div><label htmlFor="user-branch" className="mb-1.5 block text-sm font-medium text-gray-700">Assigned Branch</label><select id="user-branch" value={form.branchId} disabled={modalMode === "edit" && Boolean(selectedUser?.branchId)} onChange={(event) => setForm((old) => ({ ...old, branchId: event.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F2937] disabled:bg-gray-100 disabled:text-gray-500">{!form.branchId && <option value="">Select an active branch</option>}{selectedUser?.branchId && selectedUser.branch && !branches.some((branch) => branch.id === selectedUser.branchId) && <option value={selectedUser.branchId}>{selectedUser.branch.branchCode} · {selectedUser.branch.name} (inactive)</option>}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchCode} · {branch.name}</option>)}</select>{modalMode === "edit" && selectedUser?.branchId ? <p className="mt-1 text-xs text-gray-500">Existing branch assignments are changed through Transfer Employee so the transfer history is retained.</p> : branches.length === 0 && <p className="mt-1 text-xs text-red-600">No active branches are available for assignment.</p>}</div>}
                {modalMode === "edit" && selectedUser?.branchId && form.role && branchRoles.includes(form.role) && form.branchId !== selectedUser.branchId && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Changing an existing branch assignment is not allowed here. Use Transfer Employee so the branch history is recorded.</p>}
              </div>
            )}

            {modalMode === "deactivate" && <div className="px-6 py-6"><p className="text-sm text-gray-700">Are you sure you want to deactivate this account? The user will no longer be able to sign in, but historical records will be preserved.</p><p className="mt-3 text-sm text-gray-500">The backend will prevent deactivating your own account or the last active System Administrator.</p></div>}
            {modalMode === "reactivate" && <div className="px-6 py-6"><p className="text-sm text-gray-700">Reactivate this account? The user will regain access if the account meets the backend's eligibility rules.</p><p className="mt-3 text-sm text-gray-500">An employee assigned to an inactive branch cannot be reactivated until the branch is active.</p></div>}
            {modalMode === "transfer" && <div className="space-y-5 px-6 py-6"><div><label htmlFor="transfer-branch" className="mb-1.5 block text-sm font-medium text-gray-700">Destination Branch</label><select id="transfer-branch" value={transferForm.newBranchId} onChange={(event) => setTransferForm((old) => ({ ...old, newBranchId: event.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1F2937]"><option value="">Select an active branch</option>{branches.filter((branch) => branch.id !== selectedUser?.branchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.branchCode} · {branch.name}</option>)}</select></div><div><label htmlFor="transfer-reason" className="mb-1.5 block text-sm font-medium text-gray-700">Reason (optional)</label><textarea id="transfer-reason" rows={3} maxLength={500} value={transferForm.reason} onChange={(event) => setTransferForm((old) => ({ ...old, reason: event.target.value }))} placeholder="Add a reason for the transfer" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F2937]" /><p className="mt-1 text-right text-xs text-gray-500">{transferForm.reason.length}/500</p></div><p className="text-xs text-gray-500">The backend records the previous branch, destination branch, administrator, date, and optional reason.</p></div>}
            {modalMode === "reset" && <div className="space-y-3 px-6 py-6"><label htmlFor="reset-password" className="block text-sm font-medium text-gray-700">New Password</label><div className="relative"><input id="reset-password" type={showPassword ? "text" : "password"} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-11 text-sm outline-none focus:border-[#1F2937]" /><button type="button" onClick={() => setShowPassword((old) => !old)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><p className="text-xs text-gray-500">Password must contain between 8 and 100 characters.</p></div>}

            {modalError && <div className="mx-6 mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{modalError}</div>}
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button type="button" onClick={closeModal} disabled={isSaving} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              {modalMode === "create" || modalMode === "edit" ? <button type="button" onClick={() => void handleCreateOrUpdate()} disabled={isSaving} className="rounded-lg bg-[#1F2937] px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">{isSaving ? "Saving..." : modalMode === "create" ? "Create Account" : "Save Changes"}</button> : null}
              {modalMode === "deactivate" || modalMode === "reactivate" ? <button type="button" onClick={() => void handleDeactivateOrReactivate()} disabled={isSaving} className="rounded-lg bg-[#1F2937] px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">{isSaving ? "Processing..." : modalMode === "deactivate" ? "Confirm Deactivation" : "Confirm Reactivation"}</button> : null}
              {modalMode === "transfer" && <button type="button" onClick={() => void handleTransfer()} disabled={isSaving} className="rounded-lg bg-[#1F2937] px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">{isSaving ? "Transferring..." : "Confirm Transfer"}</button>}
              {modalMode === "reset" && <button type="button" onClick={() => void handleResetPassword()} disabled={isSaving} className="rounded-lg bg-[#1F2937] px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">{isSaving ? "Resetting..." : "Reset Password"}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
