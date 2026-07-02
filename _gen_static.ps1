# Generation pages statiques SEO - Oui Psycho!
$BASE = "https://ouipsycho.fr"
$DIR  = "k:\Site\Oui Psycho\articles"

function Get-FmtDate($d) {
    $mo = @("","janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre")
    $dt = [datetime]::ParseExact($d,"yyyy-MM-dd",$null)
    return "$($dt.Day) $($mo[$dt.Month]) $($dt.Year)"
}

function Get-CatColor($c) {
    if ($c -eq "Anxiété")                 { return "#7C3AED" }
    if ($c -eq "Dépression")              { return "#1D4ED8" }
    if ($c -eq "Bien-être")               { return "#059669" }
    if ($c -eq "Relations")               { return "#BE185D" }
    if ($c -eq "Stress")                  { return "#B45309" }
    if ($c -eq "Sommeil")                 { return "#0369A1" }
    if ($c -eq "Thérapies")               { return "#6D28D9" }
    if ($c -eq "Développement personnel") { return "#15803D" }
    return "#555"
}
function Get-CatBg($c) {
    if ($c -eq "Anxiété")                 { return "#F5F3FF" }
    if ($c -eq "Dépression")              { return "#EFF6FF" }
    if ($c -eq "Bien-être")               { return "#ECFDF5" }
    if ($c -eq "Relations")               { return "#FDF2F8" }
    if ($c -eq "Stress")                  { return "#FFFBEB" }
    if ($c -eq "Sommeil")                 { return "#ECFEFF" }
    if ($c -eq "Thérapies")               { return "#EDE9FE" }
    if ($c -eq "Développement personnel") { return "#F0FDF4" }
    return "#f5f5f5"
}
function Get-CatEnc($c) {
    if ($c -eq "Anxiété")                 { return "Anxi%C3%A9t%C3%A9" }
    if ($c -eq "Dépression")              { return "D%C3%A9pression" }
    if ($c -eq "Bien-être")               { return "Bien-%C3%AAtre" }
    if ($c -eq "Relations")               { return "Relations" }
    if ($c -eq "Stress")                  { return "Stress" }
    if ($c -eq "Sommeil")                 { return "Sommeil" }
    if ($c -eq "Thérapies")               { return "Th%C3%A9rapies" }
    if ($c -eq "Développement personnel") { return "D%C3%A9veloppement%20personnel" }
    return [uri]::EscapeDataString($c)
}

$NAV = @("Anxiété","Dépression","Bien-être","Stress","Sommeil","Thérapies","Relations")

