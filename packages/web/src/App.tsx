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

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("crm_token") || "");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [permissionQuery, setPermissionQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("crm_token", token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadAll();
  }, [token]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) || null;

  const filteredPermissions = useMemo(() => {
    const query = permissionQuery.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((permission) =>
      [permission.code, permission.description ?? ""].some((text) =>
        text.toLowerCase().includes(query)
      )
    );
  }, [permissionQuery, permissions]);

  async function loadAll() {
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

  return (
    <div className="app">
      <div className="backdrop" />
      <header className="hero">
        <div>
          <p className="eyebrow">MY CRM • Access Studio</p>
          <h1>権限とロールを、手触り良く管理する。</h1>
          <p className="lead">
            権限はロールに集約。ユーザーとグループのロールを合算するだけで、
            STANDARDの運用ポリシーも柔軟に切り替えられます。
          </p>
        </div>
        <div className="token-card">
          <div>
            <span className="label">Access Token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste JWT access token"
            />
          </div>
          <button className="ghost" onClick={loadAll} disabled={!token}>
            Reload
          </button>
          <p className="hint">API: {API_BASE}</p>
        </div>
      </header>

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
                  <p className="role-meta">
                    {role.permissionCodes.length} permissions
                  </p>
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
          {error && <div className="error">{error}</div>}

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
    </div>
  );
}
