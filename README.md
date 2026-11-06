# Sondages vs résultats

Site statique qui compare les sondages de premier tour de l'année précédant chaque présidentielle (2012, 2017, 2022, 2027) aux résultats réels.

- `site/` : ce que Netlify publie (page, données, police, d3).
- `site/data/` : un fichier par élection. 2012, 2017 et 2022 sont figés ; `sondages_2027.json` est mis à jour automatiquement.
- `scripts/update-2027.js` : lit la page Wikipédia « Liste de sondages sur l'élection présidentielle française de 2027 », contrôle les données et met à jour le fichier si de nouveaux sondages sont parus.
- `.github/workflows/mise-a-jour.yml` : lance ce script 4 fois par jour. Si les contrôles échouent (page Wikipédia modifiée, données incohérentes), rien n'est publié et GitHub envoie un mail.

Lancer à la main : onglet **Actions** → « Mise à jour des sondages 2027 » → **Run workflow**.

Source : listes de sondages de Wikipédia (fr), résultats officiels du 1er tour.
