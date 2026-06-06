# Generation pages statiques SEO - Dossiers Oui Psycho!
# Compatible PowerShell 5.1
# Usage : & "k:\Site\Oui Psycho\_gen_dossier.ps1"
$BASE = "https://ouipsycho.fr"
$DIR  = "k:\Site\Oui Psycho\dossiers"

function Get-FmtDate($d) {
    $mo = @("","janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre")
    try {
        $dt = [datetime]::ParseExact($d,"yyyy-MM-dd",$null)
        return "$($dt.Day) $($mo[$dt.Month]) $($dt.Year)"
    } catch { return $d }
}
function Get-CatColor($c) {
    if ($c -eq "Anxiete" -or $c -eq "Anxi" + [char]233 + "t" + [char]233) { return "#7C3AED" }
    if ($c -eq "D" + [char]233 + "pression")            { return "#1D4ED8" }
    if ($c -eq "Bien-" + [char]234 + "tre")             { return "#059669" }
    if ($c -eq "Relations")                             { return "#BE185D" }
    if ($c -eq "Stress")                                { return "#B45309" }
    if ($c -eq "Sommeil")                               { return "#0369A1" }
    if ($c -eq "Th" + [char]233 + "rapies")             { return "#6D28D9" }
    if ($c -eq "D" + [char]233 + "veloppement personnel"){ return "#15803D" }
    return "#555555"
}
function Get-CatBg($c) {
    if ($c -eq "Anxiete" -or $c -match "Anxi") { return "#F5F3FF" }
    if ($c -match "pression")                   { return "#EFF6FF" }
    if ($c -match "tre")                        { return "#ECFDF5" }
    if ($c -eq "Relations")                     { return "#FDF2F8" }
    if ($c -eq "Stress")                        { return "#FFFBEB" }
    if ($c -eq "Sommeil")                       { return "#ECFEFF" }
    if ($c -match "rapies")                     { return "#EDE9FE" }
    if ($c -match "veloppement")                { return "#F0FDF4" }
    return "#F5F5F5"
}

function EscJson($s) {
    $r = "$s" -replace '\\','\\' -replace '"','\"' -replace "`n",' '
    return $r
}

