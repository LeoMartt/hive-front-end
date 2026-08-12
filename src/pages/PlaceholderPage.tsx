interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="text-center py-5">
      <h1 className="h4 fw-bold">Em construção</h1>
      <p className="text-body-secondary">{title} ainda não foi implementado.</p>
    </div>
  );
}
