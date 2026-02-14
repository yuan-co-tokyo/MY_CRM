import { useEffect, useMemo, useState } from "react";
import "./style.css";

type Permission = {
  id: string;
  code: string;
  description?: string | null;
};

type Role = {
  id: string;
  name: string;
  permissionCodes: string[];
  createdAt: string;
  updatedAt: string;
};

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  owner?: { id: string; name: string; email: string } | null;
  assignees: { id: string; name: string; email: string }[];
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  status?: "ACTIVE" | "SUSPENDED";
  userType?: "ADMIN" | "STANDARD" | "PRIVILEGED";
  roleIds?: string[];
};

type Interaction = {
  id: string;
  customer: { id: string; name: string };
  user: { id: string; name: string; email: string };
  type: "CALL" | "EMAIL" | "MEETING" | "NOTE";
  note: string;
  occurredAt: string;
  createdAt: string;
};

type ViewKey = "permissions" | "customers" | "users";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  status: "LEAD" as const,
  ownerUserId: "",
  assigneeUserIds: [] as string[]
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("crm_token") || "");
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("crm_tenant") || "");
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("crm_email") || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [view, setView] = useState<ViewKey>("permissions");

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [permissionQuery, setPermissionQuery] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({ ...emptyCustomer });
  const [customerFormMode, setCustomerFormMode] = useState<"create" | "edit">("create");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interactionNote, setInteractionNote] = useState("");
  const [interactionType, setInteractionType] = useState<Interaction["type"]>("NOTE");
  const [interactionDate, setInteractionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editInteractionType, setEditInteractionType] = useState<Interaction["type"]>("NOTE");
  const [editInteractionDate, setEditInteractionDate] = useState("");
  const [editInteractionNote, setEditInteractionNote] = useState("");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    status: "ACTIVE" as const,
    userType: "STANDARD" as const,
    roleIds: [] as string[]
  });

  useEffect(() => {
    localStorage.setItem("crm_token", token);
  }, [token]);

  useEffect(() => {
    localStorage.setItem("crm_tenant", tenantId);
  }, [tenantId]);

  useEffect(() => {
    localStorage.setItem("crm_email", loginEmail);
  }, [loginEmail]);

  const [canSeePermissionsTab, setCanSeePermissionsTab] = useState(false);
  const [canSeeUsersTab, setCanSeeUsersTab] = useState(false);

  useEffect(() => {
    if (!token) {
      setCanSeePermissionsTab(false);
      setCanSeeUsersTab(false);
      return;
    }
    void loadCustomers();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCustomerId) {
      setInteractions([]);
      return;
    }
    void loadInteractions(selectedCustomerId);
  }, [token, selectedCustomerId]);

  useEffect(() => {
    if (!token) return;
    if (view === "permissions") {
      void loadPermissions();
    }
    if (view === "users") {
      void loadUsers();
    }
  }, [token, view]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) || null;
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;

  const filteredPermissions = useMemo(() => {
    const query = permissionQuery.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((permission) =>
      [permission.code, permission.description ?? ""].some((text) =>
        text.toLowerCase().includes(query)
      )
    );
  }, [permissionQuery, permissions]);

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery =
        !query ||
        [customer.name, customer.email ?? "", customer.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        customerStatusFilter === "ALL" || customer.status === customerStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [customerQuery, customerStatusFilter, customers]);

  async function loadPermissions() {
    setError("");
    setStatus("Loading roles and permissions...");
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        apiFetch<Role[]>("/roles", token),
        apiFetch<Permission[]>("/permissions", token)
      ]);
      setRoles(rolesRes);
      setPermissions(permissionsRes);
      if (!selectedRoleId && rolesRes.length > 0) {
        setSelectedRoleId(rolesRes[0].id);
      }
      setStatus("Ready");
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      setStatus("");
    }
  }

  async function loadCustomers() {
    try {
      const res = await apiFetch<Customer[]>("/customers", token);
      setCustomers(res);
      if (!selectedCustomerId && res.length > 0) {
        setSelectedCustomerId(res[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    }
  }

  async function loadUsers() {
    try {
      const res = await apiFetch<User[]>("/users", token);
      setUsers(res);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    }
  }

  async function canAccessPermission(code: string) {
    try {
      const res = await apiFetch<Permission[]>("/permissions", token);
      return res.some((permission) => permission.code === code);
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const permissionsAccess = await canAccessPermission("role.read");
      const usersAccess = await canAccessPermission("user.read");
      setCanSeePermissionsTab(permissionsAccess);
      setCanSeeUsersTab(usersAccess);
    })();
  }, [token]);

  function openCreateUser() {
    setUserForm({
      name: "",
      email: "",
      password: "",
      status: "ACTIVE",
      userType: "STANDARD",
      roleIds: []
    });
    setUserFormMode("create");
    setEditingUserId(null);
    setUserFormOpen(true);
  }

  function openEditUser(user: User) {
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      status: user.status ?? "ACTIVE",
      userType: user.userType ?? "STANDARD",
      roleIds: user.roleIds ?? []
    });
    setUserFormMode("edit");
    setEditingUserId(user.id);
    setUserFormOpen(true);
  }

  async function createUser() {
    if (!userForm.name || !userForm.email || !userForm.password) {
      setError("Name / Email / Password are required");
      return;
    }
    setError("");
    try {
      const created = await apiFetch<User>("/users", token, {
        method: "POST",
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          status: userForm.status,
          userType: userForm.userType,
          roleIds: userForm.roleIds
        })
      });
      setUsers((prev) => [created, ...prev]);
      setUserFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    }
  }

  async function updateUser() {
    if (!editingUserId) return;
    if (!userForm.name || !userForm.email) {
      setError("Name / Email are required");
      return;
    }
    setError("");
    try {
      const updated = await apiFetch<User>(`/users/${editingUserId}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password || undefined,
          status: userForm.status,
          userType: userForm.userType,
          roleIds: userForm.roleIds
        })
      });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setUserFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    }
  }

  async function loadInteractions(customerId: string) {
    setInteractionLoading(true);
    try {
      const res = await apiFetch<Interaction[]>(`/interactions?customerId=${customerId}`, token);
      setInteractions(res);
    } catch (err: any) {
      setError(err.message || "Failed to load interactions");
    } finally {
      setInteractionLoading(false);
    }
  }

  async function addInteraction() {
    if (!selectedCustomerId) return;
    if (!interactionNote.trim()) {
      setError("Interaction note is required");
      return;
    }

    setError("");
    try {
      const created = await apiFetch<Interaction>("/interactions", token, {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type: interactionType,
          note: interactionNote.trim(),
          occurredAt: new Date(interactionDate).toISOString()
        })
      });
      setInteractions((prev) => [created, ...prev]);
      setInteractionNote("");
    } catch (err: any) {
      setError(err.message || "Failed to create interaction");
    }
  }

  function startEditInteraction(interaction: Interaction) {
    setEditingInteractionId(interaction.id);
    setEditInteractionType(interaction.type);
    setEditInteractionDate(interaction.occurredAt.slice(0, 16));
    setEditInteractionNote(interaction.note);
  }

  function cancelEditInteraction() {
    setEditingInteractionId(null);
    setEditInteractionNote("");
    setEditInteractionDate("");
  }

  async function saveEditInteraction() {
    if (!editingInteractionId) return;
    if (!editInteractionNote.trim()) {
      setError("Interaction note is required");
      return;
    }

    setError("");
    try {
      const updated = await apiFetch<Interaction>(
        `/interactions/${editingInteractionId}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            type: editInteractionType,
            note: editInteractionNote.trim(),
            occurredAt: new Date(editInteractionDate).toISOString()
          })
        }
      );
      setInteractions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingInteractionId(null);
    } catch (err: any) {
      setError(err.message || "Failed to update interaction");
    }
  }

  async function deleteInteraction(interactionId: string) {
    setError("");
    try {
      await apiFetch(`/interactions/${interactionId}`, token, { method: "DELETE" });
      setInteractions((prev) => prev.filter((item) => item.id !== interactionId));
    } catch (err: any) {
      setError(err.message || "Failed to delete interaction");
    }
  }

  async function login() {
    if (!tenantId || !loginEmail || !loginPassword) {
      setError("Tenant ID / Email / Password are required");
      return;
    }

    setError("");
    setLoggingIn(true);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/login", "", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          email: loginEmail,
          password: loginPassword
        })
      });
      setToken(res.accessToken);
      setLoginPassword("");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    setToken("");
    setRoles([]);
    setPermissions([]);
    setCustomers([]);
    setUsers([]);
  }

  async function updateRolePermissions(roleId: string, nextPermissions: string[]) {
    setError("");
    setStatus("Saving changes...");
    try {
      const updated = await apiFetch<Role>(`/roles/${roleId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ permissionCodes: nextPermissions })
      });

      setRoles((prev) => prev.map((role) => (role.id === roleId ? updated : role)));
      setStatus("Saved");
    } catch (err: any) {
      setError(err.message || "Failed to update role");
      setStatus("");
    }
  }

  async function createRole() {
    if (!newRoleName.trim()) {
      setError("Role name is required");
      return;
    }

    setError("");
    setCreatingRole(true);
    try {
      const created = await apiFetch<Role>("/roles", token, {
        method: "POST",
        body: JSON.stringify({
          name: newRoleName.trim(),
          permissionCodes: newRolePermissions
        })
      });

      setRoles((prev) => [created, ...prev]);
      setSelectedRoleId(created.id);
      setNewRoleName("");
      setNewRolePermissions([]);
      setStatus("Role created");
    } catch (err: any) {
      setError(err.message || "Failed to create role");
      setStatus("");
    } finally {
      setCreatingRole(false);
    }
  }

  function openCreateCustomer() {
    setCustomerForm({ ...emptyCustomer });
    setCustomerFormMode("create");
    setCustomerFormOpen(true);
  }

  function openEditCustomer(customer: Customer) {
    setCustomerForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      status: customer.status,
      ownerUserId: customer.owner?.id ?? "",
      assigneeUserIds: customer.assignees.map((assignee) => assignee.id)
    });
    setCustomerFormMode("edit");
    setCustomerFormOpen(true);
  }

  async function saveCustomer() {
    setError("");
    const payload = {
      name: customerForm.name,
      email: customerForm.email || null,
      phone: customerForm.phone || null,
      status: customerForm.status,
      ownerUserId: customerForm.ownerUserId || null,
      assigneeUserIds: customerForm.assigneeUserIds
    };

    try {
      if (customerFormMode === "create") {
        const created = await apiFetch<Customer>("/customers", token, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomerId(created.id);
      } else if (selectedCustomer) {
        const updated = await apiFetch<Customer>(`/customers/${selectedCustomer.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setCustomers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      setCustomerFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save customer");
    }
  }

  async function removeCustomer(id: string) {
    setError("");
    try {
      await apiFetch(`/customers/${id}`, token, { method: "DELETE" });
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
      setSelectedCustomerId((prev) => (prev === id ? null : prev));
    } catch (err: any) {
      setError(err.message || "Failed to delete customer");
    }
  }

  return (
    <div className="app">
      <div className="backdrop" />
      <header className="hero">
        <div>
          <p className="eyebrow">MY CRM • Access Studio</p>
          <h1>権限と顧客を、ひとつの操作空間で。</h1>
          <p className="lead">
            権限はロールに集約、顧客は担当とステータスで即時に切り替え。
            学習用途でも運用を意識した管理体験を追求します。
          </p>
        </div>
        <div className="token-card">
          <div>
            <span className="label">Tenant ID</span>
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="Tenant ID"
            />
          </div>
          <div>
            <span className="label">Email</span>
            <input
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <span className="label">Password</span>
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="********"
            />
          </div>
          <div className="token-actions">
            <button className="primary" onClick={login} disabled={loggingIn}>
              {loggingIn ? "Signing in..." : "Sign in"}
            </button>
            <button className="ghost" onClick={logout} disabled={!token}>
              Sign out
            </button>
          </div>
          <div className="token-divider">or</div>
          <div>
            <span className="label">Access Token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste JWT access token"
            />
          </div>
          <button className="ghost" onClick={() => void loadCustomers()} disabled={!token}>
            Reload
          </button>
          <p className="hint">API: {API_BASE}</p>
        </div>
      </header>

      <nav className="tabs">
        {canSeePermissionsTab && (
          <button
            className={`tab ${view === "permissions" ? "active" : ""}`}
            onClick={() => setView("permissions")}
          >
            Permissions
          </button>
        )}
        <button
          className={`tab ${view === "customers" ? "active" : ""}`}
          onClick={() => setView("customers")}
        >
          Customers
        </button>
        {canSeeUsersTab && (
          <button
            className={`tab ${view === "users" ? "active" : ""}`}
            onClick={() => setView("users")}
          >
            Users
          </button>
        )}
      </nav>

      {error && <div className="global-error">{error}</div>}

      {view === "permissions" ? (
        <main className="layout">
          <section className="panel role-list">
            <div className="panel-header">
              <h2>Roles</h2>
              <span className="chip">{roles.length}</span>
            </div>
            <div className="role-scroll">
              {roles.map((role) => (
                <button
                  key={role.id}
                  className={`role-item ${selectedRoleId === role.id ? "active" : ""}`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div>
                    <p className="role-name">{role.name}</p>
                    <p className="role-meta">{role.permissionCodes.length} permissions</p>
                  </div>
                  <span className="chev">›</span>
                </button>
              ))}
            </div>
            <div className="panel-footer">
              <h3>Create new role</h3>
              <input
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="Role name"
              />
              <div className="permission-pills">
                {permissions.slice(0, 6).map((permission) => {
                  const active = newRolePermissions.includes(permission.code);
                  return (
                    <button
                      key={permission.code}
                      className={`pill ${active ? "active" : ""}`}
                      onClick={() =>
                        setNewRolePermissions((prev) =>
                          active
                            ? prev.filter((code) => code !== permission.code)
                            : [...prev, permission.code]
                        )
                      }
                    >
                      {permission.code}
                    </button>
                  );
                })}
              </div>
              <button className="primary" onClick={createRole} disabled={creatingRole || !token}>
                {creatingRole ? "Creating..." : "Create role"}
              </button>
            </div>
          </section>

          <section className="panel permissions">
            <div className="panel-header">
              <h2>Permissions</h2>
              {selectedRole ? (
                <span className="chip">{selectedRole.name}</span>
              ) : (
                <span className="chip">No role selected</span>
              )}
            </div>

            <div className="toolbar">
              <input
                value={permissionQuery}
                onChange={(event) => setPermissionQuery(event.target.value)}
                placeholder="Search permissions"
              />
              {status && <span className="status">{status}</span>}
            </div>

            <div className="permission-grid">
              {filteredPermissions.map((permission) => {
                const checked = selectedRole?.permissionCodes.includes(permission.code) ?? false;
                return (
                  <label key={permission.code} className={`perm-card ${checked ? "checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!selectedRole}
                      onChange={() => {
                        if (!selectedRole) return;
                        const next = checked
                          ? selectedRole.permissionCodes.filter((code) => code !== permission.code)
                          : [...selectedRole.permissionCodes, permission.code];
                        void updateRolePermissions(selectedRole.id, next);
                      }}
                    />
                    <div>
                      <p className="perm-code">{permission.code}</p>
                      <p className="perm-desc">{permission.description || "No description"}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </main>
      ) : view === "customers" ? (
        <main className="layout customers">
          <section className="panel customer-list">
            <div className="panel-header">
              <h2>Customers</h2>
              <span className="chip">{customers.length}</span>
            </div>
            <div className="toolbar">
              <input
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder="Search name, email, phone"
              />
              <select
                value={customerStatusFilter}
                onChange={(event) => setCustomerStatusFilter(event.target.value)}
              >
                <option value="ALL">All</option>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="role-scroll">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  className={`role-item ${selectedCustomerId === customer.id ? "active" : ""}`}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <div>
                    <p className="role-name">{customer.name}</p>
                    <p className="role-meta">
                      {customer.status} • {customer.owner?.name || "Unassigned"}
                    </p>
                  </div>
                  <span className="chev">›</span>
                </button>
              ))}
            </div>
            <button className="primary" onClick={openCreateCustomer}>
              Add customer
            </button>
          </section>

          <section className="panel customer-detail">
            <div className="panel-header">
              <h2>Customer profile</h2>
              {selectedCustomer ? (
                <span className={`chip status-${selectedCustomer.status.toLowerCase()}`}>
                  {selectedCustomer.status}
                </span>
              ) : (
                <span className="chip">Select customer</span>
              )}
            </div>

            {selectedCustomer ? (
              <div className="detail-grid">
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <p className="muted">{selectedCustomer.email || "No email"}</p>
                  <p className="muted">{selectedCustomer.phone || "No phone"}</p>
                </div>
                <div>
                  <p className="label">Owner</p>
                  <p>{selectedCustomer.owner?.name || "Unassigned"}</p>
                  <p className="label">Last updated</p>
                  <p>{new Date(selectedCustomer.updatedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="label">Assignees</p>
                  <p>{selectedCustomer.assignees.map((a) => a.name).join(", ") || "-"}</p>
                </div>
              </div>
            ) : (
              <p className="muted">Select a customer to view details.</p>
            )}

            {selectedCustomer && (
              <>
                <div className="detail-actions">
                  <button className="ghost" onClick={() => openEditCustomer(selectedCustomer)}>
                    Edit
                  </button>
                  <button className="danger" onClick={() => void removeCustomer(selectedCustomer.id)}>
                    Delete
                  </button>
                </div>

                <div className="timeline">
                  <div className="timeline-header">
                    <h3>Interactions</h3>
                    <span className="chip">{interactions.length}</span>
                  </div>
                  <div className="timeline-form">
                    <select
                      value={interactionType}
                      onChange={(event) =>
                        setInteractionType(event.target.value as Interaction["type"])
                      }
                    >
                      <option value="NOTE">Note</option>
                      <option value="CALL">Call</option>
                      <option value="EMAIL">Email</option>
                      <option value="MEETING">Meeting</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={interactionDate}
                      onChange={(event) => setInteractionDate(event.target.value)}
                    />
                    <input
                      value={interactionNote}
                      onChange={(event) => setInteractionNote(event.target.value)}
                      placeholder="Write a quick note"
                    />
                    <button className="primary" onClick={addInteraction}>
                      Add
                    </button>
                  </div>
                  <div className="timeline-list">
                    {interactionLoading && <p className="muted">Loading interactions...</p>}
                    {!interactionLoading && interactions.length === 0 && (
                      <p className="muted">No interactions yet.</p>
                    )}
                    {interactions.map((interaction) => (
                      <div key={interaction.id} className="timeline-item">
                        {editingInteractionId === interaction.id ? (
                          <div className="timeline-edit">
                            <div className="timeline-edit-row">
                              <select
                                value={editInteractionType}
                                onChange={(event) =>
                                  setEditInteractionType(
                                    event.target.value as Interaction["type"]
                                  )
                                }
                              >
                                <option value="NOTE">Note</option>
                                <option value="CALL">Call</option>
                                <option value="EMAIL">Email</option>
                                <option value="MEETING">Meeting</option>
                              </select>
                              <input
                                type="datetime-local"
                                value={editInteractionDate}
                                onChange={(event) => setEditInteractionDate(event.target.value)}
                              />
                            </div>
                            <input
                              value={editInteractionNote}
                              onChange={(event) => setEditInteractionNote(event.target.value)}
                            />
                            <div className="timeline-actions">
                              <button className="ghost" onClick={cancelEditInteraction}>
                                Cancel
                              </button>
                              <button className="primary" onClick={saveEditInteraction}>
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="timeline-type">{interaction.type}</p>
                              <p className="timeline-note">{interaction.note}</p>
                            </div>
                            <div className="timeline-meta">
                              <span>{new Date(interaction.occurredAt).toLocaleString()}</span>
                              <span>{interaction.user?.name || "Unknown"}</span>
                              <div className="timeline-actions">
                                <button
                                  className="ghost"
                                  onClick={() => startEditInteraction(interaction)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="danger"
                                  onClick={() => deleteInteraction(interaction.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      ) : (
        <main className="layout users">
          <section className="panel user-list">
            <div className="panel-header">
              <h2>Users</h2>
              <span className="chip">{users.length}</span>
            </div>
            <div className="role-scroll">
              {users.map((user) => (
                <div key={user.id} className="role-item">
                  <div>
                    <p className="role-name">{user.name}</p>
                    <p className="role-meta">{user.email}</p>
                  </div>
                  <div className="user-pill">
                    <span className="chip">{user.userType || "STANDARD"}</span>
                    <button className="ghost" onClick={() => openEditUser(user)}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="primary" onClick={openCreateUser}>
              Add user
            </button>
          </section>

          <section className="panel user-detail">
            <div className="panel-header">
              <h2>Create new user</h2>
            </div>
            <p className="muted">Add a teammate to assign as owner or assignee on customers.</p>
            <button className="primary" onClick={openCreateUser}>
              Open form
            </button>
          </section>
        </main>
      )}

      {customerFormOpen && (
        <div className="modal">
          <div className="modal-card">
            <h3>{customerFormMode === "create" ? "Create customer" : "Edit customer"}</h3>
            <div className="form-grid">
              <label>
                Name
                <input
                  value={customerForm.name}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={customerForm.phone}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={customerForm.status}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({
                      ...prev,
                      status: event.target.value as Customer["status"]
                    }))
                  }
                >
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label>
                Owner
                <select
                  value={customerForm.ownerUserId}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, ownerUserId: event.target.value }))
                  }
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="label">Assignees</p>
                <div className="assignee-list">
                  {users.map((user) => {
                    const checked = customerForm.assigneeUserIds.includes(user.id);
                    return (
                      <label key={user.id} className={`assignee-chip ${checked ? "active" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCustomerForm((prev) => ({
                              ...prev,
                              assigneeUserIds: checked
                                ? prev.assigneeUserIds.filter((id) => id !== user.id)
                                : [...prev.assigneeUserIds, user.id]
                            }))
                          }
                        />
                        <span>{user.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setCustomerFormOpen(false)}>
                Cancel
              </button>
              <button className="primary" onClick={saveCustomer}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {userFormOpen && (
        <div className="modal">
          <div className="modal-card">
            <h3>{userFormMode === "create" ? "Create user" : "Edit user"}</h3>
            <div className="form-grid">
              <label>
                Name
                <input
                  value={userForm.name}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  value={userForm.email}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) =>
                    setUserForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={userForm.status}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      status: event.target.value as User["status"]
                    }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
              <label>
                User type
                <select
                  value={userForm.userType}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      userType: event.target.value as User["userType"]
                    }))
                  }
                >
                  <option value="STANDARD">Standard</option>
                  <option value="PRIVILEGED">Privileged</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
              <div>
                <p className="label">Roles</p>
                <div className="assignee-list">
                  {roles.map((role) => {
                    const checked = userForm.roleIds.includes(role.id);
                    return (
                      <label key={role.id} className={`assignee-chip ${checked ? "active" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setUserForm((prev) => ({
                              ...prev,
                              roleIds: checked
                                ? prev.roleIds.filter((id) => id !== role.id)
                                : [...prev.roleIds, role.id]
                            }))
                          }
                        />
                        <span>{role.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setUserFormOpen(false)}>
                Cancel
              </button>
              {userFormMode === "create" ? (
                <button className="primary" onClick={createUser}>
                  Save
                </button>
              ) : (
                <button className="primary" onClick={updateUser}>
                  Update
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
