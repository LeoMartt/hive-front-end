import { useParams } from "react-router";

export default function ActivityDetailPlaceholderPage() {
  const { activityId } = useParams();

  return (
    <div className="text-center py-5">
      <h1 className="h4 fw-bold">Em construção</h1>
      <p className="text-body-secondary">
        A tela de detalhe da atividade <strong>{activityId}</strong> ainda não foi implementada.
      </p>
    </div>
  );
}
