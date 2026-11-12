#!/usr/bin/env node
/* Baut aus dem aktuellen Stand dieses Repositories eine getrennte Entwicklungs-Testseite.
   Aufruf:  node tools/build-dev-testseite.js <Zielordner> [Quellversion-Beschriftung]
   - Die Quelldateien (index.html, styles/, mitarbeiter.html) werden NICHT verändert; nur der Zielordner wird geschrieben.
   - Der Zielordner darf nicht innerhalb dieses Repositories liegen und darf nicht main/Live-Daten dieses Repositories enthalten.
   - Datentrennung: ein vorangestelltes Skript ersetzt localStorage/sessionStorage durch Wrapper mit dem Präfix "lagerpilot_devtest::".
     So berühren weder die Testseite /test/ (Präfix "lagerpilot_iphone_test::") noch die Hauptseite (ohne Präfix) die Daten dieser Seite und umgekehrt,
     obwohl alle Seiten unter derselben github.io-Adresse (gleicher Origin) laufen.
   Der Quellcode der Anwendung und ihre Speicherschlüssel bleiben unverändert (der Präfix wird nur in der gebauten Kopie vorgeschaltet). */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const PREFIX='lagerpilot_devtest::';
const root=path.resolve(__dirname,'..');
const out=process.argv[2]&&path.resolve(process.argv[2]);
if(!out){console.error('Bitte Zielordner angeben: node tools/build-dev-testseite.js <Zielordner>');process.exit(2)}
const rel=path.relative(root,out);
if(!rel.startsWith('..')&&!path.isAbsolute(rel)){console.error('Zielordner darf nicht innerhalb des Repositories liegen: '+out);process.exit(2)}
const git=a=>{try{return cp.execSync('git '+a,{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim()}catch{return ''}};
const sha=git('rev-parse --short HEAD')||'unbekannt',branch=git('rev-parse --abbrev-ref HEAD')||'unbekannt',dirty=git('status --porcelain -- index.html styles mitarbeiter.html')?' (lokale Änderungen)':'';
const label=process.argv[3]||('Stand '+branch+' @ '+sha+dirty);
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const wrapper='<script>/* ENTWICKLUNGSTEST: eigener Speicherbereich, getrennt von allen anderen LagerPilot-Seiten */'+
 '(function(){var P='+JSON.stringify(PREFIX)+';function w(s){return{getItem:function(k){return s.getItem(P+k)},setItem:function(k,v){return s.setItem(P+k,v)},removeItem:function(k){return s.removeItem(P+k)}}}'+
 'try{window.__lpRealLocalStorage=window.localStorage;window.__lpRealSessionStorage=window.sessionStorage}catch(e){}'+
 'try{globalThis.__lpDevLS=w(window.localStorage);globalThis.__lpDevSS=w(window.sessionStorage)}catch(e){}})();</script>'+
 '<script>const localStorage=window.__lpDevLS,sessionStorage=window.__lpDevSS;</script>';
if(!/<head>/.test(html)){console.error('index.html: <head> nicht gefunden');process.exit(3)}
html=html.replace('<head>','<head>'+wrapper);
if(!/<title>[^<]*<\/title>/.test(html)){console.error('index.html: <title> nicht gefunden');process.exit(3)}
html=html.replace(/<title>[^<]*<\/title>/,'<title>LagerPilot Entwicklungstest</title>');
const banner='<div id="devtestBanner" role="note" style="background:#fff5e8;color:#835010;border-bottom:2px solid #f0951f;padding:8px 14px;font-size:13px;font-weight:600">ENTWICKLUNGSTEST · '+esc(label)+' · eigener Browser-Speicher (<code>'+PREFIX+'</code>), getrennt von allen anderen LagerPilot-Seiten.</div>';
if(!html.includes('</header>')){console.error('index.html: </header> nicht gefunden');process.exit(3)}
html=html.replace('</header>','</header>'+banner);
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),html);
fs.cpSync(path.join(root,'styles'),path.join(out,'styles'),{recursive:true,filter:s=>!/README\.md$/.test(s)});
if(fs.existsSync(path.join(root,'mitarbeiter.html')))fs.copyFileSync(path.join(root,'mitarbeiter.html'),path.join(out,'mitarbeiter.html'));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({quelle:'scvj6p5h66-pixel/LagerPilot-Test',branch,commit:git('rev-parse HEAD'),beschriftung:label,speicherpraefix:PREFIX,gebaut:new Date().toISOString()},null,1)+'\n');
fs.writeFileSync(path.join(out,'README.md'),'# LagerPilot Entwicklungstest\n\nAutomatisch gebaute Kopie (nicht von Hand ändern). '+label+'\nBrowser-Speicher-Präfix: `'+PREFIX+'`. Siehe docs/ENTWICKLUNGSTESTSEITE.md im Quell-Repository.\n');
console.log('Gebaut: '+out+'  ('+label+')');
