import { useState } from "react";
import { useParams } from "react-router";
import ConfigUsersTable from "../components/config/ConfigUsersTable";
import ConfigPermissionMatrix from "../components/config/ConfigPermissionMatrix";
import ConfigThresholdsPanel from "../components/config/ConfigThresholdsPanel";
import ConfigAttachmentsPanel from "../components/config/ConfigAttachmentsPanel";

type ConfigTab = "usuarios" | "limiares";

export default function ProjectConfigPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const [tab, setTab] = useState<ConfigTab>("usuarios");

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Papéis & Config</div>
          <div className="page-desc">Um usuário pode acumular múltiplos papéis simultaneamente no mesmo projeto</div>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`filter-pill${tab === "usuarios" ? " active" : ""}`}
          onClick={() => setTab("usuarios")}
        >
          Usuários
        </button>
        <button
          type="button"
          className={`filter-pill${tab === "limiares" ? " active" : ""}`}
          onClick={() => setTab("limiares")}
        >
          Limiares e Regras
        </button>
      </div>

      {tab === "usuarios" ? (
        <div className="config-users-grid">
          <ConfigUsersTable projectId={projectId} />
          <ConfigPermissionMatrix />
        </div>
      ) : (
        <div className="config-limiares-grid">
          <ConfigThresholdsPanel projectId={projectId} />
          <ConfigAttachmentsPanel />
        </div>
      )}
    </div>
  );
}
