import { NavItems } from "./nav-items";

/** Bottom navigation on phones — most visitors arrive from WeChat / 小红书. */
export function Dock() {
  return (
    <nav className="dock" aria-label="底部导航">
      <NavItems withIcons />
    </nav>
  );
}
