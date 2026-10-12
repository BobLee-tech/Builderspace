import Image from "next/image";
import Link from "next/link";
import { LangToggle } from "./lang-toggle";
import { NavItems } from "./nav-items";

export function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="BuilderSpace 首页">
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
        <LangToggle />
      </div>
    </header>
  );
}
