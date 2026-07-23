import { hashString } from "../../utils/libraryGrouping";

// Väripaletti placeholder-kansille (kirjoilla joilla ei ole kansikuvaa).
// Käsin valittu sopimaan sovelluksen metsä/messinki/nahka-teemaan.
const PLACEHOLDER_COVER_COLORS = [
  "#2F4538", // syvä mänty
  "#5C4A3A", // nahkaruskea
  "#7A3B3B", // tiilenpunainen
  "#3B4A5C", // pölyinen laivastonsininen
  "#6B5B2E", // okra
  "#4A3B5C", // vaimea luumu
];

// Yksi kirja hyllyllä, kansi edessä (ei selkämys). Jos kansikuvaa ei ole
// (esim. manuaalisesti lisätty kirja), näytetään paperinvärinen korvaava
// kansi jossa nimi/kirjailija tekstinä.
export default function BookCover({
  title,
  author,
  coverUrl,
  hasMultipleEditions,
  onClick,
}: {
  title: string;
  author: string | null;
  coverUrl: string | null;
  hasMultipleEditions: boolean;
  onClick: () => void;
}) {
  const hash = hashString(title);

  return (
    <button
      onClick={onClick}
      className="group relative w-full transition-transform hover:-translate-y-1 hover:z-10"
      title={title}
    >
      {hasMultipleEditions && (
        <span className="absolute -right-1 -top-1 z-10 h-3 w-3 rounded-full border-2 border-forest bg-brass" />
      )}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          className="aspect-[2/3] w-full rounded-sm object-cover shadow-md"
        />
      ) : (
        <div
          className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 rounded-sm p-1.5 text-center shadow-md"
          style={{
            backgroundColor:
              PLACEHOLDER_COVER_COLORS[hash % PLACEHOLDER_COVER_COLORS.length],
          }}
        >
          <span className="line-clamp-3 font-display text-[10px] leading-tight text-paper">
            {title}
          </span>
          <span className="line-clamp-1 font-body text-[8px] text-paper/60">
            {author ?? ""}
          </span>
        </div>
      )}
    </button>
  );
}
