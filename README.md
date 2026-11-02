# Sondeo

Participació en directe tipus Mentimeter: el professor projecta, els alumnes entren amb QR o codi i responen des del mòbil.

Tipus: votació, núvol de paraules, resposta oberta (amagar/destacar), escala 1-5 i mur de preguntes (els alumnes pregunten i voten; el professor marca com a respostes o amaga).
Idiomes: català i castellà (selector CA/ES; per defecte, l'idioma del navegador). Traduccions a `public/i18n.js`.

## Accés amb codi d'invitació
- Els professors entren a `/` amb un **codi d'invitació** (un per persona). L'administrador els crea, revoca, caduca i esborra a `/admin` (usuari qualsevol + `ADMIN_PASSWORD`).
- **Tu també** hi entres amb un codi: crea'n un amb el teu nom a `/admin`.
- Els alumnes entren amb QR o amb el codi de 5 xifres de la sessió, sense compte.
- Revocar un codi tanca les seves sessions obertes i invalida el seu accés.
- Les diapositives es guarden al navegador del professor; les respostes viuen només en memòria i s'esborren en acabar.
- L'únic que es guarda a disc (SQLite, `DATA_DIR`) són els codis: etiqueta, codi, dates i comptador de sessions.

## Variables d'entorn (Coolify)
| Variable | Per defecte | Què fa |
|---|---|---|
| `ADMIN_PASSWORD` | aleatòria (surt al log) | Contrasenya de `/admin` (**defineix-la**) |
| `DATA_DIR` | `./data` (`/data` al Docker) | Carpeta de la base de codis. A Coolify: volum persistent a `/data` |
| `CONTACT_URL` | `https://luisfs.com` | Enllaç «demana un codi» de la pantalla d'accés |
| `MAX_SESSIONS_PER_CODE` | 3 | Sessions obertes alhora per codi |
| `MAX_SESSIONS` | 60 | Sessions obertes alhora al servidor |
| `MAX_CLIENTS` | 400 | Alumnes per sessió |
| `PORT` | 3000 | Port |

## Desplegament a Coolify
1. Repositori nou a GitHub (p. ex. `luisfrse/sondeo`) amb aquests fitxers.
2. Coolify → New Resource → Application (GitHub App) → Build Pack: Dockerfile → port 3000.
3. Domini `https://sondeo.luisfs.com`. Variables: `ADMIN_PASSWORD` i (opcional) `CONTACT_URL`.
4. **Storage → Add persistent storage**: destinació `/data` (així els codis sobreviuen als redesplegaments).
5. DNS: registre A de `sondeo` cap a la IP del servidor (núvol gris si fas servir Cloudflare). Els WebSockets passen pel proxy sense configuració extra.
6. Entra a `https://sondeo.luisfs.com/admin`, crea el teu codi i entra a `/`.

## Seguretat
- 5 intents erronis (codi d'invitació o contrasenya d'/admin) cada 15 min per IP; sessions de professor de 12 h; CSP que només permet scripts propis.
- Límits de ritme de missatges, de mida, de sessions per codi i d'alumnes per sessió.
- Requereix Node 22 (usa el SQLite integrat, sense dependències natives).
