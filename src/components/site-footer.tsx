import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Broadcast,
  CalendarPlus,
} from "@phosphor-icons/react/dist/ssr";
import { CYCLE } from "@/lib/cycle";
import { AsciiTorus, ToTop } from "./fx/footer-fx";
import { Clock } from "./fx/text-fx";
import { NAV_LINKS } from "./nav-links";
import { T } from "./t";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="f-top">
          <div className="f-brand f-col">
            <div className="f-hd">
              <Link href="/" className="logo">
                <Image src="/mark-240.webp" alt="" width={240} height={154} />
                BuilderSpace
              </Link>
            </div>
            <p className="f-lede">
              <T
                zh="从 UNSW 起步的中英双语创客社。"
                en="A bilingual builders club that started at UNSW."
              />
              <br />
              <span>
                <T
                  zh="每周一起，把想法做成能用的东西。"
                  en="Together, every week, we turn ideas into things that work."
                />
              </span>
            </p>
            <ul className="f-tags mono">
              <li>
                <T zh="免费加入" en="Free to join" />
              </li>
              <li>
                <T zh="项目归作者所有" en="Your project stays yours" />
              </li>
              <li>
                <T
                  zh="尊重学术诚信与隐私"
                  en="Academic integrity and privacy"
                />
              </li>
            </ul>
          </div>
          <nav className="f-col" aria-label="Site / 站内">
            <div className="f-hd">
              <h4 className="mono">
                <T zh="站内" en="Site" />
              </h4>
              <span className="mono idx">01</span>
            </div>
            <ul className="f-links">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <T zh={link.zh} en={link.en} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="f-col" aria-label="Take part / 参与">
            <div className="f-hd">
              <h4 className="mono">
                <T zh="参与" en="Take part" />
              </h4>
              <span className="mono idx">02</span>
            </div>
            <ul className="f-links">
              <li>
                <Link href="/join">
                  <T zh="加入" en="Join" />
                </Link>
              </li>
              <li>
                <Link href="/core-team">
                  <T zh="核心成员申请" en="Core team" />
                </Link>
              </li>
              <li>
                <Link href="/projects/new">
                  <T zh="提交项目卡" en="Submit a project" />
                </Link>
              </li>
              <li>
                <a href="/events.ics">
                  <T zh="订阅活动日历" en="Subscribe to events" />
                  <CalendarPlus weight="light" size={14} aria-hidden />
                </a>
              </li>
            </ul>
          </nav>
          <aside className="f-panel surf" aria-label="Status / 状态">
            <div className="f-hd mono mute">
              <span>
                <Broadcast weight="light" size={16} aria-hidden />
                Status
              </span>
              <span className="idx">SYD / BJ</span>
            </div>
            <div className="f-panel-in">
              <div className="f-view">
                <AsciiTorus />
                <span className="lbl mono">render · ascii</span>
              </div>
              <div>
                <div className="f-clocks">
                  <div>
                    <span className="mono mute">Sydney</span>
                    <Clock tz="Australia/Sydney" seconds />
                  </div>
                  <div>
                    <span className="mono mute">Beijing</span>
                    <Clock tz="Asia/Shanghai" />
                  </div>
                </div>
                <Link href="/join" className="f-next">
                  <span>
                    <i className="led" aria-hidden />
                    <T {...CYCLE.status} />
                  </span>
                  <span className="cd mono">
                    <T zh="加入" en="Join" />
                    <ArrowUpRight weight="light" size={14} aria-hidden />
                  </span>
                </Link>
                <p className="f-session mono mute">
                  <T {...CYCLE.buildNight} />
                </p>
              </div>
            </div>
          </aside>
        </div>
        <div className="f-bar mono">
          <span>© 2026 BuilderSpace · Sydney</span>
          <span className="mid">
            <T
              zh="学生自发组织 · 非 UNSW 或 Arc 官方社团"
              en="Student-run · Not an official UNSW or Arc club"
            />
          </span>
          <span className="end">
            <span className="mute">Top</span>
            <ToTop />
          </span>
        </div>
      </div>
    </footer>
  );
}
