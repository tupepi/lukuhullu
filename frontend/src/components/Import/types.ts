import type {
  ImportPreviewRow,
  BookStatus,
  Ownership,
  BookSearchResult,
  ImportRowStatus,
} from "../../types";

// Yhden esikatselurivin muokattava tila. Alustetaan backendin ehdottamilla
// arvoilla (parsed-kentät ja mahdollinen API-osuma), mutta käyttäjä voi
// vielä korjata mitä tahansa ennen lopullista tuontia - esim. jos ISBN-haku
// löysi väärän painoksen, tai status pitää vaihtaa.
export interface EditableRow {
  rowIndex: number;
  include: boolean;
  matchStatus: ImportRowStatus;
  match: ImportPreviewRow["match"];
  suggestions: BookSearchResult[];
  parsedTitle: string | null;
  parsedAuthor: string | null;
  status: BookStatus;
  readYear: string;
  readMonth: string;
  readDay: string;
  ownership: Ownership | "";
  comment: string;
  searchQuery: string;
  searchResults: BookSearchResult[] | null;
  searching: boolean;
}

export function toEditableRow(row: ImportPreviewRow): EditableRow {
  return {
    rowIndex: row.rowIndex,
    // Rivi esivalitaan tuontiin VAIN jos sillä on jo varma osuma - muissa
    // tiloissa (suggestions/no_results/connection_error) käyttäjän pitää
    // itse ratkaista tilanne ennen kuin rivi otetaan mukaan, koska mitään
    // vahvistettua kirjaa ei vielä ole
    include: row.error === null && row.status === "matched",
    matchStatus: row.status,
    match: row.match,
    suggestions: row.suggestions,
    parsedTitle: row.parsed.title,
    parsedAuthor: row.parsed.author,
    status: row.parsed.status,
    readYear: row.parsed.readYear?.toString() ?? "",
    readMonth: row.parsed.readMonth?.toString() ?? "",
    readDay: row.parsed.readDay?.toString() ?? "",
    ownership: row.parsed.ownership ?? "",
    comment: row.parsed.comment ?? "",
    searchQuery: `${row.parsed.title ?? ""} ${row.parsed.author ?? ""}`.trim(),
    searchResults: null,
    searching: false,
  };
}
