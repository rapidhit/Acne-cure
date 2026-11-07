import { useEffect } from "react";
import LumaApp from "../lumaedit/LumaApp.jsx";
import "../lumaedit/luma.css";

// Luma Edit landing page, served at /lumaedit. Self-contained: its styles are
// scoped under .luma-root so they never touch the rest of the site.
export default function LumaEdit() {
  useEffect(() => {
    const prevTitle = document.title;
    const prevBehavior = document.documentElement.style.scrollBehavior;
    const prevPadding = document.documentElement.style.scrollPaddingTop;
    document.title = "Luma Edit — AI Photo Editing Made Simple";
    document.documentElement.style.scrollBehavior = "smooth";
    document.documentElement.style.scrollPaddingTop = "88px";
    return () => {
      document.title = prevTitle;
      document.documentElement.style.scrollBehavior = prevBehavior;
      document.documentElement.style.scrollPaddingTop = prevPadding;
    };
  }, []);

  return (
    <div className="luma-root">
      <LumaApp />
    </div>
  );
}
