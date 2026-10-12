import Link from "next/link";
import { NAV_LINKS, NAV_TRANSITION } from "./nav-links";
import { T } from "./t";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <p className="logo">BuilderSpace</p>
          <p className="foot-note mute">
            <T
              zh="从 UNSW 起步的中英双语创客社。学生自发组织，非 UNSW 或 Arc 官方社团。"
              en="A bilingual builders club that started at UNSW. Student-run; not an official UNSW or Arc club."
            />
          </p>
          <p className="foot-note mute">
            <T
              zh="免费加入 · 项目归作者所有 · 尊重学术诚信与隐私"
              en="Free to join · Your project stays yours · Academic integrity and privacy respected"
            />
          </p>
        </div>
        <div>
          <h4 className="mono mute">
            <T zh="站内" en="Site" />
          </h4>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link transitionTypes={NAV_TRANSITION} href={link.href}>
                  <T zh={link.zh} en={link.en} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mono mute">
            <T zh="其他" en="More" />
          </h4>
          <ul>
            <li>
              <Link transitionTypes={NAV_TRANSITION} href="/join">
                <T zh="加入" en="Join" />
              </Link>
            </li>
            <li>
              <Link transitionTypes={NAV_TRANSITION} href="/projects/new">
                <T zh="提交项目卡" en="Submit a project" />
              </Link>
            </li>
            <li>
              <a href="/events.ics">
                <T zh="订阅活动日历" en="Subscribe to events" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
