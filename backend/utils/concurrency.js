// Geneerinen apufunktio: ajaa fn:n jokaiselle items-taulukon alkiolle
// rajoitetulla samanaikaisuudella (limit "workeria" käsittelee jonoa yksi
// kerrallaan) sen sijaan että kaikki ajettaisiin yhtä aikaa Promise.all:illa.
// Käytetään routes/import.js:ssä rajoittamaan samanaikaisten ulkoisten
// API-kutsujen määrää (ks. sen tiedoston tiedostotason kommentti), mutta
// tämä ei liity kirjoihin mitenkään - sopii uudelleenkäytettäväksi muuallakin.
export async function mapWithConcurrencyLimit(items, limit, fn) {
  const results = Array.from({ length: items.length });
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
      // Ei viivettä enää jos tämä oli työläisen viimeinen alkio - muuten
      // jokainen työläinen odottaisi turhan 1s ennen kuin while-ehto
      // todetaan epätodeksi ja työläinen lopettaa.
      if (nextIndex < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}
