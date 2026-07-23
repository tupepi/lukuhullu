// Pisteyttää ehdokkaita tuonnin osumien tunnistamiseksi. Kaksi erillistä
// pisteytystapaa eri käyttötarkoituksiin - ks. routes/import.js:n
// kolmivaiheinen findBestMatch ja PAATOKSET.md.

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Rullaava 1D-taulukko täyden (n+1)x(m+1)-matriisin sijaan - tarvitsee vain
// edellisen rivin arvot kummankin uuden rivin laskemiseen. O(min(n,m))
// muistia täyden O(n*m):n sijaan, mikä on merkittävä ero kun tätä ajetaan
// jokaista tuonnin riviä kohti jokaista ehdokasta vastaan (ks. routes/
// import.js: pickBestMatch/rankCandidates iteroivat KAIKKI ehdokkaat).
function levenshteinDistance(a, b) {
  // Varmistetaan että 'b' on lyhyempi merkkijono - pienempi taulukko riittää
  if (a.length < b.length) [a, b] = [b, a];

  let previousRow = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j] + 1, // poisto
        currentRow[j - 1] + 1, // lisäys
        previousRow[j - 1] + cost, // korvaus
      );
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

function similarity(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const distance = levenshteinDistance(na, nb);
  const maxLength = Math.max(na.length, nb.length);
  return 1 - distance / maxLength;
}

// Käytetään vaiheissa 1 ja 3 (ks. routes/import.js), joissa kirjailijaa
// EI ole vielä varmistettu erillisellä haku-kentällä - siksi sekä nimi
// että kirjailija pisteytetään yhdessä (title 70% / author 30%).
export function pickBestMatch(
  parsed,
  candidates,
  { minTitleSimilarity, minScore },
) {
  if (!candidates || candidates.length === 0) return null;

  let best = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const titleScore = similarity(parsed.title, candidate.title);
    if (titleScore < minTitleSimilarity) continue;

    let score = titleScore * 70;
    if (parsed.author && candidate.author) {
      score += similarity(parsed.author, candidate.author) * 30;
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best && bestScore >= minScore ? best : null;
}

// Sama pisteytyslogiikka kuin pickBestMatch, mutta palauttaa TOP N
// ehdokasta jotka YLITTÄVÄT väljemmän minimirajat (options) - ei enää
// palauta "parasta huonoista" jos mikään ei ole edes kohtalaisen
// samankaltainen. Tämä estää täysin epärelevanttien kirjojen (esim. oman
// tietokannan satunnaiset kirjat joilla ei ole mitään tekemistä haetun
// nimen kanssa) päätymisen "ehdotukset"-listalle.
export function rankCandidates(parsed, candidates, limit, options) {
  if (!candidates || candidates.length === 0) return [];

  const scored = candidates
    .map((candidate) => {
      const titleScore = similarity(parsed.title, candidate.title);
      let score = titleScore * 70;
      if (parsed.author && candidate.author) {
        score += similarity(parsed.author, candidate.author) * 30;
      }
      return { candidate, score, titleScore };
    })
    .filter(
      (s) =>
        s.titleScore >= options.minTitleSimilarity &&
        s.score >= options.minScore,
    );

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.candidate);
}
