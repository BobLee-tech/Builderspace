import {
  House,
  CalendarBlank,
  SquaresFour,
  Code,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
const ICONS = {
  home: House,
  events: CalendarBlank,
  projects: SquaresFour,
  learn: Code,
  people: UsersThree,
};
export function NavIcon({ name }: { name: keyof typeof ICONS }) {
  const Icon = ICONS[name];
  return <Icon weight="light" size={20} aria-hidden />;
}
