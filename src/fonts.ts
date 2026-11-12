import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

const cssUrl = (family: string, weights: string | null) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}${weights ? `:wght@${weights}` : ""}&display=swap`;

async function loadFamily(family: string) {
  // Aplicația cere 400;700;900. Dacă fontul nu are toate grosimile, Google răspunde cu eroare,
  // așa că încercăm variante mai simple, ca să obținem totuși fontul real.
  for (const weights of ["400;700;900", "400;700", null]) {
    const url = cssUrl(family, weights);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
      await Promise.all(
        [400, 700, 900].map((w) => document.fonts.load(`${w} 40px '${family}'`, "ĂÎȘȚÂăîșțâ Abc123")),
      );
      return;
    } catch {
      /* încercăm următoarea variantă */
    }
  }
  console.warn(`Fontul "${family}" nu a putut fi încărcat; se folosește fontul de rezervă.`);
}

export function useGoogleFonts(families: string[]) {
  const key = families.join("|");
  const [handle] = useState(() => delayRender(`Se încarcă fonturile: ${key}`, { timeoutInMilliseconds: 90000 }));
  useEffect(() => {
    let alive = true;
    Promise.all([...new Set(families)].map(loadFamily))
      .then(() => document.fonts.ready)
      .then(() => { if (alive) continueRender(handle); })
      .catch((e) => cancelRender(e));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
