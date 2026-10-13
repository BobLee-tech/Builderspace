import Image from "next/image";
import Link from "next/link";
import { AsciiTorus, ToTop } from "./fx/footer-fx";
import { Clock } from "./fx/text-fx";
import { NAV_LINKS } from "./nav-links";
import { T } from "./t";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div>
          <Link href="/" className="logo">
            <Image src="/mark-240.webp" alt="" width={240} height={154} />
            BuilderSpace
          </Link>
          <p className="foot-note mute">
            <T
              zh="一个从 UNSW 起步的中英双语创客社团。学生自发组织，非 UNSW 或 Arc 官方社团。"
              en="A bilingual builders community started at UNSW. Student-run; not an official UNSW or Arc club."
            />
          </p>
          <AsciiTorus />
          <span className="mono mute">render · ascii</span>
        </div>
        <div>
          <h4 className="mono mute">
            <T zh="站内" en="Site" />
          </h4>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
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
              <Link href="/projects/new">
                <T zh="提交项目卡" en="Submit a project" />
              </Link>
            </li>
            <li>
              <a href="/events.ics">
                <T zh="订阅活动日历" en="Subscribe to events" />
              </a>
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
        <div className="foot-bar mono">
          <span>© 2026 BuilderSpace · Sydney</span>
          <span>
            SYD <Clock tz="Australia/Sydney" seconds /> · BJ{" "}
            <Clock tz="Asia/Shanghai" />
          </span>
          <span className="fb-status">
            <i aria-hidden />
            <T
              zh="Build Night 每周三 18:30"
              en="Build Night: Wednesdays 18:30"
            />
          </span>
          <ToTop />
        </div>
      </div>
    </footer>
  );
}
