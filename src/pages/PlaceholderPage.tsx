interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="empty-state">
      <div className="empty-title">Em construção</div>
      <div className="empty-desc">{title} ainda não foi implementado.</div>
    </div>
  );
}
