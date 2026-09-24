# Visit Ljubač — web stranica

Glamping šatori, kućice na drvetu i parcele za šatore u Ljubaču, 50 m od mora.

## Brand

Crno, bijelo i crveni akcent (`#e5212d`). Logo VISITLJUBAČ ima srca umjesto točkica na „i” i umjesto kvačice na „Č”.
Logotipi su u mapi `brand/`: SVG (vektor, za tisak) i PNG s prozirnom pozadinom, u crnoj i bijeloj varijanti
te kao vodoravni i složeni (dva reda) logo. Tu je i ikona aplikacije (`icon-512.png`).
Fontovi: Titan One (naslovi), Geist i Geist Mono (tekst).

**Stranica:** https://kriscro99.github.io/visit-ljubac/

## Rezervacije

Gumb **Rezerviraj online** otvara postojeći sustav za rezervacije (visitljubac.com) s već upisanim
smještajem, datumima i brojem gostiju. Dostupnost, cijene i plaćanje (WSPay) rade kao i dosad.
Gost može poslati i **upit** e-mailom ili preko WhatsAppa. Poruka se sama popuni svim odabranim podacima.

## Kako objaviti novost

**Način 1: datoteka `data/novosti.json`.** Na GitHubu otvorite datoteku, kliknite olovku (Edit),
kopirajte jedan blok i promijenite ga:

```json
{
  "datum": "2026-10-01",
  "kategorija": "dogadanje",
  "naslov": "Naslov objave",
  "sazetak": "Kratki opis za karticu.",
  "tekst": ["Prvi odlomak.", "Drugi odlomak."],
  "slika": "img/mjesta/oseka.webp",
  "facebook": "https://www.facebook.com/…/posts/…"
}
```

`kategorija` je `obavijest`, `dogadanje` ili `prica`. `facebook` nije obavezan. Ako ga upišete,
kartica dobiva oznaku Facebook i gumb "Pogledaj objavu na Facebooku".

**Način 2: Google tablica (bez diranja koda).** Napravite Google Sheet sa stupcima
`datum | naslov | kategorija | sazetak | tekst | slika | facebook`, zatim
*Datoteka → Dijeli → Objavi na webu → CSV*. Dobivenu poveznicu upišite u `index.html` pod
`newsSheetCsv`. Svaki novi red u tablici pojavljuje se na stranici kao nova objava.

### Facebook grupa

Meta je u travnju 2024. ugasila Groups API, pa nijedna web stranica više ne može automatski
povlačiti objave iz Facebook grupe. Zato novosti idu preko datoteke ili Google tablice, a uz svaku
možete dodati poveznicu na izvornu objavu u grupi. Gumb "Pratite nas na Facebooku" vodi na adresu
`facebookUrl` u `index.html`.

## Struktura

```
index.html        stranica i postavke (VL_CONFIG)
css/style.css     dizajn i animacije
js/main.js        animacije (GSAP), kalendar, rezervacija, galerije, novosti
js/vendor/        GSAP, ScrollTrigger, SplitText, Lenis (lokalne kopije)
brand/            logotipi (SVG + PNG) i ikona
data/novosti.json objave za news feed
img/              optimizirane fotografije (WebP)
```
