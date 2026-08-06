interface FooterWidgetProps {
  userName: string;
  userRole: string;
}

export default function FooterWidget({ userName, userRole }: FooterWidgetProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="footer-widget">
      <div className="d-flex align-items-center gap-2">
        <div className="fw-bold font-monospace">HIVE</div>
        <div className="text-body-secondary small text-uppercase">UAT · Cutover</div>
      </div>
      <div className="footer-widget-divider" />
      <div className="d-flex align-items-center gap-2">
        <div className="text-end">
          <div className="fw-semibold small">{userName}</div>
          <div className="text-body-secondary small">{userRole}</div>
        </div>
        <div className="footer-widget-avatar">{initials}</div>
      </div>
    </div>
  );
}
