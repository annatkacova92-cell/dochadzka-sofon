# Dochádzka — Sofon Lab

Webová appka na zaznamenávanie dochádzky. Každý sa prihlási vlastným súkromným e-mailom
a vidí len svoje záznamy. Ty (admin) vidíš dochádzku celého tímu. Bezpečnosť je riešená
na úrovni databázy (Row Level Security v Postgrese), nie len v rozhraní — takže to platí
naozaj, nie len opticky.

Technológie: obyčajné HTML/CSS/JS (žiadny build krok) + [Supabase](https://supabase.com)
(databáza + prihlasovanie, zadarmo pre malý tím).

## Čo obsahuje

```
index.html            — prihlásenie / registrácia
app.html              — appka (moja dochádzka + admin prehľad)
reset-password.html   — nastavenie nového hesla (odkaz z e-mailu vedie sem)
css/style.css          — vzhľad
js/supabaseClient.js   — sem vložíš svoje Supabase údaje (krok 2)
js/auth.js              — logika prihlásenia + „Zabudol/a som heslo"
js/reset-password.js    — logika nastavenia nového hesla
js/shared.js            — spoločné funkcie
js/member.js            — pohľad bežného člena
js/admin.js             — pohľad admina (teba)
sql/schema.sql           — databázová schéma + pravidlá prístupu (spusti v kroku 2)
```

## Krok 1 — vytvor si Supabase účet a projekt (zadarmo)

1. Choď na [supabase.com](https://supabase.com) → **Start your project** → prihlás sa
   (napr. cez GitHub).
2. **New project** → daj mu meno (napr. `dochadzka-sofon`), zvoľ heslo pre databázu
   (ulož si ho, nebudeš ho potrebovať bežne) a región (napr. Frankfurt).
3. Počkaj cca minútu, kým sa projekt vytvorí.

## Krok 2 — nastav databázu

1. V ľavom menu choď na **SQL Editor** → **New query**.
2. Otvor súbor `sql/schema.sql` z tohto priečinka, skopíruj **celý obsah** a vlož ho do
   editora.
3. Klikni **Run**. Malo by to prebehnúť bez chýb — vytvorí to tabuľky `profiles` a
   `attendance` a nastaví pravidlá, kto čo vidí.

## Krok 3 — získaj prístupové údaje a vlož ich do appky

1. V ľavom menu **Project Settings** → **API**.
2. Skopíruj **Project URL** a **anon public** kľúč.
3. Otvor `js/supabaseClient.js` v tomto priečinku a nahraď:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```
   svojimi hodnotami. (Tento kľúč nie je tajný v klasickom zmysle — je bezpečné mať ho
   vo verejnom repozitári, dáta chránia pravidlá z kroku 2, nie tajnosť kľúča.)

## Krok 4 — nahraj na GitHub a spusti appku

1. Vytvor si nový repozitár na GitHub (napr. `dochadzka-sofon`), verejný alebo súkromný.
2. Nahraj doň celý obsah tohto priečinka (cez GitHub web rozhranie „Add file → Upload
   files", alebo cez git príkazy, ak ich poznáš).
3. V repozitári choď na **Settings → Pages**, v sekcii „Build and deployment" zvoľ
   **Deploy from a branch**, branch `main`, priečinok `/ (root)` → **Save**.
4. Po chvíli sa appka objaví na adrese v tvare
   `https://<tvoje-github-meno>.github.io/dochadzka-sofon/`.

## Krok 5 — dopovedz Supabase, kde appka beží

1. Späť v Supabase: **Authentication → URL Configuration**.
2. Do **Site URL** vlož presnú adresu appky z kroku 4 (napr.
   `https://anna.github.io/dochadzka-sofon/`).
3. V sekcii **Redirect URLs** pridaj aj adresu stránky na obnovenie hesla, napr.
   `https://anna.github.io/dochadzka-sofon/reset-password.html` (bez tohto kroku bude
   odkaz „Zabudol/a som heslo" v e-maile presmerúvať na zlú adresu).
4. Ulož. (Toto je dôležité, inak potvrdzovacie a resetovacie e-maily budú smerovať na
   zlú adresu.)

## Krok 6 — zaregistruj sa a nastav sa ako admin

1. Otvor appku na jej GitHub Pages adrese, klikni **Registrovať sa**, zadaj svoje meno,
   svoj e-mail a heslo.
2. Ak máš v Supabase zapnuté potvrdzovanie e-mailom (predvolené), potvrď registráciu
   cez odkaz v maile, ktorý ti príde.
3. V Supabase choď na **SQL Editor** → nová query → spusti (s tvojím reálnym emailom):
   ```sql
   update public.profiles set role = 'admin' where email = 'tvoj@email.sk';
   ```
4. Znova sa prihlás do appky — mal by sa ti zobraziť aj tab „Prehľad tímu (admin)".

## Ako to používajú Sofonisti

Pošli im link na appku (GitHub Pages adresa z kroku 4). Každý si vytvorí vlastný účet
so svojím súkromným e-mailom a heslom, a od vtedy si zaznamenáva vlastné hodiny — dátum,
počet hodín, typ aktivity (Sofon Meeting / Práca v Jarvisovi / Research / Iné — pri „Iné"
appka vyžaduje aj krátku poznámku, o čo išlo) a nepovinnú poznámku. Vidia len svoje
záznamy. Ty ako admin vidíš dochádzku všetkých, s mesačným prehľadom a farebným
upozornením pri prekročení 30-hodinového limitu.

Ak si niekto zabudne heslo, na prihlasovacej stránke klikne na „Zabudol/a som heslo"
(zadá si najprv svoj e-mail do poľa vyššie), príde mu e-mail s odkazom na
`reset-password.html`, kde si nastaví nové heslo.

## Ak niečo nefunguje

- **Registrácia/prihlásenie nič nerobí** → skontroluj, či si správne vložil URL a anon
  kľúč do `js/supabaseClient.js` (krok 3) a či si appku nahral na GitHub Pages so
  správnou cestou k `css/` a `js/` súborom.
- **Nevidím tab admina** → over si v Supabase (Table Editor → `profiles`), či máš pri
  svojom riadku `role = admin`.
- **Chcem zmeniť limit 30 hodín** → v `js/shared.js` uprav riadok `monthlyCap: 30`.
- **„Zabudol/a som heslo" nefunguje / odkaz z e-mailu je neplatný** → skontroluj v
  Supabase (Authentication → URL Configuration), že máš v **Redirect URLs** pridanú
  presnú adresu `.../reset-password.html` (krok 5). Odkaz v e-maile platí len obmedzený
  čas — ak vypršal, treba si vyžiadať nový.
