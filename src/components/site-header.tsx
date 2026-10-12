import Image from "next/image";
import Link from "next/link";
import { NAV_TRANSITION } from "./nav-links";
import { LangToggle } from "./lang-toggle";
import { NavItems } from "./nav-items";
import { T } from "./t";

export function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link
          transitionTypes={NAV_TRANSITION}
          href="/"
          className="logo"
          aria-label="BuilderSpace 首页"
        >
          <Image
            src="/mark-240.webp"
            alt=""
            width={240}
            height={240}
            priority
          />
          BuilderSpace
        </Link>
        <nav className="nav" aria-label="主导航">
          <NavItems />
        </nav>
        <Link
          transitionTypes={NAV_TRANSITION}
          href="/join"
          className="btn solid sm"
        >
          <T zh="加入" en="Join" />
        </Link>
        <LangToggle />
      </div>
    </header>
  );
}
