import { useParams } from "react-router";

export default function ActivityDetailPlaceholderPage() {
  const { activityId } = useParams();

  return (
    <div className="empty-state">
      <div className="empty-title">Em construção</div>
      <div className="empty-desc">
        A tela de detalhe da atividade <b>{activityId}</b> ainda não foi implementada.
      </div>
    </div>
  );
}
