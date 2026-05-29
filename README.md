# 🧠 Oui Psycho!

Blog de vulgarisation sur la santé mentale — 100 % statique, compatible GitHub Pages.

---

## 📁 Structure des fichiers

```
psycho-clair/
├── index.html                  ← Page d'accueil (liste dynamique des articles)
├── article.html                ← Template article (chargé via ?id=slug)
├── 404.html                    ← Page d'erreur personnalisée
├── sitemap.xml                 ← Plan du site (SEO — à mettre à jour manuellement)
├── robots.txt                  ← Instructions pour les robots d'indexation
├── .nojekyll                   ← Désactive Jekyll sur GitHub Pages
│
├── css/
│   └── style.css               ← Tous les styles (CSS variables, responsive)
│
├── js/
│   └── main.js                 ← Logique : chargement articles, filtres, partage, cookies
│
├── data/
│   └── articles.json           ← INDEX des articles (tableau JSON)
│
└── articles/
    └── mon-article.json        ← Un fichier JSON par article
```

---

## ✍️ Ajouter un article

### Étape 1 — Créer le fichier JSON de l'article

Créez `/articles/mon-slug.json` :

```json
{
  "id": "mon-slug",
  "title": "Titre de l'article",
  "excerpt": "Un résumé accrocheur de 2-3 phrases pour la carte.",
  "content": "<p>Votre contenu HTML ici.</p><h2>Section 1</h2><p>...</p>",
  "date": "2026-01-15",
  "category": "Anxiété",
  "image": "/img/articles/mon-image.jpg",
  "readTime": 7,
  "author": "La rédaction",
  "tags": ["anxiété", "panique", "respiration"],
  "metaDescription": "Description SEO de 150-160 caractères pour Google."
}
```

**Catégories disponibles :**
`Anxiété` · `Dépression` · `Bien-être` · `Relations` · `Stress` · `Sommeil` · `Thérapies` · `Développement personnel`

### Étape 2 — Référencer l'article dans l'index

Ajoutez une entrée dans `/data/articles.json` :

```json
[
  {
    "id": "mon-slug",
    "title": "Titre de l'article",
    "excerpt": "Résumé de 2-3 phrases.",
    "date": "2026-01-15",
    "category": "Anxiété",
    "image": "/img/articles/mon-image.jpg",
    "readTime": 7
  }
]
```

> **L'index est utilisé pour la page d'accueil.** Le fichier JSON complet est chargé uniquement sur la page article.

### Étape 3 — Mettre à jour le sitemap

Ajoutez une entrée dans `sitemap.xml` :

```xml
<url>
  <loc>https://psychoclair.fr/article.html?id=mon-slug</loc>
  <lastmod>2026-01-15</lastmod>
  <priority>0.8</priority>
</url>
```

---

## 💰 Monétisation AdSense

### Mise en place

1. **Inscrivez-vous** sur [Google AdSense](https://www.google.com/adsense/)
2. **Ajoutez votre site** et attendez l'approbation (1-2 semaines minimum, le site doit avoir du contenu)
3. **Récupérez votre Publisher ID** (format : `ca-pub-1234567890123456`)

### Activer les publicités

Dans `index.html` et `article.html`, décommentez et personnalisez :

```html
<!-- AVANT (commenté) -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script> -->

<!-- APRÈS (actif) -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-VOTRE_ID" crossorigin="anonymous"></script>
```

Puis décommentez les balises `<ins class="adsbygoogle">` dans les emplacements prévus.

### Emplacements publicitaires prévus

| Emplacement         | Format       | Fichier         | Slot variable    |
|---------------------|--------------|-----------------|------------------|
| Bannière top        | 728×90       | index + article | `0000000000`     |
| En-tête article     | Responsive   | article.html    | `1111111111`     |
| Bas article         | Responsive   | article.html    | `2222222222`     |
| Sidebar rectangle   | 300×250      | index.html      | `3333333333`     |
| Sidebar sticky      | 300×600      | index.html      | `4444444444`     |
| Sidebar article     | 300×250      | article.html    | `5555555555`     |
| Sidebar article 2   | 300×600      | article.html    | `6666666666`     |

Remplacez chaque `XXXXXXXXXX` par votre vrai **Ad Slot ID** depuis la console AdSense.

### Conseils pour maximiser les revenus

- ✅ Publiez **minimum 15-20 articles** avant de demander l'approbation AdSense
- ✅ Chaque article doit faire **800+ mots** de contenu original
- ✅ Ciblez des **mots-clés longue traîne** (ex : "comment gérer une crise d'angoisse la nuit")
- ✅ Partagez sur **Pinterest** (très fort pour le trafic santé/bien-être)
- ✅ Créez une page **À propos** et une page **Contact** (requis pour AdSense)
- ✅ Ajoutez une **Politique de confidentialité** mentionnant l'utilisation de cookies publicitaires

---

## 🚀 Déploiement sur GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit — Oui Psycho!"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/psycho-clair.git
git push -u origin main
```

Ensuite dans les **Settings** du repo GitHub :
- **Pages** → Source : `Deploy from branch` → `main` → `/ (root)`
- Votre site sera disponible sur `https://VOTRE_USERNAME.github.io/psycho-clair/`

Pour un domaine personnalisé (`psychoclair.fr`), créez un fichier `CNAME` :
```
psychoclair.fr
```

---

## 🔧 Personnalisation rapide

| Modification              | Fichier              | Ce qu'il faut changer         |
|---------------------------|----------------------|-------------------------------|
| URL du site               | `js/main.js`         | `CONFIG.siteUrl`              |
| Nom du site               | `js/main.js`         | `CONFIG.siteName`             |
| Couleur principale        | `css/style.css`      | `--color-primary`             |
| Articles par page         | `js/main.js`         | `CONFIG.perPage`              |
| Catégories & couleurs     | `js/main.js`         | `CATEGORIES`                  |
| Liens de navigation       | Tous les HTML        | `<nav class="site-nav">`      |

---

## 📊 SEO — Checklist

- [x] Balises `<meta name="description">` sur chaque page
- [x] Open Graph (Facebook, LinkedIn)
- [x] Twitter Cards
- [x] JSON-LD structuré (WebSite + Article)
- [x] `sitemap.xml`
- [x] `robots.txt`
- [x] Balises `lang="fr"` et `charset="UTF-8"`
- [x] Images avec attribut `alt`
- [x] Breadcrumb sur les pages article
- [x] URL canoniques
- [ ] Google Search Console → soumettre le sitemap
- [ ] Google Analytics → ajouter le tag
- [ ] Optimiser les images (WebP, < 100 Ko)
