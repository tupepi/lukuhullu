// Hylly: vaakasuora rivi kansikuvia, "seisten" puisella tasolla.
export default function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div
        className="grid gap-4 px-1 pb-1"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))" }}
      >
        {children}
      </div>
      <div className="h-3 rounded-b-sm bg-gradient-to-b from-shelf to-shelf-dark shadow-lg" />
    </div>
  );
}
