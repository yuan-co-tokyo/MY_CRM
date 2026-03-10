import { useCallback, useEffect, useMemo, useState } from "react";
import "./style.css";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";

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
  customerCategory?: "INDIVIDUAL" | "CORPORATE" | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate?: string | null;
  postalCode?: string | null;
  address?: string | null;
  mobilePhone?: string | null;
  workCompany?: string | null;
  workPhone?: string | null;
  workEmail?: string | null;
  annualIncome?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  householdId?: string | null;
  parentCorporateId?: string | null;
  parentCorporate?: { id: string; name: string } | null;
  subsidiaries?: { id: string; name: string }[] | null;
};

type Household = {
  id: string;
  name: string;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  members: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
};

type Employment = {
  employmentId: string;
  customer: { id: string; name: string; email: string | null };
  jobTitle: string | null;
  department: string | null;
  createdAt: string;
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

type ViewKey = "permissions" | "individual-customers" | "corporate-customers" | "users" | "dashboard" | "households";

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
  assigneeUserIds: [] as string[],
  customerCategory: "" as "" | "INDIVIDUAL" | "CORPORATE",
  gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
  birthDate: "",
  postalCode: "",
  address: "",
  mobilePhone: "",
  workCompany: "",
  workPhone: "",
  workEmail: "",
  annualIncome: "" as "" | number,
  notes: ""
};

