import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { DEFAULT_PERMISSION_MATRIX, PROJECT_PERMISSIONS, type ProjectPermissionMatrix, type ProjectPermissionRole } from "../../types/projectPermissions";
import Modal from "../common/Modal";

const ROLES = [{ key: "GESTOR", label: "Gestor" }, { key: "TESTER", label: "Tester" }, { key: "DEV", label: "Dev" }] as const;

export default function ConfigPermissionMatrix({ onSaved }: { onSaved: () => void }) {
  const { config, canManage, setConfig } = useProjectConfig();
  const [draft, setDraft] = useState<ProjectPermissionMatrix>(config.permissionMatrix);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(config.permissionMatrix);
  }, [config.permissionMatrix]);
  const allowed = (matrix: ProjectPermissionMatrix, key: typeof PROJECT_PERMISSIONS[number]["key"], role: ProjectPermissionRole) =>
    matrix[key]?.[role] ?? DEFAULT_PERMISSION_MATRIX[key]?.[role] ?? false;
  const changes = PROJECT_PERMISSIONS.flatMap(row => ROLES.filter(role => role.key !== "GESTOR").flatMap(role =>
    allowed(draft, row.key, role.key) !== allowed(config.permissionMatrix, row.key, role.key)
      ? [`${row.label} · ${role.label}: ${allowed(draft, row.key, role.key) ? "permitir" : "retirar permissão"}`] : [],
  ));

  async function save() {
    if (!canManage || saving || !changes.length) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      await setConfig({ ...config, permissionMatrix: draft });
      setConfirming(false); setSaved(true); onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as permissões.");
    } finally { setSaving(false); }
  }

  return <section className="config-permission-section">
    <div className="panel-head"><div className="panel-title">Matriz de Permissões por Papel</div></div>
    <div className="page-desc">Permissões deste projeto. O Gestor mantém o controle da matriz e da equipe. As ações sobre registros continuam limitadas aos responsáveis e aos estados válidos.</div>
    <div className="table-wrap config-permission-table">
      <table aria-label="Matriz de permissões por papel">
        <thead><tr><th>Ação</th>{ROLES.map(role => <th key={role.key} style={{ textAlign: "center" }}>{role.label}</th>)}</tr></thead>
        <tbody>{PROJECT_PERMISSIONS.map(row => <tr key={row.key}>
          <td>{row.label}</td>
          {ROLES.map(role => <td key={role.key} style={{ textAlign: "center" }}>
            <input type="checkbox" checked={role.key === "GESTOR" || allowed(draft, row.key, role.key)}
              disabled={!canManage || role.key === "GESTOR" || saving || confirming}
              aria-label={`${row.label} — ${role.label}`}
              onChange={event => {
                setSaved(false); setError(null);
                const checked = event.target.checked;
                setDraft(previous => {
                  const next = { ...previous, [row.key]: { ...DEFAULT_PERMISSION_MATRIX[row.key], ...previous[row.key], [role.key]: checked } };
                  if (row.key === "data_view" && !checked) next.dashboard_view = { ...DEFAULT_PERMISSION_MATRIX.dashboard_view, ...previous.dashboard_view, [role.key]: false };
                  if (row.key === "dashboard_view" && checked) next.data_view = { ...DEFAULT_PERMISSION_MATRIX.data_view, ...previous.data_view, [role.key]: true };
                  return next;
                });
              }} />
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {canManage && <div className="config-save-actions">
      <button type="button" className="btn btn-primary btn-sm" disabled={!changes.length || saving} onClick={() => setConfirming(true)}>Salvar permissões</button>
      {changes.length > 0 && <span role="status">Alterações não salvas</span>}
      {saved && <span className="config-save-success" role="status"><CircleCheck size={18} aria-hidden="true" />Edições Salvas</span>}
    </div>}
    <Modal open={confirming} onClose={() => { if (!saving) setConfirming(false); }} labelledBy="confirm-project-permissions">
      <div className="config-evidence-confirmation">
        <div className="modal-title" id="confirm-project-permissions">Alterar permissões deste projeto?</div>
        <p>As novas permissões passarão a valer para os usuários com esses papéis somente neste projeto. Outros projetos não serão alterados.</p>
        <ul>{changes.map(change => <li key={change}>{change}</li>)}</ul>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn" disabled={saving} onClick={() => setConfirming(false)}>Voltar</button><button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Salvando..." : "Confirmar alteração"}</button></div>
      </div>
    </Modal>
  </section>;
}
