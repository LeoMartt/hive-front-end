import FooterWidgetContent from "../common/FooterWidgetContent";

interface FooterWidgetProps {
  userName: string;
  userRole: string;
}

export default function FooterWidget({ userName, userRole }: FooterWidgetProps) {
  return (
    <div className="footer-widget">
      <FooterWidgetContent userName={userName} userRole={userRole} />
    </div>
  );
}