function HouseholdsView({ token }: { token: string }) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [householdDetailView, setHouseholdDetailView] = useState<"info" | "members">("info");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", postalCode: "", address: "", phone: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [allIndividuals, setAllIndividuals] = useState<Customer[]>([]);
  const [addMemberCustomerId, setAddMemberCustomerId] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

  const selected = households.find((h) => h.id === selectedId) ?? null;

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Household[]>("/households", token);
      setHouseholds(res);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreateError(null);
    try {
      await apiFetch<Household>("/households", token, {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          postalCode: createForm.postalCode || null,
          address: createForm.address || null,
          phone: createForm.phone || null
        })
      });
      setShowCreate(false);
      setCreateForm({ name: "", postalCode: "", address: "", phone: "" });
      await load();
    } catch (err: any) {
      setCreateError(err.message ?? "作成に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この世帯を削除しますか？")) return;
    try {
      await apiFetch(`/households/${id}`, token, { method: "DELETE" });
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch {
      // ignore
    }
  };

  const openAddMember = async () => {
    try {
      const all = await apiFetch<Customer[]>("/customers?customerCategory=INDIVIDUAL", token);
      setAllIndividuals(all.filter((c) => !c.householdId));
    } catch {
      setAllIndividuals([]);
    }
    setAddMemberCustomerId("");
    setMemberError(null);
    setShowAddMember(true);
  };

  const handleAddMember = async () => {
    if (!selectedId || !addMemberCustomerId) return;
    setMemberError(null);
    try {
      await apiFetch(`/households/${selectedId}/members`, token, {
        method: "POST",
        body: JSON.stringify({ customerId: addMemberCustomerId })
      });
      setShowAddMember(false);
      await load();
    } catch (err: any) {
      setMemberError(err.message ?? "追加に失敗しました");
    }
  };

  const handleRemoveMember = async (customerId: string) => {
    if (!selectedId) return;
    try {
      await apiFetch(`/households/${selectedId}/members/${customerId}`, token, { method: "DELETE" });
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <>
      {selected === null ? (
        <main className="main-content">
          <section className="panel customer-panel-list">
            <div className="panel-header">
              <h2>世帯一覧</h2>
              <span className="chip">{households.length}</span>
            </div>
            <div className="customer-list-rows">
              {households.length === 0 && (
                <p className="muted">世帯がありません</p>
              )}
              {households.map((h) => (
                <button
                  key={h.id}
                  className="role-item customer-row"
                  onClick={() => { setSelectedId(h.id); setHouseholdDetailView("info"); }}
                >
                  <div className="customer-row-main">
                    <p className="role-name">{h.name}</p>
                    <p className="role-meta">{h.address || "ー"}</p>
                  </div>
                  <div className="customer-row-meta">
                    <span className="chip">{h.members.length}人</span>
                  </div>
                  <span className="chev">›</span>
                </button>
              ))}
            </div>
            <button className="primary" onClick={() => setShowCreate(true)}>
              世帯を追加
            </button>
          </section>
        </main>
      ) : (
        <main className="main-content">
          <section className="panel customer-panel-detail">
            <div className="panel-header">
              <div className="customer-detail-back">
                <button className="ghost" onClick={() => setSelectedId(null)}>
                  ← 世帯一覧
                </button>
                <h2>{selected.name}</h2>
              </div>
              <span className="chip">{selected.members.length}人</span>
            </div>

            <div className="customer-detail-shell">
              <nav className="customer-detail-sidebar">
                <button
                  className={`sidebar-item${householdDetailView === "info" ? " active" : ""}`}
                  onClick={() => setHouseholdDetailView("info")}
                >
                  世帯情報
                </button>
                <button
                  className={`sidebar-item${householdDetailView === "members" ? " active" : ""}`}
                  onClick={() => setHouseholdDetailView("members")}
                >
                  メンバー
                  <span className="chip" style={{ marginLeft: 6, fontSize: 11 }}>
                    {selected.members.length}
                  </span>
                </button>
              </nav>

              <div className="customer-detail-content">
                {householdDetailView === "info" && (
                  <>
                    <div className="detail-sections">
                      <div className="detail-section">
                        <p className="eyebrow detail-section-title">基本情報</p>
                        <div className="detail-grid">
                          <div>
                            <p className="label">世帯名</p>
                            <p>{selected.name}</p>
                          </div>
                          <div>
                            <p className="label">電話番号</p>
                            <p>{selected.phone || "ー"}</p>
                          </div>
                          <div>
                            <p className="label">郵便番号</p>
                            <p>{selected.postalCode || "ー"}</p>
                          </div>
                          <div>
                            <p className="label">住所</p>
                            <p>{selected.address || "ー"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="detail-section">
                        <p className="eyebrow detail-section-title">システム情報</p>
                        <div className="detail-grid">
                          <div>
                            <p className="label">登録日時</p>
                            <p>{new Date(selected.createdAt).toLocaleString("ja-JP")}</p>
                          </div>
                          <div>
                            <p className="label">更新日時</p>
                            <p>{new Date(selected.updatedAt).toLocaleString("ja-JP")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="detail-actions">
                      <button className="danger" onClick={() => handleDelete(selected.id)}>
                        削除
                      </button>
                    </div>
                  </>
                )}

                {householdDetailView === "members" && (
                  <>
                    <div className="detail-sections">
                      <div className="detail-section">
                        <p className="eyebrow detail-section-title">メンバー一覧</p>
                        {selected.members.length === 0 ? (
                          <p className="muted">メンバーがいません</p>
                        ) : (
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 text-gray-600 font-medium">名前</th>
                                <th className="text-right py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {selected.members.map((m) => (
                                <tr key={m.id} className="border-b border-gray-100">
                                  <td className="py-2">{m.name}</td>
                                  <td className="py-2 text-right">
                                    <button
                                      className="ghost"
                                      style={{ color: "var(--clr-danger)", fontSize: 12 }}
                                      onClick={() => handleRemoveMember(m.id)}
                                    >
                                      解除
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                    <div className="detail-actions">
                      <button className="primary" onClick={openAddMember}>
                        メンバーを追加
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {showCreate && (
        <div className="modal">
          <div className="modal-card">
            <h3>世帯を追加</h3>
            {createError && <p style={{ color: "var(--clr-danger)", fontSize: 13, marginBottom: 8 }}>{createError}</p>}
            <div className="form-grid">
              <label className="form-full">
                世帯名 *
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                郵便番号
                <input
                  value={createForm.postalCode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </label>
              <label>
                住所
                <input
                  value={createForm.address}
                  onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                />
              </label>
              <label>
                電話番号
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => { setShowCreate(false); setCreateError(null); }}
              >
                キャンセル
              </button>
              <button
                className="primary"
                onClick={handleCreate}
                disabled={!createForm.name}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="modal">
          <div className="modal-card">
            <h3>メンバーを追加</h3>
            {memberError && <p style={{ color: "var(--clr-danger)", fontSize: 13, marginBottom: 8 }}>{memberError}</p>}
            <div className="form-grid">
              <label className="form-full">
                個人顧客
                <select
                  value={addMemberCustomerId}
                  onChange={(e) => setAddMemberCustomerId(e.target.value)}
                >
                  <option value="">-- 選択してください --</option>
                  {allIndividuals.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => { setShowAddMember(false); setMemberError(null); }}
              >
                キャンセル
              </button>
              <button
                className="primary"
                onClick={handleAddMember}
                disabled={!addMemberCustomerId}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmployeesTab({ customerId, token }: { customerId: string; token: string }) {
  const [employees, setEmployees] = useState<Employment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [allIndividuals, setAllIndividuals] = useState<Customer[]>([]);
  const [addForm, setAddForm] = useState({ individualCustomerId: "", jobTitle: "", department: "" });
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Employment[]>(`/customers/${customerId}/employees`, token);
      setEmployees(res);
    } catch {
      // ignore
    }
  }, [customerId, token]);

  useEffect(() => { load(); }, [load]);

  const openAdd = async () => {
    try {
      const all = await apiFetch<Customer[]>("/customers?customerCategory=INDIVIDUAL", token);
      setAllIndividuals(all);
    } catch {
      setAllIndividuals([]);
    }
    setAddForm({ individualCustomerId: "", jobTitle: "", department: "" });
    setAddError(null);
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!addForm.individualCustomerId) return;
    setAddError(null);
    try {
      await apiFetch(`/customers/${customerId}/employees`, token, {
        method: "POST",
        body: JSON.stringify({
          individualCustomerId: addForm.individualCustomerId,
          jobTitle: addForm.jobTitle || null,
          department: addForm.department || null
        })
      });
      setShowAdd(false);
      await load();
    } catch (err: any) {
      setAddError(err.message ?? "追加に失敗しました");
    }
  };

  const handleRemove = async (employmentId: string) => {
    try {
      await apiFetch(`/customers/${customerId}/employees/${employmentId}`, token, { method: "DELETE" });
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">従業員</h3>
        <button
          onClick={openAdd}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          + 追加
        </button>
      </div>
      {employees.length === 0 ? (
        <p className="text-sm text-gray-500">従業員がいません</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-gray-600 font-medium">名前</th>
              <th className="text-left py-2 text-gray-600 font-medium">メール</th>
              <th className="text-left py-2 text-gray-600 font-medium">役職</th>
              <th className="text-left py-2 text-gray-600 font-medium">部署</th>
              <th className="text-right py-2"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.employmentId} className="border-b border-gray-100">
                <td className="py-2">{emp.customer.name}</td>
                <td className="py-2">{emp.customer.email ?? "ー"}</td>
                <td className="py-2">{emp.jobTitle ?? "ー"}</td>
                <td className="py-2">{emp.department ?? "ー"}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleRemove(emp.employmentId)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    解除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">従業員を追加</h3>
            {addError && <p className="text-red-600 text-sm mb-3">{addError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">個人顧客 *</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  value={addForm.individualCustomerId}
                  onChange={(e) => setAddForm((f) => ({ ...f, individualCustomerId: e.target.value }))}
                >
                  <option value="">-- 選択してください --</option>
                  {allIndividuals.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  value={addForm.jobTitle}
                  onChange={(e) => setAddForm((f) => ({ ...f, jobTitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部署</label>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  value={addForm.department}
                  onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowAdd(false); setAddError(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={!addForm.individualCustomerId}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CorporateGroupTab({ customerId, token, allCorporates }: { customerId: string; token: string; allCorporates: Customer[] }) {
  const [subsidiaries, setSubsidiaries] = useState<Customer[]>([]);
  const [parentCorporate, setParentCorporate] = useState<{ id: string; name: string } | null>(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [addSubId, setAddSubId] = useState("");
  const [addSubError, setAddSubError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Customer[]>(`/customers/${customerId}/subsidiaries`, token);
      setSubsidiaries(res);
    } catch {
      setSubsidiaries([]);
    }
    try {
      const self = await apiFetch<Customer>(`/customers/${customerId}`, token);
      setParentCorporate(self.parentCorporate ?? null);
    } catch {
      setParentCorporate(null);
    }
  }, [customerId, token]);

  useEffect(() => { load(); }, [load]);

  const handleAddSubsidiary = async () => {
    if (!addSubId) return;
    setAddSubError(null);
    try {
      await apiFetch(`/customers/${addSubId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ parentCorporateId: customerId })
      });
      setShowAddSub(false);
      await load();
    } catch (err: any) {
      setAddSubError(err.message ?? "追加に失敗しました");
    }
  };

  const handleRemoveSubsidiary = async (subId: string) => {
    try {
      await apiFetch(`/customers/${subId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ parentCorporateId: null })
      });
      await load();
    } catch {
      // ignore
    }
  };

  const availableForSub = allCorporates.filter(
    (c) => c.id !== customerId && !subsidiaries.find((s) => s.id === c.id)
  );

  return (
    <div>
      {parentCorporate && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">親会社</h3>
          <p className="text-sm text-gray-800">{parentCorporate.name}</p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">子会社</h3>
        <button
          onClick={() => { setAddSubId(""); setAddSubError(null); setShowAddSub(true); }}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          + 追加
        </button>
      </div>

      {subsidiaries.length === 0 ? (
        <p className="text-sm text-gray-500">子会社がありません</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-gray-600 font-medium">会社名</th>
              <th className="text-right py-2"></th>
            </tr>
          </thead>
          <tbody>
            {subsidiaries.map((sub) => (
              <tr key={sub.id} className="border-b border-gray-100">
                <td className="py-2">{sub.name}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleRemoveSubsidiary(sub.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    解除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddSub && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">子会社を追加</h3>
            {addSubError && <p className="text-red-600 text-sm mb-3">{addSubError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">法人顧客 *</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={addSubId}
                onChange={(e) => setAddSubId(e.target.value)}
              >
                <option value="">-- 選択してください --</option>
                {availableForSub.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowAddSub(false); setAddSubError(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddSubsidiary}
                disabled={!addSubId}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("crm_token") || "");
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem("crm_email") || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [view, setView] = useState<ViewKey>("dashboard");

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
  const [customerDetailView, setCustomerDetailView] = useState<"info" | "interactions" | "employees" | "group">("info");
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
  const [userQuery, setUserQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("ALL");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    localStorage.setItem("crm_token", token);
  }, [token]);

  useEffect(() => {
    localStorage.setItem("crm_email", loginEmail);
  }, [loginEmail]);

  const [canSeePermissionsTab, setCanSeePermissionsTab] = useState(false);
  const [canSeeUsersTab, setCanSeeUsersTab] = useState(false);
  const [permissionCheckDone, setPermissionCheckDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setCanSeePermissionsTab(false);
      setCanSeeUsersTab(false);
      setPermissionCheckDone(false);
      return;
    }
    void loadCustomers();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCustomerId) {
      setInteractions([]);
      return;
    }
    setCustomerDetailView("info");
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
    const targetCategory = view === "individual-customers" ? "INDIVIDUAL" : "CORPORATE";
    return customers.filter((customer) => {
      const matchesCategory = customer.customerCategory === targetCategory;
      const matchesQuery =
        !query ||
        [customer.name, customer.email ?? "", customer.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        customerStatusFilter === "ALL" || customer.status === customerStatusFilter;
      return matchesCategory && matchesQuery && matchesStatus;
    });
  }, [customerQuery, customerStatusFilter, customers, view]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !query ||
        [user.name, user.email].join(" ").toLowerCase().includes(query);
      const matchesStatus =
        userStatusFilter === "ALL" || user.status === userStatusFilter;
      const matchesType =
        userTypeFilter === "ALL" || user.userType === userTypeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [userQuery, userStatusFilter, userTypeFilter, users]);

  const corporateCustomers = useMemo(() => customers.filter((c) => c.customerCategory === "CORPORATE"), [customers]);

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
      setPermissionCheckDone(true);
    })();
  }, [token]);

  useEffect(() => {
    if (!permissionCheckDone) return;
    if (view === "permissions" && !canSeePermissionsTab) {
      setView("dashboard");
      setError("");
    } else if (view === "users" && !canSeeUsersTab) {
      setView("dashboard");
      setError("");
    }
  }, [permissionCheckDone, canSeePermissionsTab, canSeeUsersTab, view]);

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
      setInteractions([...res].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()));
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
      setInteractions((prev) => [created, ...prev].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()));
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
      setInteractions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()));
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
    if (!loginEmail || !loginPassword) {
      setError("Email / Password are required");
      return;
    }

    setError("");
    setLoggingIn(true);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/login", "", {
        method: "POST",
        body: JSON.stringify({
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
    setError("");
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
    const category = view === "individual-customers" ? "INDIVIDUAL" : view === "corporate-customers" ? "CORPORATE" : "";
    setCustomerForm({ ...emptyCustomer, customerCategory: category as "" | "INDIVIDUAL" | "CORPORATE" });
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
      assigneeUserIds: customer.assignees.map((assignee) => assignee.id),
      customerCategory: customer.customerCategory ?? "",
      gender: customer.gender ?? "",
      birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : "",
      postalCode: customer.postalCode ?? "",
      address: customer.address ?? "",
      mobilePhone: customer.mobilePhone ?? "",
      workCompany: customer.workCompany ?? "",
      workPhone: customer.workPhone ?? "",
      workEmail: customer.workEmail ?? "",
      annualIncome: customer.annualIncome ?? "",
      notes: customer.notes ?? ""
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
      assigneeUserIds: customerForm.assigneeUserIds,
      customerCategory: customerForm.customerCategory || null,
      gender: customerForm.gender || null,
      birthDate: customerForm.birthDate || null,
      postalCode: customerForm.postalCode || null,
      address: customerForm.address || null,
      mobilePhone: customerForm.mobilePhone || null,
      workCompany: customerForm.workCompany || null,
      workPhone: customerForm.workPhone || null,
      workEmail: customerForm.workEmail || null,
      annualIncome: customerForm.annualIncome === "" ? null : Number(customerForm.annualIncome),
      notes: customerForm.notes || null
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

  if (!token) {
    return (
      <LoginPage
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loggingIn={loggingIn}
        error={error}
        onLogin={() => void login()}
      />
    );
  }

  return (
    <div className="app">
      <div className="backdrop" />
      <div className="shell">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <p className="eyebrow">MY CRM</p>
          </div>
          <div className="sidebar-nav">
            <button
              className={`sidebar-item ${view === "dashboard" ? "active" : ""}`}
              onClick={() => setView("dashboard")}
            >
              ホーム
            </button>
            {canSeePermissionsTab && (
              <button
                className={`sidebar-item ${view === "permissions" ? "active" : ""}`}
                onClick={() => setView("permissions")}
              >
                権限管理
              </button>
            )}
            <button
              className={`sidebar-item ${view === "individual-customers" ? "active" : ""}`}
              onClick={() => { setView("individual-customers"); setSelectedCustomerId(null); setCustomerQuery(""); setCustomerStatusFilter("ALL"); }}
            >
              個人顧客
            </button>
            <button
              className={`sidebar-item ${view === "households" ? "active" : ""}`}
              onClick={() => setView("households")}
            >
              世帯
            </button>
            <button
              className={`sidebar-item ${view === "corporate-customers" ? "active" : ""}`}
              onClick={() => { setView("corporate-customers"); setSelectedCustomerId(null); setCustomerQuery(""); setCustomerStatusFilter("ALL"); }}
            >
              法人顧客
            </button>
            {canSeeUsersTab && (
              <button
                className={`sidebar-item ${view === "users" ? "active" : ""}`}
                onClick={() => setView("users")}
              >
                ユーザー
              </button>
            )}
          </div>
          <div className="sidebar-footer">
            <button className="sidebar-item" onClick={logout}>
              Sign out
            </button>
          </div>
        </nav>
        <div className="main-content">

      {error && <div className="global-error">{error}</div>}


      {view === "permissions" && canSeePermissionsTab ? (
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
      ) : view === "individual-customers" || view === "corporate-customers" ? (
        selectedCustomerId === null ? (
          <main className="main-content">
            <section className="panel customer-panel-list">
              <div className="panel-header">
                <h2>{view === "individual-customers" ? "個人顧客一覧" : "法人顧客一覧"}</h2>
                <span className="chip">{filteredCustomers.length}</span>
              </div>
              <div className="toolbar">
                <input
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="名前・メール・電話で検索"
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
              <div className="customer-list-rows">
                {filteredCustomers.length === 0 && (
                  <p className="muted">顧客が見つかりません。</p>
                )}
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    className="role-item customer-row"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div className="customer-row-main">
                      <p className="role-name">{customer.name}</p>
                      <p className="role-meta">{customer.email || "—"}</p>
                    </div>
                    <div className="customer-row-meta">
                      <span className={`chip status-${customer.status.toLowerCase()}`}>
                        {customer.status}
                      </span>
                      <span className="role-meta">{customer.owner?.name || "未割当"}</span>
                    </div>
                    <span className="chev">›</span>
                  </button>
                ))}
              </div>
              <button className="primary" onClick={openCreateCustomer}>
                顧客を追加
              </button>
            </section>
          </main>
        ) : (
          <main className="main-content">
            <section className="panel customer-panel-detail">
              <div className="panel-header">
                <div className="customer-detail-back">
                  <button className="ghost" onClick={() => setSelectedCustomerId(null)}>
                    {view === "individual-customers" ? "← 個人顧客一覧" : "← 法人顧客一覧"}
                  </button>
                  <h2>{selectedCustomer?.name ?? ""}</h2>
                </div>
                {selectedCustomer && (
                  <span className={`chip status-${selectedCustomer.status.toLowerCase()}`}>
                    {selectedCustomer.status}
                  </span>
                )}
              </div>

              {selectedCustomer && (
                <div className="customer-detail-shell">
                  {/* ── 左サイドバー ── */}
                  <nav className="customer-detail-sidebar">
                    <button
                      className={`sidebar-item${customerDetailView === "info" ? " active" : ""}`}
                      onClick={() => setCustomerDetailView("info")}
                    >
                      顧客情報
                    </button>
                    <button
                      className={`sidebar-item${customerDetailView === "interactions" ? " active" : ""}`}
                      onClick={() => setCustomerDetailView("interactions")}
                    >
                      メモ
                      <span className="chip" style={{ marginLeft: 6, fontSize: 11 }}>
                        {interactions.length}
                      </span>
                    </button>
                    {view === "corporate-customers" && (
                      <>
                        <button
                          className={`sidebar-item${customerDetailView === "employees" ? " active" : ""}`}
                          onClick={() => setCustomerDetailView("employees")}
                        >
                          従業員
                        </button>
                        <button
                          className={`sidebar-item${customerDetailView === "group" ? " active" : ""}`}
                          onClick={() => setCustomerDetailView("group")}
                        >
                          グループ企業
                        </button>
                      </>
                    )}
                  </nav>

                  {/* ── 右コンテンツ ── */}
                  <div className="customer-detail-content">
                    {customerDetailView === "info" && (
                      <>
                        <div className="detail-sections">
                          {/* 基本情報 */}
                          <div className="detail-section">
                            <p className="eyebrow detail-section-title">基本情報</p>
                            <div className="detail-grid">
                              <div>
                                <p className="label">顧客名</p>
                                <p>{selectedCustomer.name}</p>
                              </div>
                              <div>
                                <p className="label">ステータス</p>
                                <span className={`chip status-${selectedCustomer.status.toLowerCase()}`}>
                                  {selectedCustomer.status === "LEAD" ? "リード" : selectedCustomer.status === "ACTIVE" ? "アクティブ" : "非アクティブ"}
                                </span>
                              </div>
                              <div>
                                <p className="label">個人法人区分</p>
                                <p>{selectedCustomer.customerCategory ? (selectedCustomer.customerCategory === "INDIVIDUAL" ? "個人" : "法人") : "ー"}</p>
                              </div>
                              <div>
                                <p className="label">性別</p>
                                <p>{selectedCustomer.gender ? (selectedCustomer.gender === "MALE" ? "男性" : selectedCustomer.gender === "FEMALE" ? "女性" : "その他") : "ー"}</p>
                              </div>
                              <div>
                                <p className="label">生年月日</p>
                                <p>{selectedCustomer.birthDate ? new Date(selectedCustomer.birthDate).toLocaleDateString("ja-JP") : "ー"}</p>
                              </div>
                            </div>
                          </div>

                          {/* 連絡先 */}
                          <div className="detail-section">
                            <p className="eyebrow detail-section-title">連絡先</p>
                            <div className="detail-grid">
                              <div>
                                <p className="label">メールアドレス</p>
                                <p>{selectedCustomer.email || "ー"}</p>
                              </div>
                              <div>
                                <p className="label">電話番号</p>
                                <p>{selectedCustomer.phone || "ー"}</p>
                              </div>
                              <div>
                                <p className="label">携帯電話</p>
                                <p>{selectedCustomer.mobilePhone || "ー"}</p>
                              </div>
                            </div>
                          </div>

                          {/* 住所 */}
                          <div className="detail-section">
                            <p className="eyebrow detail-section-title">住所</p>
                            <div className="detail-grid">
                              <div>
                                <p className="label">郵便番号</p>
                                <p>{selectedCustomer.postalCode || "ー"}</p>
                              </div>
                              <div>
                                <p className="label">住所</p>
                                <p>{selectedCustomer.address || "ー"}</p>
                              </div>
                            </div>
                          </div>

                          {/* 勤務先情報 */}
                          <div className="detail-section">
                            <p className="eyebrow detail-section-title">勤務先情報</p>
                            <div className="detail-grid">
                              <div>
                                <p className="label">勤務先</p>
                                <p>{selectedCustomer.workCompany || "ー"}</p>
                              </div>
                              <div>
                                <p className="label">勤務先電話番号</p>
                                <p>{selectedCustomer.workPhone || "ー"}</p>
                              </div>
                              <div>
                                <p className="label">勤務先メールアドレス</p>
                                <p>{selectedCustomer.workEmail || "ー"}</p>
                              </div>
                              <div>
                                <p className="label">年収</p>
                                <p>{selectedCustomer.annualIncome != null ? `${selectedCustomer.annualIncome.toLocaleString()} 円` : "ー"}</p>
                              </div>
                            </div>
                          </div>

                          {/* 世帯情報 (個人顧客のみ) */}
                          {view === "individual-customers" && selectedCustomer.householdId && (
                            <div className="detail-section">
                              <p className="eyebrow detail-section-title">世帯</p>
                              <div className="detail-grid">
                                <div>
                                  <p className="label">世帯ID</p>
                                  <p>{selectedCustomer.householdId}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 担当情報 */}
                          <div className="detail-section">
                            <p className="eyebrow detail-section-title">担当情報</p>
                            <div className="detail-grid">
                              <div>
                                <p className="label">担当者</p>
                                <p>{selectedCustomer.owner?.name || "未割当"}</p>
                              </div>
                              <div>
                                <p className="label">副担当者</p>
                                <p>{selectedCustomer.assignees.map((a) => a.name).join("、") || "ー"}</p>
                              </div>
                            </div>
                          </div>

                          {/* 備考 */}
                          {selectedCustomer.notes && (
                            <div className="detail-section">
                              <p className="eyebrow detail-section-title">備考</p>
                              <p style={{ whiteSpace: "pre-wrap" }}>{selectedCustomer.notes}</p>
                            </div>
                          )}

                          {/* システム情報 */}
                          <div className="detail-section">
                            <p className="eyebrow detail-section-title">システム情報</p>
                            <div className="detail-grid">
                              <div>
                                <p className="label">登録日時</p>
                                <p>{new Date(selectedCustomer.createdAt).toLocaleString("ja-JP")}</p>
                              </div>
                              <div>
                                <p className="label">更新日時</p>
                                <p>{new Date(selectedCustomer.updatedAt).toLocaleString("ja-JP")}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="detail-actions">
                          <button className="ghost" onClick={() => openEditCustomer(selectedCustomer)}>
                            編集
                          </button>
                          <button className="danger" onClick={() => void removeCustomer(selectedCustomer.id)}>
                            削除
                          </button>
                        </div>
                      </>
                    )}
                    {customerDetailView === "interactions" && (
                      <div className="timeline">
                        <div className="timeline-header">
                          <h3>Interactions</h3>
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
                    )}
                    {customerDetailView === "employees" && view === "corporate-customers" && (
                      <EmployeesTab customerId={selectedCustomer.id} token={token} />
                    )}
                    {customerDetailView === "group" && view === "corporate-customers" && (
                      <CorporateGroupTab customerId={selectedCustomer.id} token={token} allCorporates={corporateCustomers} />
                    )}
                  </div>
                </div>
              )}
            </section>
          </main>
        )
      ) : view === "households" ? (
        <HouseholdsView token={token} />
      ) : view === "dashboard" ? (
        <DashboardPage token={token} />
      ) : view === "users" && canSeeUsersTab ? (
        <main className="layout users">
          <section className="panel user-list">
            <div className="panel-header">
              <h2>Users</h2>
              <span className="chip">{users.length}</span>
            </div>
            <div className="toolbar">
              <input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Search name or email"
              />
              <select
                value={userStatusFilter}
                onChange={(event) => setUserStatusFilter(event.target.value)}
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <select
                value={userTypeFilter}
                onChange={(event) => setUserTypeFilter(event.target.value)}
              >
                <option value="ALL">All types</option>
                <option value="STANDARD">Standard</option>
                <option value="PRIVILEGED">Privileged</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="role-scroll">
              {filteredUsers.map((user) => (
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
      ) : null}

      {customerFormOpen && (
        <div className="modal">
          <div className="modal-card">
            <h3>{customerFormMode === "create" ? "顧客を作成" : "顧客を編集"}</h3>
            <div className="form-grid">
              <label className="form-full">
                顧客名
                <input
                  value={customerForm.name}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <label>
                メールアドレス
                <input
                  value={customerForm.email}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label>
                電話番号
                <input
                  value={customerForm.phone}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </label>
              <label>
                ステータス
                <select
                  value={customerForm.status}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({
                      ...prev,
                      status: event.target.value as Customer["status"]
                    }))
                  }
                >
                  <option value="LEAD">リード</option>
                  <option value="ACTIVE">アクティブ</option>
                  <option value="INACTIVE">非アクティブ</option>
                </select>
              </label>
              <label>
                担当者
                <select
                  value={customerForm.ownerUserId}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, ownerUserId: event.target.value }))
                  }
                >
                  <option value="">未割当</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-full">
                <p className="label">副担当者</p>
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
              <label>
                個人法人区分
                <select
                  value={customerForm.customerCategory}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, customerCategory: event.target.value as "" | "INDIVIDUAL" | "CORPORATE" }))
                  }
                >
                  <option value="">未選択</option>
                  <option value="INDIVIDUAL">個人</option>
                  <option value="CORPORATE">法人</option>
                </select>
              </label>
              <label>
                性別
                <select
                  value={customerForm.gender}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, gender: event.target.value as "" | "MALE" | "FEMALE" | "OTHER" }))
                  }
                >
                  <option value="">未選択</option>
                  <option value="MALE">男性</option>
                  <option value="FEMALE">女性</option>
                  <option value="OTHER">その他</option>
                </select>
              </label>
              <label>
                生年月日
                <input
                  type="date"
                  value={customerForm.birthDate}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                />
              </label>
              <label>
                郵便番号
                <input
                  value={customerForm.postalCode}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, postalCode: event.target.value }))
                  }
                />
              </label>
              <label className="form-full">
                住所
                <input
                  value={customerForm.address}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
              </label>
              <label>
                携帯電話番号
                <input
                  value={customerForm.mobilePhone}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, mobilePhone: event.target.value }))
                  }
                />
              </label>
              <label>
                勤務先
                <input
                  value={customerForm.workCompany}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, workCompany: event.target.value }))
                  }
                />
              </label>
              <label>
                勤務先電話番号
                <input
                  value={customerForm.workPhone}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, workPhone: event.target.value }))
                  }
                />
              </label>
              <label>
                勤務先メールアドレス
                <input
                  type="email"
                  value={customerForm.workEmail}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, workEmail: event.target.value }))
                  }
                />
              </label>
              <label>
                年収
                <input
                  type="number"
                  value={customerForm.annualIncome}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, annualIncome: event.target.value === "" ? "" : Number(event.target.value) }))
                  }
                />
              </label>
              <label className="form-full">
                備考
                <textarea
                  value={customerForm.notes}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  rows={3}
                />
              </label>
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
      </div>
    </div>
  );
}
