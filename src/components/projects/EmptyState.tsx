interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="d-flex flex-column align-items-center text-center py-5 gap-2">
      <h6 className="fw-bold mb-0">{title}</h6>
      <p className="text-body-secondary small mb-0 empty-state-description">{description}</p>
    </div>
  );
}