Get-ChildItem "$DIR\*.json" | Sort-Object Name | ForEach-Object {
    $raw = [System.IO.File]::ReadAllText($_.FullName,[System.Text.Encoding]::UTF8)
    $j   = $raw | ConvertFrom-Json
    $fd  = Get-FmtDate $j.date
    $col = Get-CatColor $j.category
    $bg  = Get-CatBg    $j.category
    $enc = Get-CatEnc   $j.category

    # Keypoints
    $kp = ""
    if ($j.keypoints -and $j.keypoints.Count -gt 0) {
        $li = ($j.keypoints | ForEach-Object { "        <li>$_</li>" }) -join "`n"
        $kp = "    <div class=`"article-keypoints`">`n      <div class=`"article-keypoints__title`">&#128161; Points clés de cet article</div>`n      <ul>`n$li`n      </ul>`n    </div>`n"
    }

    # Tags
    $tg = ($j.tags | ForEach-Object { "<span class=`"tag`">#$_</span>" }) -join " "

    # Nav
    $navHtml = ($NAV | ForEach-Object {
        $cls = if ($_ -eq $j.category) { "cat-nav__btn active" } else { "cat-nav__btn" }
        $ne  = Get-CatEnc $_
        "        <a class=`"$cls`" href=`"index.html?cat=$ne`">$_</a>"
    }) -join "`n"

    # JSON-LD
    $jt = $j.title  -replace '\\','\\' -replace '"','\"'
    $jd = $j.metaDescription -replace '\\','\\' -replace '"','\"'
    $ja = $j.author -replace '\\','\\' -replace '"','\"'
    $jk = ($j.tags -join ", ") -replace '"','\"'
    $aLD = "{`"@context`":`"https://schema.org`",`"@type`":`"Article`",`"headline`":`"$jt`",`"description`":`"$jd`",`"datePublished`":`"$($j.date)`",`"dateModified`":`"$(if ($j.date_modified) { $j.date_modified } else { $j.date })`",`"inLanguage`":`"fr`",`"author`":{`"@type`":`"Person`",`"name`":`"$ja`"},`"publisher`":{`"@type`":`"Organization`",`"name`":`"Oui Psycho!`",`"url`":`"$BASE/`"},`"mainEntityOfPage`":{`"@type`":`"WebPage`",`"@id`":`"$BASE/articles/$($j.id)/`"},`"keywords`":`"$jk`",`"articleSection`":`"$($j.category)`"}"
    $bLD = "{`"@context`":`"https://schema.org`",`"@type`":`"BreadcrumbList`",`"itemListElement`":[{`"@type`":`"ListItem`",`"position`":1,`"name`":`"Accueil`",`"item`":`"$BASE/`"},{`"@type`":`"ListItem`",`"position`":2,`"name`":`"$($j.category)`",`"item`":`"$BASE/index.html?cat=$enc`"},{`"@type`":`"ListItem`",`"position`":3,`"name`":`"$jt`",`"item`":`"$BASE/articles/$($j.id)/`"}]}"

    $html  = "<!DOCTYPE html>`n<html lang=`"fr`">`n<head>`n"
    $html += "  <meta charset=`"UTF-8`">`n"
    $html += "  <meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">`n"
    $html += "  <title>$($j.title) — Oui Psycho!</title>`n"
    $html += "  <meta name=`"description`" content=`"$($j.metaDescription)`">`n"
    $html += "  <meta name=`"author`" content=`"$($j.author)`">`n"
    $html += "  <meta name=`"robots`" content=`"index, follow`">`n"
    $html += "  <base href=`"../`">`n"
    $html += "  <link rel=`"canonical`" href=`"$BASE/articles/$($j.id)/`">`n"
    $html += "  <meta property=`"og:type`" content=`"article`">`n"
    $html += "  <meta property=`"og:title`" content=`"$($j.title) — Oui Psycho!`">`n"
    $html += "  <meta property=`"og:description`" content=`"$($j.metaDescription)`">`n"
    $html += "  <meta property=`"og:url`" content=`"$BASE/articles/$($j.id)/`">`n"
    $html += "  <meta property=`"og:locale`" content=`"fr_FR`">`n"
    $html += "  <meta property=`"og:site_name`" content=`"Oui Psycho!`">`n"
    $html += "  <meta name=`"twitter:card`" content=`"summary_large_image`">`n"
    $html += "  <script type=`"application/ld+json`">$aLD</script>`n"
    $html += "  <script type=`"application/ld+json`">$bLD</script>`n"
    $html += "  <link rel=`"icon`" type=`"image/svg+xml`" href=`"img/favicon.svg`">`n"
    $html += "  <link rel=`"stylesheet`" href=`"css/style.css`">`n"
    $html += "</head>`n<body>`n`n"
    $html += "  <div id=`"reading-progress`" role=`"progressbar`" aria-label=`"Progression de lecture`" aria-valuenow=`"0`" aria-valuemin=`"0`" aria-valuemax=`"100`"></div>`n`n"
    $html += "  <header class=`"site-header`" id=`"site-header`">`n"
    $html += "    <div class=`"header-top`">`n"
    $html += "      <a href=`"index.html`" class=`"logo`" aria-label=`"Oui Psycho! — Accueil`">`n"
    $html += "        <span class=`"logo__icon`" aria-hidden=`"true`">🧠</span>`n"
    $html += "        <span>Oui Psycho!</span>`n"
    $html += "      </a>`n"
    $html += "      <button class=`"hamburger`" id=`"hamburger`" aria-label=`"Menu`" aria-expanded=`"false`" aria-controls=`"nav-menu`">`n"
    $html += "        <span></span><span></span><span></span>`n"
    $html += "      </button>`n"
    $html += "      <nav class=`"header-nav`" id=`"nav-menu`" aria-label=`"Navigation principale`">`n"
    $html += "        <a class=`"nav__link`" href=`"index.html`">Accueil</a>`n"
    $html += "        <a class=`"nav__link`" href=`"a-propos.html`">À propos</a>`n"
    $html += "        <a class=`"nav__link`" href=`"contact.html`">Contact</a>`n"
    $html += "        <a class=`"nav__link nav__cta`" href=`"index.html#newsletter-widget`">Newsletter</a>`n"
    $html += "      </nav>`n    </div>`n"
    $html += "    <nav class=`"cat-nav`" aria-label=`"Catégories`">`n"
    $html += "      <div class=`"cat-nav__inner`">`n"
    $html += "        <a class=`"cat-nav__btn`" href=`"index.html`">← Tous les articles</a>`n"
    $html += "        <div class=`"cat-nav__divider`" aria-hidden=`"true`"></div>`n"
    $html += "$navHtml`n"
    $html += "      </div>`n    </nav>`n  </header>`n`n"
    $html += "  <div class=`"container layout article-page`">`n    <main>`n"
    $html += "      <article id=`"article-content`" data-static=`"true`" data-id=`"$($j.id)`">`n"
    $html += "        <header class=`"article-header`">`n"
    $html += "          <nav class=`"breadcrumb`" aria-label=`"Fil d'Ariane`">`n"
    $html += "            <a href=`"index.html`">Accueil</a> <span>›</span>`n"
    $html += "            <a href=`"index.html?cat=$enc`">$($j.category)</a>`n"
    $html += "            <span>›</span> <span aria-current=`"page`">$($j.title)</span>`n"
    $html += "          </nav>`n"
    $html += "          <span class=`"badge badge--large`" style=`"color:$col;background:$bg`">$($j.category)</span>`n"
    $html += "          <h1>$($j.title)</h1>`n"
    $html += "          <div class=`"article-meta`">`n"
    $html += "            <span>Par <strong>$($j.author)</strong></span>`n"
    $html += "            <span class=`"article-meta-dot`">•</span>`n"
    $html += "            <time datetime=`"$($j.date)`">$fd</time>`n"
    $html += "            <span class=`"article-meta-dot`">•</span>`n"
    $html += "            <span>⏱ $($j.readTime) min de lecture</span>`n"
    $html += "          </div>`n        </header>`n`n"
    $html += "        <aside class=`"article-disclaimer`" role=`"note`">`n"
    $html += "          ⚕️ <em>Cet article est fourni à titre <strong>informatif uniquement</strong> et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le <strong><a href=`"tel:3114`">3114</a></strong> (24h/24, gratuit).</em>`n"
    $html += "        </aside>`n`n"
    if ($kp) { $html += "$kp`n" }
    $html += "        <div class=`"article-body`">`n"
    $html += "          $($j.content)`n"
    $html += "        </div>`n`n"
    $html += "        <div class=`"article-author`">`n"
    $html += "          <div class=`"article-author__avatar`" aria-hidden=`"true`">✍️</div>`n"
    $html += "          <div>`n"
    $html += "            <div class=`"article-author__name`">$($j.author)</div>`n"
    $html += "            <div class=`"article-author__role`">Rédacteur spécialisé en santé mentale</div>`n"
    $html += "          </div>`n        </div>`n`n"
    $html += "        <div class=`"article-tags`" aria-label=`"Mots-clés`">$tg</div>`n`n"
    $html += "        <div class=`"article-share`" id=`"share-buttons`" aria-label=`"Partager cet article`">`n"
    $html += "          <span class=`"share-label`">Partager :</span>`n"
    $html += "          <button class=`"share-btn share-btn--fb`"   data-platform=`"facebook`">Facebook</button>`n"
    $html += "          <button class=`"share-btn share-btn--tw`"   data-platform=`"twitter`">Twitter / X</button>`n"
    $html += "          <button class=`"share-btn share-btn--wa`"   data-platform=`"whatsapp`">WhatsApp</button>`n"
    $html += "          <button class=`"share-btn share-btn--copy`" data-platform=`"copy`">Copier le lien</button>`n"
    $html += "        </div>`n      </article>`n    </main>`n`n"
    $html += "    <aside id=`"article-sidebar`" aria-label=`"Informations complémentaires`">`n"
    $html += "      <div class=`"widget`" id=`"toc`"><h2 class=`"widget__title`">Table des matières</h2></div>`n"
    $html += "      <div class=`"widget`" id=`"related-articles`"><h2 class=`"widget__title`">À lire aussi</h2></div>`n"
    $html += "      <div class=`"widget widget--accent`">`n"
    $html += "        <h2 class=`"widget__title`">Newsletter</h2>`n"
    $html += "        <div class=`"newsletter-form`">`n"
    $html += "          <p>Un article par semaine pour prendre soin de votre santé mentale.</p>`n"
    $html += "          <label for=`"nl-$($j.id)`" class=`"sr-only`">Votre e-mail</label>`n"
    $html += "          <input type=`"email`" id=`"nl-$($j.id)`" class=`"newsletter-input`" placeholder=`"votre@email.fr`">`n"
    $html += "          <button class=`"btn-newsletter`" type=`"button`">S'abonner ✓</button>`n"
    $html += "        </div>`n      </div>`n    </aside>`n  </div>`n`n"
    $html += "  <footer class=`"site-footer`">`n    <div class=`"container`">`n"
    $html += "      <div class=`"footer-disclaimer`">`n"
    $html += "        ⚕️ <strong>Avertissement :</strong> Le contenu de ce site est fourni à titre informatif uniquement et ne remplace pas l'avis d'un professionnel de santé. En cas de détresse, appelez le <strong>3114</strong> (24h/24, gratuit).`n"
    $html += "      </div>`n      <div class=`"footer-grid`">`n"
    $html += "        <div class=`"footer-brand`">`n"
    $html += "          <a href=`"index.html`" class=`"logo`"><span class=`"logo__icon`" aria-hidden=`"true`">🧠</span><span>Oui Psycho!</span></a>`n"
    $html += "          <p>Blog de vulgarisation dédié à la santé mentale.</p>`n"
    $html += "        </div>`n"
    $html += "        <div class=`"footer-col`"><h4>Thématiques</h4><ul class=`"footer-links`">`n"
    $html += "          <li><a href=`"index.html?cat=Anxi%C3%A9t%C3%A9`">Anxiété</a></li>`n"
    $html += "          <li><a href=`"index.html?cat=D%C3%A9pression`">Dépression</a></li>`n"
    $html += "          <li><a href=`"index.html?cat=Bien-%C3%AAtre`">Bien-être</a></li>`n"
    $html += "          <li><a href=`"index.html?cat=Stress`">Stress</a></li>`n"
    $html += "          <li><a href=`"index.html?cat=Sommeil`">Sommeil</a></li>`n"
    $html += "          <li><a href=`"index.html?cat=Th%C3%A9rapies`">Thérapies</a></li>`n"
    $html += "        </ul></div>`n"
    $html += "        <div class=`"footer-col`"><h4>À propos</h4><ul class=`"footer-links`">`n"
    $html += "          <li><a href=`"a-propos.html`">Qui sommes-nous ?</a></li>`n"
    $html += "          <li><a href=`"contact.html`">Contact</a></li>`n"
    $html += "          <li><a href=`"politique-de-confidentialite.html`">Confidentialité</a></li>`n"
    $html += "          <li><a href=`"mentions-legales.html`">Mentions légales</a></li>`n"
    $html += "        </ul></div>`n"
    $html += "      </div>`n"
    $html += "      <div class=`"footer-bottom`">`n"
    $html += "        <span>© <script>document.write(new Date().getFullYear())</script> Oui Psycho!. Tous droits réservés.</span>`n"
    $html += "        <span>Fait avec ❤️ pour la santé mentale</span>`n"
    $html += "      </div>`n    </div>`n  </footer>`n`n"
    $html += "  <div id=`"cookie-banner`" role=`"dialog`" aria-label=`"Cookies`">`n"
    $html += "    <p class=`"cookie-text`">🍪 Nous utilisons des cookies pour améliorer votre expérience. <a href=`"politique-de-confidentialite.html`">En savoir plus</a>.</p>`n"
    $html += "    <div class=`"cookie-buttons`">`n"
    $html += "      <button class=`"btn-cookie btn-cookie--accept`" id=`"cookie-accept`">Accepter</button>`n"
    $html += "      <button class=`"btn-cookie btn-cookie--decline`" id=`"cookie-decline`">Refuser</button>`n"
    $html += "    </div>`n  </div>`n`n"
    $html += "  <script src=`"js/main.js`"></script>`n</body>`n</html>`n"

    $out = "$DIR\$($j.id).html"
    [System.IO.File]::WriteAllText($out, $html, [System.Text.Encoding]::UTF8)
    Write-Host "OK: $($j.id).html"
}
Write-Host "Done - 15 pages generees."
