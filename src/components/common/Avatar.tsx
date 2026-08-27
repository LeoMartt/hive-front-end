import { usePersonPhoto } from "../../hooks/usePersonPhoto";
import { getInitials } from "../../utils/initials";

interface AvatarProps {
  // Nome completo da pessoa usado para gerar as iniciais do fallback.
  name: string;
  // id do Entra, e-mail/UPN, ou "me". Ausente = sem foto, só iniciais (dados
  // ainda mockados, sem identificador de pessoa).
  personKey?: string;
  // Classe do contêiner circular já existente no projeto: "avatar-mini",
  // "avatar-circle", "footer-widget-avatar" ou "team-member-av".
  className: string;
  // Texto alternativo da imagem. Passe "" quando o nome já aparece ao lado do
  // avatar. Default: o próprio name.
  alt?: string;
}

// Substitui a bolinha de iniciais em todo o projeto. Quando há foto de perfil
// acessível, mostra a <img>; senão, as iniciais (comportamento idêntico ao
// anterior). O visual do contêiner vem da className do chamador.
export default function Avatar({ name, personKey, className, alt }: AvatarProps) {
  const photoUrl = usePersonPhoto(personKey);

  return (
    <span className={className}>
      {photoUrl ? <img src={photoUrl} alt={alt ?? name} /> : getInitials(name)}
    </span>
  );
}
