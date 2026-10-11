import Link from "next/link";
import { NAV_LINKS } from "./nav-links";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <p className="logo">BuilderSpace</p>
          <p className="foot-note mute">
            一个从 UNSW 起步的中英双语创客社团。学生自发组织，非 UNSW 或 Arc
            官方社团。
          </p>
        </div>
        <div>
          <h4 className="mono mute">站内</h4>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mono mute">其他</h4>
          <ul>
            <li>
              <Link href="/projects/new">提交项目卡</Link>
            </li>
            <li>
              <a href="/events.ics">订阅活动日历</a>
            </li>
            <li>
              <a
                href="https://github.com/BobLee-tech/Bulidspace"
                target="_blank"
                rel="noreferrer"
              >
                GitHub ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