Get-ChildItem "$DIR\*.json" | Sort-Object Name | ForEach-Object {
    $raw = [System.IO.File]::ReadAllText($_.FullName,[System.Text.Encoding]::UTF8)
    $j   = $raw | ConvertFrom-Json

    if ($j.status -eq "draft") { Write-Host "SKIP (draft): $($j.id)"; return }
    $todayStr = (Get-Date).ToString("yyyy-MM-dd")
    if ($j.status -eq "scheduled" -and $j.date -gt $todayStr) {
        Write-Host "SKIP (not yet): $($j.id)"; return
    }

    # Date formatee
    if ($j.date_modified) { $dateRef = $j.date_modified } else { $dateRef = $j.date }
    $fd  = Get-FmtDate $dateRef
    $col = Get-CatColor $j.category
    $bg  = Get-CatBg   $j.category

    # ReadTime / chapterCount
    if ($j.readTime) { $rt = $j.readTime } else { $rt = 20 }
    if ($j.chapters) { $chCount = $j.chapters.Count } else { $chCount = 0 }

    # Subtitle
    if ($j.subtitle) {
        $subtitle = "<p style=`"font-size:1.15rem;color:var(--color-text-muted);margin-bottom:1rem;font-family:'Playfair Display',Georgia,serif;font-style:italic`">$($j.subtitle)</p>"
    } else { $subtitle = "" }

    # Image hero
    if ($j.image) {
        $imgHtml = "<div class=`"article-hero-image`"><img src=`"$($j.image)`" alt=`"$($j.title)`" loading=`"lazy`"></div>"
    } else { $imgHtml = "" }

    # Keypoints
    $kp = ""
    if ($j.keypoints -and $j.keypoints.Count -gt 0) {
        $li = ($j.keypoints | ForEach-Object { "          <li>$_</li>" }) -join "`n"
        $kp = "    <div class=`"article-keypoints`">`n      <div class=`"article-keypoints__title`">Ce que vous allez apprendre</div>`n      <ul>`n$li`n      </ul>`n    </div>`n"
    }

    # Intro
    $intro = ""
    if ($j.intro) { $intro = "    <div class=`"dossier-intro`">$($j.intro)</div>`n" }

    # Chapitres
    $chaps = ""
    if ($j.chapters) {
        foreach ($ch in $j.chapters) {
            $numPad = ([string]$ch.number).PadLeft(2,'0')
            $chaps += "    <section class=`"dossier-chapter article-body`" id=`"chapitre-$($ch.id)`">`n"
            $chaps += "      <div class=`"dossier-chapter__header`">`n"
            $chaps += "        <span class=`"dossier-chapter__num`">$numPad</span>`n"
            $chaps += "        <div class=`"dossier-chapter__title-block`">`n"
            $chaps += "          <div class=`"dossier-chapter__label`">Chapitre $($ch.number)</div>`n"
            $chaps += "          <h2 class=`"dossier-chapter__title`">$($ch.title)</h2>`n"
            $chaps += "        </div>`n      </div>`n"
            $chaps += "      $($ch.content)`n"
            $chaps += "    </section>`n"
        }
    }

    # Sources
    $sources = ""
    if ($j.sources -and $j.sources.Count -gt 0) {
        $srcli = ""
        foreach ($s in $j.sources) {
            if ($s.journal) { $jnl = ". $($s.journal)" } else { $jnl = "" }
            if ($s.url) { $lnk = " - <a href=`"$($s.url)`" target=`"_blank`" rel=`"noopener noreferrer`">Lien</a>" } else { $lnk = "" }
            $srcli += "          <li><cite>$($s.authors) ($($s.year)). $($s.title)$jnl.</cite>$lnk</li>`n"
        }
        $sources = "    <div class=`"dossier-sources`">`n      <div class=`"dossier-sources__title`">Sources et references</div>`n      <ol class=`"dossier-sources__list`">`n$srcli      </ol>`n    </div>`n"
    }

    # Tags
    $tg = ($j.tags | ForEach-Object { "<span class=`"tag`">#$_</span>" }) -join " "

    # TOC sidebar
    $tocItems = ""
    if ($j.chapters) {
        $pageUrl = "$BASE/dossiers/$($j.id)/"
        foreach ($ch in $j.chapters) {
            $tocItems += "          <a href=`"${pageUrl}#chapitre-$($ch.id)`" class=`"dossier-toc-item`"><span class=`"dossier-toc-item__num`">$($ch.number)</span><span>$($ch.title)</span></a>`n"
        }
    }

    # JSON-LD
    $jt = EscJson $j.title
    if ($j.metaDescription) { $jDesc = EscJson $j.metaDescription } else { $jDesc = EscJson $j.excerpt }
    if ($j.author) { $ja = EscJson $j.author } else { $ja = "La redaction Oui Psycho!" }
    $jk = EscJson (($j.tags -join ", "))
    if ($j.image) { $jImg = ",`"image`":`"$($j.image)`"" } else { $jImg = "" }
    if ($j.date_modified) { $dateMod = $j.date_modified } else { $dateMod = $j.date }
    $aLD = "{`"@context`":`"https://schema.org`",`"@type`":`"Article`",`"headline`":`"$jt`",`"description`":`"$jDesc`",`"datePublished`":`"$($j.date)`",`"dateModified`":`"$dateMod`",`"inLanguage`":`"fr`",`"author`":{`"@type`":`"Person`",`"name`":`"$ja`"},`"publisher`":{`"@type`":`"Organization`",`"name`":`"Oui Psycho!`",`"url`":`"$BASE/`",`"logo`":{`"@type`":`"ImageObject`",`"url`":`"$BASE/img/favicon.svg`"}},`"mainEntityOfPage`":{`"@type`":`"WebPage`",`"@id`":`"$BASE/dossiers/$($j.id)/`"},`"keywords`":`"$jk`",`"articleSection`":`"$($j.category)`"$jImg}"
    $bLD = "{`"@context`":`"https://schema.org`",`"@type`":`"BreadcrumbList`",`"itemListElement`":[{`"@type`":`"ListItem`",`"position`":1,`"name`":`"Accueil`",`"item`":`"$BASE/`"},{`"@type`":`"ListItem`",`"position`":2,`"name`":`"Dossiers`",`"item`":`"$BASE/dossiers.html`"},{`"@type`":`"ListItem`",`"position`":3,`"name`":`"$jt`",`"item`":`"$BASE/dossiers/$($j.id)/`"}]}"

    # Metadesc
    if ($j.metaDescription) { $mDesc = $j.metaDescription } else { $mDesc = $j.excerpt }

    $html  = "<!DOCTYPE html>`n<html lang=`"fr`">`n<head>`n"
    $html += "  <meta charset=`"UTF-8`">`n"
    $html += "  <meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">`n"
    $html += "  <title>$($j.title) -- Dossier -- Oui Psycho!</title>`n"
    $html += "  <meta name=`"description`" content=`"$mDesc`">`n"
    $html += "  <meta name=`"author`" content=`"$($j.author)`">`n"
    $html += "  <meta name=`"robots`" content=`"index, follow`">`n"
    $html += "  <meta name=`"theme-color`" content=`"#1F4E6B`">`n"
    $html += "  <base href=`"../../`">`n"
    $html += "  <link rel=`"canonical`" href=`"$BASE/dossiers/$($j.id)/`">`n"
    $html += "  <meta property=`"og:type`"        content=`"article`">`n"
    $html += "  <meta property=`"og:title`"       content=`"$($j.title) -- Dossier -- Oui Psycho!`">`n"
    $html += "  <meta property=`"og:description`" content=`"$mDesc`">`n"
    $html += "  <meta property=`"og:url`"         content=`"$BASE/dossiers/$($j.id)/`">`n"
    $html += "  <meta property=`"og:locale`"      content=`"fr_FR`">`n"
    $html += "  <meta property=`"og:site_name`"   content=`"Oui Psycho!`">`n"
    if ($j.image) { $html += "  <meta property=`"og:image`" content=`"$($j.image)`">`n" }
    $html += "  <meta name=`"twitter:card`"       content=`"summary_large_image`">`n"
    $html += "  <script type=`"application/ld+json`">$aLD</script>`n"
    $html += "  <script type=`"application/ld+json`">$bLD</script>`n"
    $html += "  <link rel=`"icon`" type=`"image/png`" href=`"img/logo-brain.png`">`n"
    $html += "  <link rel=`"preconnect`" href=`"https://fonts.googleapis.com`">`n"
    $html += "  <link rel=`"preconnect`" href=`"https://fonts.gstatic.com`" crossorigin>`n"
    $html += "  <link rel=`"stylesheet`" href=`"css/style.css`">`n"
    $html += "  <script>`n"
    $html += "    window.dataLayer = window.dataLayer || [];`n"
    $html += "    function gtag(){dataLayer.push(arguments);}`n"
    $html += "    var _pc = (function(){ try { return localStorage.getItem('pc_consent'); } catch(e){ return null; } })();`n"
    $html += "    if (_pc === '1') { gtag('consent','default',{'analytics_storage':'granted','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied'}); }`n"
    $html += "    else { gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','wait_for_update':2000}); }`n"
    $html += "    gtag('set','url_passthrough',true); gtag('set','ads_data_redaction',true);`n"
    $html += "  </script>`n"
    $html += "  <script async src=`"https://www.googletagmanager.com/gtag/js?id=G-NR52DCZ6ZJ`"></script>`n"
    $html += "  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-NR52DCZ6ZJ');</script>`n"
    $html += "</head>`n<body>`n`n"
    $html += "  <div id=`"reading-progress`" role=`"progressbar`" aria-valuenow=`"0`" aria-valuemin=`"0`" aria-valuemax=`"100`"></div>`n"
    $html += "  <header class=`"site-header`" id=`"site-header`">`n"
    $html += "    <div class=`"header-top`">`n"
    $html += "      <a href=`"index.html`" class=`"logo`"><img src=`"img/logo-brain.png`" alt=`"`" class=`"logo__img`" width=`"40`" height=`"40`"><span>Oui Psycho!</span></a>`n"
    $html += "      <button class=`"hamburger`" id=`"hamburger`" aria-label=`"Menu`" aria-expanded=`"false`" aria-controls=`"nav-menu`"><span></span><span></span><span></span></button>`n"
    $html += "      <nav class=`"header-nav`" id=`"nav-menu`">`n"
    $html += "        <a class=`"nav__link`" href=`"index.html`">Accueil</a>`n"
    $html += "        <a class=`"nav__link nav__link--active`" href=`"dossiers.html`">Dossiers</a>`n"
    $html += "        <a class=`"nav__link`" href=`"a-propos.html`">A propos</a>`n"
    $html += "        <a class=`"nav__link`" href=`"contact.html`">Contact</a>`n"
    $html += "        <a class=`"nav__link nav__cta`" href=`"index.html#newsletter-widget`">Newsletter</a>`n"
    $html += "      </nav>`n    </div>`n  </header>`n`n"
    $html += "  <div class=`"container layout article-page`">`n    <main>`n"
    $html += "      <article id=`"dossier-content`" data-static=`"true`" data-id=`"$($j.id)`">`n"
    $html += "        <header class=`"article-header`">`n"
    $html += "          <nav class=`"breadcrumb`"><a href=`"index.html`">Accueil</a> <span>&#x203A;</span> <a href=`"dossiers.html`">Dossiers</a> <span>&#x203A;</span> <span>$($j.title)</span></nav>`n"
    $html += "          <span class=`"dossier-badge`">Dossier</span>`n"
    $html += "          <span class=`"badge`" style=`"color:$col;background:$bg`">$($j.category)</span>`n"
    $html += "          <h1>$($j.title)</h1>`n"
    $html += "          $subtitle`n"
    $html += "          <div class=`"article-meta`">`n"
    $html += "            <span>Par <strong>$($j.author)</strong></span>`n"
    $html += "            <span class=`"article-meta-dot`">&#x2022;</span>`n"
    $html += "            <time datetime=`"$dateRef`">$fd</time>`n"
    $html += "            <span class=`"article-meta-dot`">&#x2022;</span>`n"
    $html += "            <span>$rt min de lecture</span>`n"
    $html += "            <span class=`"article-meta-dot`">&#x2022;</span>`n"
    $html += "            <span>$chCount chapitres</span>`n"
    $html += "          </div>`n"
    $html += "          <div class=`"share-top`" id=`"share-top`"><button class=`"share-icon-btn share-icon-btn--fb`" data-platform=`"facebook`" title=`"Facebook`" aria-label=`"Facebook`"><svg viewBox=`"0 0 24 24`" width=`"18`" height=`"18`" fill=`"white`"><path d=`"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z`"/></svg></button><button class=`"share-icon-btn share-icon-btn--tw`" data-platform=`"twitter`" title=`"X`" aria-label=`"X`"><svg viewBox=`"0 0 24 24`" width=`"17`" height=`"17`" fill=`"white`"><path d=`"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z`"/></svg></button><button class=`"share-icon-btn share-icon-btn--copy`" data-platform=`"copy`" title=`"Copier`" aria-label=`"Copier`"><svg viewBox=`"0 0 24 24`" width=`"18`" height=`"18`" fill=`"none`" stroke=`"white`" stroke-width=`"2.2`" stroke-linecap=`"round`"><path d=`"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71`"/><path d=`"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71`"/></svg></button></div>`n"
    $html += "          $imgHtml`n"
    $html += "        </header>`n"
    $html += "$kp"
    $html += "$intro"
    $html += "$chaps"
    $html += "$sources"
    $html += "        <div class=`"article-author`"><div class=`"article-author__avatar`">&#x270D;</div><div><div class=`"article-author__name`">$($j.author)</div><div class=`"article-author__role`">Redacteur specialise en sante mentale</div></div></div>`n"
    $html += "        <div class=`"article-tags`">$tg</div>`n"
    $html += "        <div class=`"article-share`" id=`"share-buttons`"><span class=`"share-label`">Partager :</span><button class=`"share-btn share-btn--fb`" data-platform=`"facebook`">Facebook</button><button class=`"share-btn share-btn--tw`" data-platform=`"twitter`">Twitter / X</button><button class=`"share-btn share-btn--wa`" data-platform=`"whatsapp`">WhatsApp</button><button class=`"share-btn share-btn--copy`" data-platform=`"copy`">Copier le lien</button></div>`n"
    $html += "        <aside class=`"article-disclaimer`">Ce dossier est fourni a titre informatif uniquement. En cas de detresse, appelez le 3114 (24h/24, gratuit).</aside>`n"
    $html += "      </article>`n    </main>`n"
    $html += "    <aside>`n"
    $html += "      <div class=`"widget`" id=`"dossier-toc-widget`"><h3 class=`"widget__title`">Au sommaire</h3><nav class=`"dossier-toc-list`">$tocItems</nav></div>`n"
    $html += "      <div class=`"widget`" id=`"related-articles`"><h3 class=`"widget__title`">A lire aussi</h3></div>`n"
    $html += "      <div class=`"widget`" id=`"popular-widget`" style=`"display:none`"><h2 class=`"widget__title`">Les plus lus</h2><div class=`"popular-list`" id=`"popular-list`"></div></div>`n"
    $html += "      <div class=`"widget widget--accent`"><h2 class=`"widget__title`">Newsletter</h2><div class=`"newsletter-form`" id=`"nl-form`"><p>Un article par semaine pour votre sante mentale.</p><input type=`"email`" id=`"nl-$($j.id)`" class=`"newsletter-input`" placeholder=`"votre@email.fr`"><button class=`"btn-newsletter`" type=`"button`">S'abonner</button><p id=`"nl-msg`" style=`"display:none`"></p></div></div>`n"
    $html += "    </aside>`n  </div>`n"
    $html += "  <footer class=`"site-footer`"><div class=`"container`"><div class=`"footer-disclaimer`">Ce site est fourni a titre informatif. En cas de detresse, appelez le 3114.</div><div class=`"footer-grid`"><div class=`"footer-brand`"><a href=`"index.html`" class=`"logo`"><img src=`"img/logo-brain.png`" alt=`"`" class=`"logo__img`" width=`"36`" height=`"36`"><span>Oui Psycho!</span></a><p>Blog de vulgarisation dedie a la sante mentale.</p></div><div class=`"footer-col`"><h4>Thematiques</h4><ul class=`"footer-links`"><li><a href=`"index.html?cat=Anxi%C3%A9t%C3%A9`">Anxiete</a></li><li><a href=`"index.html?cat=D%C3%A9pression`">Depression</a></li><li><a href=`"index.html?cat=Sommeil`">Sommeil</a></li><li><a href=`"index.html?cat=Th%C3%A9rapies`">Therapies</a></li></ul></div><div class=`"footer-col`"><h4>A propos</h4><ul class=`"footer-links`"><li><a href=`"a-propos.html`">Qui sommes-nous ?</a></li><li><a href=`"contact.html`">Contact</a></li><li><a href=`"politique-de-confidentialite.html`">Confidentialite</a></li></ul></div></div><div class=`"footer-bottom`"><span>2026 Oui Psycho!.</span></div></div></footer>`n"
    $html += "  <div id=`"cookie-banner`"><p class=`"cookie-text`">Nous utilisons des cookies. <a href=`"politique-de-confidentialite.html`">En savoir plus</a>.</p><div class=`"cookie-buttons`"><button class=`"btn-cookie btn-cookie--accept`" id=`"cookie-accept`">Accepter</button><button class=`"btn-cookie btn-cookie--decline`" id=`"cookie-decline`">Refuser</button></div></div>`n"
    $html += "  <script src=`"js/main.js`"></script>`n</body>`n</html>`n"

    $outDir  = "$DIR\$($j.id)"
    $outFile = "$outDir\index.html"
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
    [System.IO.File]::WriteAllText($outFile, $html, [System.Text.Encoding]::UTF8)
    Write-Host "OK: dossiers/$($j.id)/index.html"
}
Write-Host "`nDone."
