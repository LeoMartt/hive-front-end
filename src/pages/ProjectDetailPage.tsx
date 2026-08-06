import { Link, useParams } from "react-router";

export default function ProjectDetailPage() {
  const { id } = useParams<"id">();

  return (
    <main className="container py-5">
      <p className="text-body-secondary mb-2">
        <Link to="/projetos">&larr; Voltar para Meus Projetos</Link>
      </p>
      <h1 className="h4 fw-bold">Em construção</h1>
      <p className="text-body-secondary">
        A tela de detalhe do projeto <strong>{id}</strong> ainda não foi implementada.
      </p>
    </main>
  );
}
