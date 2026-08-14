import BeeMark from "./BeeMark";
import { getInitials } from "../../utils/initials";

interface FooterWidgetContentProps {
  userName: string;
  userRole: string;
}

export default function FooterWidgetContent({ userName, userRole }: FooterWidgetContentProps) {
  return (
    <>
      <div className="d-flex align-items-center gap-2">
        <BeeMark />
        <div className="d-flex flex-column text-start lh-sm">
          <span className="fw-bold font-monospace">HIVE</span>
          <span className="text-body-secondary small text-uppercase">UAT · Cutover</span>
        </div>
      </div>
      <div className="footer-widget-divider" />
      <div className="d-flex align-items-center gap-2">
        <div className="text-end">
          <div className="fw-semibold small">{userName}</div>
          <div className="text-body-secondary small">{userRole}</div>
        </div>
        <div className="footer-widget-avatar">{getInitials(userName)}</div>
      </div>
    </>
  );
}
