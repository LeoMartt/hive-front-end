import { useParams } from "react-router";

export default function IssueDetailPlaceholderPage() {
  const { issueId } = useParams();

  return (
    <div className="empty-state">
      <div className="empty-title">Em construção</div>
      <div className="empty-desc">
        A tela de detalhe da issue <b>{issueId}</b> ainda não foi implementada.
      </div>
    </div>
  );
}
