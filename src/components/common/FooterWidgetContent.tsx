import BeeMark from "./BeeMark";
import Avatar from "./Avatar";

interface FooterWidgetContentProps {
  userName: string;
  userRole: string;
}

export default function FooterWidgetContent({ userName, userRole }: FooterWidgetContentProps) {
  return (
    <>
      <div className="footer-brand">
        <BeeMark />
        <div className="footer-brand-text">
          <b>HIVE</b>
          <span>UAT · Cutover</span>
        </div>
      </div>
      <div className="footer-widget-divider" />
      <div className="footer-user">
        <div className="footer-user-text">
          <b>{userName}</b>
          <span>{userRole}</span>
        </div>
        <Avatar name={userName} personKey="me" className="footer-widget-avatar" alt="" />
      </div>
    </>
  );
}
