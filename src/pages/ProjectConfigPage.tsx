import { useState } from "react";
import { useParams } from "react-router";
import ConfigUsersTable from "../components/config/ConfigUsersTable";
import ConfigPermissionMatrix from "../components/config/ConfigPermissionMatrix";
import ConfigThresholdsPanel from "../components/config/ConfigThresholdsPanel";
import ConfigAttachmentsPanel from "../components/config/ConfigAttachmentsPanel";
import SaveNotification from "../components/config/SaveNotification";

type ConfigTab = "usuarios" | "limiares";

export default function ProjectConfigPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const [tab, setTab] = useState<ConfigTab>("usuarios");
  const [saveCount, setSaveCount] = useState(0);
  const notifySaved = () => setSaveCount((count) => count + 1);

  return (
    <div className="project-config-page">
      <div className="page-head">
        <div>
          <div className="page-title">Papéis & Config</div>
          <div className="page-desc">Um usuário pode acumular múltiplos papéis simultaneamente no mesmo projeto</div>
        </div>
      </div>

      <div className="config-tabs" role="tablist" aria-label="Configurações do projeto">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "usuarios"}
          aria-controls="config-usuarios"
          id="config-tab-usuarios"
          className={`filter-pill${tab === "usuarios" ? " active" : ""}`}
          onClick={() => setTab("usuarios")}
        >
          Usuários
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "limiares"}
          aria-controls="config-limiares"
          id="config-tab-limiares"
          className={`filter-pill${tab === "limiares" ? " active" : ""}`}
          onClick={() => setTab("limiares")}
        >
          Limiares e Regras
        </button>
      </div>

      {tab === "usuarios" ? (
        <div className="config-users-grid" role="tabpanel" id="config-usuarios" aria-labelledby="config-tab-usuarios">
          <ConfigPermissionMatrix />
          <ConfigUsersTable projectId={projectId} onSaved={notifySaved} />
        </div>
      ) : (
        <div className="config-limiares-grid" role="tabpanel" id="config-limiares" aria-labelledby="config-tab-limiares">
          <ConfigThresholdsPanel projectId={projectId} onSaved={notifySaved} />
          <ConfigAttachmentsPanel onSaved={notifySaved} />
        </div>
      )}
      {saveCount > 0 && <SaveNotification key={saveCount} />}
    </div>
  );
}
