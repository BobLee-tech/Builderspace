/**
 * One Collector, drawn from Josh's build recipe book: a base box, a column of
 * printed bones joined by servo hinges (IDs 2, 3, 4), the flower servo (ID 11)
 * on top, an LED strip up one side and a felted-wool skin around it. The top
 * sways a little; reduced motion keeps it still (event.css).
 */
export function CollectorDiagram() {
  return (
    <svg
      className="evx-bot"
      viewBox="0 0 300 430"
      role="img"
      aria-label="Collector robot: base, bones and servo hinges, flower on top"
    >
      <path
        className="wool"
        d="M80 368 C76 300 82 240 84 200 C86 160 90 130 96 112 L124 112 C130 130 134 160 136 200 C138 240 144 300 140 368"
      />
      <rect className="part" x="56" y="368" width="108" height="46" rx="6" />
      <rect className="rim" x="68" y="380" width="34" height="22" rx="2" />
      <rect className="rim" x="110" y="380" width="42" height="22" rx="2" />
      <Bone y={300} h={68} />
      <Hinge y={282} id={2} />
      <Bone y={238} h={44} />
      <Hinge y={222} id={3} />
      <line className="led" x1="132" y1="366" x2="132" y2="240" />
      <g className="sway">
        <Bone y={178} h={44} />
        <Hinge y={160} id={4} />
        <rect className="part" x="96" y="140" width="28" height="20" rx="3" />
        <rect
          className="motor"
          x="103"
          y="145"
          width="14"
          height="10"
          rx="1.5"
        />
        <text className="k" x="70" y="153" textAnchor="end">
          M11
        </text>
        <g transform="translate(110 128)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse
              key={a}
              className="petal"
              rx="5"
              ry="13"
              transform={`rotate(${a}) translate(0 -12)`}
            />
          ))}
          <circle r="5" className="motor" />
        </g>
        <path
          className="petal dash"
          d="M96 150 C80 140 74 122 78 104 M124 150 C140 140 146 122 142 104"
        />
        <line className="led" x1="132" y1="222" x2="132" y2="164" />
      </g>
      <Label y={128} zh="花" en="Flower" k="SERVO 11" />
      <Label y={169} zh="关节" en="Hinge" k="SERVO 4" />
      <Label y={231} zh="关节" en="Hinge" k="SERVO 3" />
      <Label y={262} from={260} zh="骨骼 · 3D 打印" en="Bone · 3D print" />
      <Label y={292} from={291} zh="关节" en="Hinge" k="SERVO 2" />
      <Label y={330} zh="LED 灯带" en="LED strip" k="12 V" />
      <Label y={386} from={390} zh="底座" en="Base" k="CTRL · POWER" />
      <text
        className="k"
        x="42"
        y="250"
        textAnchor="middle"
        transform="rotate(-90 42 250)"
      >
        FELTED WOOL SKIN
      </text>
    </svg>
  );
}

function Bone({ y, h }: { y: number; h: number }) {
  const ry = Math.min(7, h * 0.16);
  return (
    <>
      <rect className="bone" x="92" y={y} width="36" height={h} rx="5" />
      <ellipse className="hole" cx="110" cy={y + h * 0.33} rx="9" ry={ry} />
      <ellipse className="hole" cx="110" cy={y + h * 0.7} rx="9" ry={ry} />
    </>
  );
}

function Hinge({ y, id }: { y: number; id: number }) {
  return (
    <>
      <rect className="part" x="88" y={y} width="44" height="18" rx="3" />
      <rect
        className="motor"
        x="102"
        y={y + 4}
        width="16"
        height="10"
        rx="1.5"
      />
      <text className="k" x="70" y={y + 13} textAnchor="end">
        M{id}
      </text>
    </>
  );
}

/** A label to the right, with a dotted leader from the part at `from`. */
function Label({
  y,
  from = y,
  zh,
  en,
  k,
}: {
  y: number;
  from?: number;
  zh: string;
  en: string;
  k?: string;
}) {
  return (
    <>
      <path className="lead" d={`M140 ${from} H184 L194 ${y}`} />
      <text x="200" y={y + 4}>
        <tspan data-l="zh">{zh}</tspan>
        <tspan data-l="en" lang="en">
          {en}
        </tspan>
      </text>
      {k && (
        <text className="k" x="200" y={y + 17}>
          {k}
        </text>
      )}
    </>
  );
}
