import { useMsal } from "@azure/msal-react";
import Dropdown from "../common/Dropdown";
import FooterWidgetContent from "../common/FooterWidgetContent";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const LOGOUT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export default function FooterWidget() {
  const { instance } = useMsal();
  const { name, role } = useCurrentUser();

  function handleLogout() {
    instance.logoutRedirect();
  }

  return (
    <Dropdown
      className="footer-widget-dock"
      menuClassName="footer-menu"
      toggle={({ toggle }) => (
        <button type="button" className="footer-widget" onClick={toggle}>
          <FooterWidgetContent userName={name} userRole={role} />
        </button>
      )}
    >
      <button type="button" className="dropdown-item danger" onClick={handleLogout}>
        {LOGOUT_ICON}
        Sair
      </button>
    </Dropdown>
  );
}