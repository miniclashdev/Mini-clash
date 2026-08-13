// ============================================================
//  unites.js — TOUT CE QUI CONCERNE LES UNITÉS
// ============================================================
//  Ce fichier regroupe : la liste des cartes et leur prix, les raretés,
//  les statistiques de base, la classe Unit (déplacement, combat, dessin),
//  les dégâts contre les bâtiments, les invocations, et les fiches
//  descriptives affichées dans la forge et les coffres.
//
//  Il est chargé AVANT le script principal d'index.html, car celui-ci
//  a besoin de allUnits dès son démarrage.
//
//  Les variables du jeu (ctx, unitsArr, towers, projectiles, gold...)
//  sont déclarées dans index.html : elles n'existent qu'au moment où
//  la partie tourne, ce qui suffit puisque ce fichier ne fait que
//  DÉFINIR des choses, sans rien exécuter au chargement.
// ============================================================

// Version du fichier. Elle s'affiche dans le menu : si le numéro affiché
// ne correspond pas à celui-ci, le navigateur sert encore une ancienne
// copie en cache et il faut vider le cache ou changer le ?v= de l'index.
const VERSION_UNITES = 'lezard-v4';

// ---------- LES CARTES : nom, prix, rareté, déblocage ----------
const allUnits={
knight:{name:'⚔️',cost:3},archer:{name:'🏹',cost:4},giant:{name:'🗿',cost:7},
dragon:{name:'🐉',cost:10},guardian:{name:'🛡️',cost:4},healer:{name:'💉',cost:5},
ninja:{name:'🥷',cost:4},kamikaze:{name:'💣',cost:4},cavalier:{name:'🏇',cost:6}
};
allUnits.mage={name:'⚡',cost:6};
allUnits.trebuchet={name:'🪨',cost:10};
allUnits.electromancer={name:'⚡',cost:7};
allUnits.cryomancer={name:'❄️',cost:7};
allUnits.pyromancer={name:'🔥',cost:8};
allUnits.mole={name:'🪱',cost:16,rarity:'Légendaire'};
allUnits.necromancer={name:'💀',cost:8};
allUnits.bannerman={name:'🚩',cost:6};
// --- Cartes de la Nuit des Morts (exclusives à l'événement) ---
allUnits.skeletonCard={name:'🦴',cost:3};
allUnits.hauntedCarriage={name:'🎠',cost:10};
allUnits.skeletonGeneral={name:'⚔️',cost:13};
allUnits.lizard={name:'🦎',cost:7};
// Le squelette n'est jamais achetable : il n'existe que relevé par le
// nécromancien, il n'apparaît donc pas dans allUnits.
// Le niveau de départ de chaque carte est fixé dans index.html, une fois
// que la variable 'levels' existe : ce fichier ne fait que DÉFINIR.

// ---- DEUX LISTES CENTRALES ----
// Avant, la même liste d'unités était recopiée à quatre endroits : ajouter
// une unité en oubliant un seul de ces endroits créait un bug silencieux
// (unité jouable sans l'avoir débloquée, ou niveaux offerts gratuitement).
// Tout passe désormais par ces deux constantes.

// 1) Toutes les unités qu'il faut débloquer avant de pouvoir les jouer.
const UNITES_A_DEBLOQUER = ['mage','trebuchet','electromancer','cryomancer',
  'pyromancer','mole','cavalier','necromancer','bannerman','lizard',
  'skeletonCard','skeletonGeneral','hauntedCarriage'];

// 2) Celles qu'on peut obtenir dans les coffres NORMAUX. Les cartes de la
// Nuit des Morts en sont exclues : elles restent exclusives à l'événement.
const UNITES_COFFRE_NORMAL = ['mage','trebuchet','electromancer','cryomancer',
  'pyromancer','mole','cavalier','necromancer','bannerman','lizard'];
const rarities={
 knight:['⚪','Commun'],archer:['⚪','Commun'],guardian:['⚪','Commun'],
 healer:['⚪','Commun'],ninja:['⚪','Commun'],kamikaze:['⚪','Commun'],
 mage:['🔵','Rare'],
 cryomancer:['🟣','Épique'],pyromancer:['🟣','Épique'],
 electromancer:['🟣','Épique'],dragon:['🟣','Épique'],lizard:['🟣','Épique'],
 mole:['🟠','Légendaire'],giant:['🟣','Épique'],cavalier:['🔵','Rare'],
 necromancer:['🟣','Épique'],bannerman:['🔵','Rare'],
 skeletonCard:['🔵','Rare'],
 skeletonGeneral:['🟠','Légendaire'],
 // MYTHIQUE : le cran au-dessus d'Épique, juste sous Légendaire.
 // Réservé aux cartes chères qui changent une partie à elles seules.
 trebuchet:['🔴','Mythique'], hauntedCarriage:['🔴','Mythique']
};

// ---------- RÈGLES DU LÉZARD À CASQUE ----------
const LANGUE_PORTEE   = 265;   // jusqu'où la langue va chercher
// Le déroulé durait 14 images (un quart de seconde) quelle que soit la
// distance : on ne voyait rien partir. Il est maintenant PROPORTIONNEL à
// la distance, avec un minimum, pour qu'on suive la langue des yeux.
const LANGUE_ALLER_MIN= 20;
const LANGUE_VITESSE  = 7.5;   // pixels parcourus par image à l'aller
const LANGUE_TRACTION = 2.2;   // vitesse à laquelle la proie est ramenée
const LANGUE_RECHARGE = 26;    // repos entre deux harponnages
const LANGUE_POIDS_MAX= 420;   // au-delà, la cible est trop lourde
const DEGATS_POINTE   = 34;    // dégâts de l'empalement sur le casque
const GRIFFES_DUREE   = 60;    // durée de la série de coups de griffes
// Distance à laquelle il se tient pour harponner : assez loin pour qu'on
// voie la langue traverser, assez près pour rester menaçant.
const DISTANCE_TIR    = 150;
// Trop massifs pour être tractés, quels que soient leurs PV du moment.
const TROP_LOURDS = ['mole','giant','trebuchet','hauntedCarriage',
                     'skeletonGeneral'];

// ---------- RÈGLES DU TRÉBUCHET ----------
// --- Réglages du TRÉBUCHET ---
// Numéro unique attribué à chaque trébuchet, pour que son servant
// reconnaisse sa propre machine.
let compteurTrebuchet=0;

// Qui a le droit de pousser.
// Les sorciers ne lâchent pas leur bâton pour pousser du bois, le général
// ne s'abaisse pas à ça, le cavalier ne descend pas de sa monture, et la
// calèche comme le géant ne s'arrêtent jamais pour qui que ce soit.
const INTERDITS_POUSSEE = ['trebuchet','hauntedCarriage','giant','dragon',
  'richSkeleton','boneGuard','skeletonGeneral','cavalier',
  'mage','electromancer','cryomancer','pyromancer','necromancer','healer'];
const PEUT_POUSSER = t => !INTERDITS_POUSSEE.includes(t);

// Combien de place chacun prend derrière la machine. Il n'y a que 4 places :
// un colosse en occupe deux à lui seul, donc moins de monde peut s'atteler.
const PLACES_TOTAL = 4;
const PLACE_PRISE = {
  guardian:2, skeletonGeneral:2, bannerman:2, mole:2,
  knight:1, ninja:1, archer:1, kamikaze:1, siegeman:1,
  skeleton:1, skeletonCard:1
};
const placeDe = t => PLACE_PRISE[t] || 1;

const TREBUCHET_ZONE=78;          // rayon touché autour du point d'impact
const TREBUCHET_SECONDAIRE=0.55;  // part des dégâts pour les voisins
const TREBUCHET_RECUL=9;          // recul infligé par le choc

// ---------- FAMILLE SQUELETTE ET INVOCATIONS ----------
const FAMILLE_SQUELETTE=['skeleton','skeletonCard','richSkeleton','boneGuard'];
function estSquelette(u){ return FAMILLE_SQUELETTE.includes(u.type); }

// Un Général vivant est-il présent sur le terrain ? Volontairement SANS
// distinction de camp : le Général renforce les squelettes des deux côtés,
// les siens comme ceux de l'adversaire.
function generalPresent(){
  for(let i=0;i<unitsArr.length;i++){
    if(unitsArr[i].type==='skeletonGeneral' && unitsArr[i].hp>0) return true;
  }
  return false;
}
const GENERAL_DMG=1.5;      // les squelettes frappent 50% plus fort
const GENERAL_ENCAISSE=0.6; // et ne prennent que 60% des dégâts reçus

// Résurrections en attente : le squelette de la carte revient une fois,
// deux secondes après sa mort, à l'endroit exact où il est tombé.
let resurrections=[];
const DELAI_RESURRECTION=120; // 2 secondes à 60 images par seconde

// Fait apparaître une unité à un endroit précis, avec le niveau de celle
// qui l'a invoquée. On repart des statistiques que le constructeur a
// réellement calculées, puis on corrige le facteur de niveau : sans ça,
// une invocation du camp ennemi hériterait du niveau de l'IA (jusqu'à 50)
// au lieu de celui de l'unité qui l'a fait apparaître.
function invoquer(type,team,lane,x,y,niveau){
  const u=new Unit(type,team,lane);
  const lvConstruit=u.level||1;
  const voulu=niveau||1;
  const ratio=(1+0.15*(voulu-1))/(1+0.15*(lvConstruit-1));
  u.level=voulu;
  u.hp=Math.round(u.maxHp*ratio); u.maxHp=u.hp; u.dmg=u.dmg*ratio;
  u.x=x; u.y=y;
  u.leverAnim=25;
  unitsArr.push(u);
  return u;
}

// ---------- DÉGÂTS CONTRE LES BÂTIMENTS ----------
const DMG_BATIMENT={
 giant:18, dragon:14, mole:14, trebuchet:22,
 mage:10, ninja:8, electromancer:9, pyromancer:9, cavalier:10,
 knight:7, archer:5, guardian:4, cryomancer:9,
 kamikaze:80, healer:0,
 necromancer:8, bannerman:8, skeleton:3, lizard:10,
 skeletonCard:4, skeletonGeneral:20, hauntedCarriage:16, richSkeleton:3, boneGuard:7
};
function degatsBatiment(u){
 const v=DMG_BATIMENT[u.type];
 return (v===undefined) ? u.dmg : v;
}

// ---------- LA CLASSE UNIT : le cœur du jeu ----------
class Unit{
constructor(type,team,lane){
const base={
// Combattant équilibré (3)
knight:{hp:150,dmg:9,speed:1.6,range:30,color:'cyan'},

// Distance (4)
archer:{hp:70,dmg:7,speed:1.0,range:200,color:'yellow'},

// Tank (7)
giant:{hp:650,dmg:6,speed:0.40,range:35,color:'purple'},

// Boss volant (10)
dragon:{hp:300,dmg:17,speed:1.3,range:200,color:'red'},

// Défenseur (4)
guardian:{hp:300,dmg:6,speed:0.7,range:30,color:'steelblue'},

// Soutien (5)
healer:{hp:100,dmg:0,speed:1.15,range:90,color:'lime'},

// Mage (6)
mage:{hp:150,dmg:16,speed:1.0,range:180,color:'violet'},

// Sniper (7)
// --- TRÉBUCHET --- machine de siège : immobile seule, il faut la pousser.
trebuchet:{hp:260,dmg:42,speed:0,range:340,color:'#7a6242'},

// Le servant qui pousse la machine. Prend une épée quand elle est détruite.
siegeman:{hp:110,dmg:7,speed:1.25,range:32,color:'#a89070'},

// Assassin (4)
ninja:{hp:80,dmg:13,speed:2.4,range:30,color:'white'},

// Suicide (4)
kamikaze:{hp:60,dmg:100,speed:1.9,range:30,color:'orange'},
electromancer:{hp:130,dmg:6,speed:1.0,range:180,color:'cyan'},
cryomancer:{hp:150,dmg:12,speed:1.0,range:260,color:'lightblue'},
pyromancer:{hp:120,dmg:17,speed:1.0,range:180,color:'orange'},
mole:{hp:900,dmg:50,speed:0.9,range:35,color:'black'},
cavalier:{hp:220,dmg:15,speed:2.0,range:35,color:'sienna'},

// Nécromancien (8) : mage fragile qui relève en squelette toute unité
// mourant près de lui, alliée comme ennemie.
necromancer:{hp:140,dmg:11,speed:0.95,range:200,color:'#8a6fc0'},

// --- LÉZARD À CASQUE --- il harponne un ennemi à la langue, l'empale sur
// sa pointe, puis l'achève à coups de griffes. Portée courte mais sa langue
// va chercher les cibles à 190.
lizard:{hp:210,dmg:14,speed:1.15,range:38,color:'#5f9a4a'},

// Porte-étendard (6) : chevalier à deux barres de vie. Tant que la
// bannière tient, ses alliés proches frappent plus fort et vont plus vite.
bannerman:{hp:190,dmg:10,speed:1.45,range:30,color:'#d4af37'},

// Squelette : jamais achetable, uniquement relevé par le nécromancien.
skeleton:{hp:45,dmg:5,speed:1.6,range:30,color:'#e8e4d8'},

// Squelette (carte, 3) : peu cher, rapide, fragile, mais il revit une fois.
skeletonCard:{hp:88,dmg:9,speed:1.9,range:30,color:'#ded9c8'},

// Général Squelette (13) : lent, immense, ses coups d'épée balaient
// plusieurs ennemis. Il arrive escorté et renforce tous les squelettes.
skeletonGeneral:{hp:400,dmg:16,speed:0.5,range:45,color:'#cfc7b0'},

// Calèche hantée (10) : fonce tout droit et écrase ce qu'elle croise.
hauntedCarriage:{hp:300,dmg:16,speed:2.2,range:30,color:'#4a3b2a'},

// Squelette riche : sort de la calèche brisée, régénère les squelettes
// autour de lui. Jamais achetable.
richSkeleton:{hp:160,dmg:6,speed:1.0,range:45,color:'#d8c37a'},

// Garde du corps : grand, lourd, il ne vit que pour protéger le Riche.
boneGuard:{hp:240,dmg:12,speed:1.15,range:35,color:'#9aa4ae'}
}[type];

let lv=levels[type]||1;
if(team==='enemy'){
 const aiLvMap={1:3,2:5,3:10,4:15,5:20,6:25,7:30,8:35,9:40,10:50};
 const aiLevel=aiForced ? aiDifficulty : autoAIDifficulty();
 lv=aiLvMap[Math.min(10,Math.max(1,aiLevel))]||1;
}
this.hp=Math.round(base.hp*(1+0.15*(lv-1)));
this.maxHp=this.hp;
this.dmg=base.dmg*(1+0.15*(lv-1));
this.speed=base.speed; this.range=base.range; this.color=base.color;
this.level=lv; this.type=type; this.team=team; this.lane=lane; this.charge=0;

// === CORPS PHYSIQUE (système de collision façon Clash Royale) ===
// La masse détermine qui pousse qui : un géant écarte un archer sans
// ralentir, deux chevaliers s'écartent mutuellement à parts égales.
const BODY={
  giant:{r:30,m:9}, mole:{r:28,m:9}, dragon:{r:26,m:6}, cavalier:{r:24,m:5},
  guardian:{r:22,m:5}, knight:{r:20,m:3}, kamikaze:{r:17,m:2}, ninja:{r:17,m:2},
  healer:{r:18,m:2}, archer:{r:18,m:2}, trebuchet:{r:26,m:9}, siegeman:{r:17,m:2},
  mage:{r:19,m:2.5}, electromancer:{r:19,m:2.5}, cryomancer:{r:19,m:2.5}, pyromancer:{r:19,m:2.5},
  necromancer:{r:19,m:2.5}, bannerman:{r:21,m:3.5}, skeleton:{r:14,m:1.2},
  lizard:{r:20,m:3.2},
  skeletonCard:{r:14,m:1.2}, skeletonGeneral:{r:30,m:9},
  hauntedCarriage:{r:28,m:8}, richSkeleton:{r:18,m:9}, boneGuard:{r:23,m:5}
}[type] || {r:20,m:3};
this.radius=BODY.r;
this.mass=BODY.m;

this.x=team==='player'?180:1020;
// Position d'arrivée légèrement variée : la séparation physique fait le
// reste du travail dès la première frame.
this.y=(lane?435:215)+(Math.random()*60-30);
this.cool=0; this.burnTime=0; this.slowTime=0; this.electricTime=0; this.burrow=type==='mole'?120:0; this.burrowCd=360;
}
update(){
if(this.type==='mole'){
 if(this.burrow>0){
   this.burrow--;
   this.x += this.team==='player'?2.5:-2.5;

   let targets=unitsArr.filter(u=>u.team!==this.team && u.lane===this.lane);
   let priority=['healer','trebuchet','cryomancer','pyromancer','mage','electromancer'];
   targets.sort((a,b)=>{
      let pa=priority.indexOf(a.type); if(pa<0) pa=99;
      let pb=priority.indexOf(b.type); if(pb<0) pb=99;
      return pa-pb;
   });

   let near=targets.find(u=>Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<35);
   if(!near){
      let priorityTarget=targets.find(u=>Math.abs(u.x-this.x)<250);
      if(priorityTarget){
         this.x += (priorityTarget.x>this.x?5:-5);
         const dy=priorityTarget.y-this.y;
         if(Math.abs(dy)>6) this.y += Math.sign(dy)*Math.min(3,Math.abs(dy));
      }
   }else{
      this.burrow=0;
   }

   if(this.burrow===0){
      unitsArr.forEach(u=>{
         if(u.team!==this.team && u.lane===this.lane && Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<60){u.hp-=130*(1+0.05*((this.level||1)-1));}
      });
   }
   return;
 }
 this.burrowCd--;
 if(this.burrowCd<=0){ this.burrow=90; this.burrowCd=360; return; }
}
// === CAVALIER CHARGE ===
if(this.type==='cavalier'){
  const dir=this.team==='player'?1:-1;
  if(!this.chargeSpeed) this.chargeSpeed=this.speed;

  // Contact avec une unité ennemie au corps à corps
  const contact=unitsArr.find(u=>u!==this&&u.team!==this.team&&u.lane===this.lane&&u.hp>0&&Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<this.range+this.radius+u.radius);

  // Tour ennemie encore debout dans le couloir : bloque le cavalier comme
  // n'importe quelle autre unité. (bug corrigé : avant, ce bloc étant écrit
  // avant l'existence des tours, le cavalier les ignorait totalement et
  // fonçait directement sur le château sans jamais s'arrêter devant elles.)
  let towerAhead=null, distTour=1e9;
  for(let i=0;i<towers.length;i++){
    const t=towers[i];
    if(t.hp<=0||t.team===this.team||t.lane!==this.lane) continue;
    if((t.x-this.x)*dir<-30) continue; // déjà dépassée
    const d=Math.abs(t.x-this.x);
    if(d<distTour){ distTour=d; towerAhead=t; }
  }
  const porteeT=Math.max(40,(this.range||0)+(this.radius||20));
  const tourBloque = !!towerAhead && distTour<=porteeT;

  // Château adverse
  const castle=this.team==='player'?enemy:player;
  const dC=Math.abs((castle.x+45)-this.x);
  const pC=Math.max(40,(this.range||0)+(this.radius||20));
  const castleBloque = dC<=pC;

  const parked = !!contact || tourBloque || castleBloque;

  if(!parked){
    // Voie libre : chercher l'ennemi le plus proche devant pour ajuster la
    // vitesse de charge, puis avancer.
    let closest=9999;
    for(let i=0;i<unitsArr.length;i++){
      const u=unitsArr[i];
      if(u.team===this.team||u.lane!==this.lane||u.hp<=0) continue;
      if(Math.abs(u.y-this.y)>60) continue; // pas sur sa trajectoire
      const dist=dir===1?(u.x-this.x):(this.x-u.x);
      if(dist>0&&dist<350&&dist<closest) closest=dist;
    }
    if(closest>100){
      // Voie libre : accélérer progressivement (lerp vers vitesse max)
      const target=this.speed*3.0;
      this.chargeSpeed += (target-this.chargeSpeed)*0.025;
    } else if(closest>this.range){
      // Ennemi proche mais pas au contact : maintenir vitesse (ne pas stopper)
      const target=this.speed*1.2;
      this.chargeSpeed += (target-this.chargeSpeed)*0.05;
    }
    this.atCastle=false;
    const mv=this.slowTime>0?this.chargeSpeed*0.6:this.chargeSpeed;
    this.x+=dir*mv;
  } else {
    // Arrêté (unité, tour ou château) : on frappe, mais on ne ré-accélère
    // JAMAIS pendant qu'on est immobile. C'est ça qui causait la boucle de
    // charge infinie : avant, la vitesse de charge remontait à fond chaque
    // frame même à l'arrêt, donnant un gros coup de charge en continu au
    // lieu d'un seul, suivi de coups normaux.
    this.atCastle = castleBloque && !contact && !tourBloque;
    if(this.cool<=0){
      const sr=this.chargeSpeed/this.speed;
      if(contact){
        const dmg=Math.round(this.dmg*(1+(sr-1)*3.0));
        for(let i=0;i<unitsArr.length;i++){
          const u=unitsArr[i];
          if(u.team!==this.team&&u.lane===this.lane&&u.hp>0&&Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<80) u.hp-=dmg;
        }
      } else if(tourBloque){
        towerAhead.hp-=Math.round(10+(sr-1)/2*28);
      } else {
        castle.hp-=Math.round(10+(sr-1)/2*28);
      }
      // Décélération lisse après impact (pas de reset brutal)
      this.chargeSpeed=this.speed*0.8;
      this.cool=20;
    }
  }

  // Décélération naturelle vers vitesse de base, UNIQUEMENT en mouvement
  // libre : à l'arrêt, on ne remonte plus jamais vers la charge max.
  if(!parked && this.chargeSpeed < this.speed) this.chargeSpeed += (this.speed-this.chargeSpeed)*0.1;

  if(this.cool>0)this.cool--;
  if(this.slowTime>0)this.slowTime--;
  if(this.electricTime>0)this.electricTime--;
  if(this.burnTime>0){this.burnTime--;this.burnTick=(this.burnTick||0)+1;if(this.burnTick>=30){this.hp-=6;this.burnTick=0;}}
  return;
}
// === GÉNÉRAL SQUELETTE : escorte à l'arrivée ===
// Trois squelettes apparaissent autour de lui au premier tour de boucle.
if(this.type==='skeletonGeneral' && !this.escorteFaite){
  this.escorteFaite=true;
  for(let e=0;e<3;e++){
    const ang=(e/3)*6.28;
    invoquer('skeleton',this.team,this.lane,
      this.x+Math.cos(ang)*40, this.y+Math.sin(ang)*24, this.level);
  }
}

// === AURA DU GÉNÉRAL : les squelettes deviennent robustes ===
// On gonfle vraiment la barre de vie plutôt que de filtrer chaque source de
// dégâts : c'est visible à l'écran, et ça se remet tout seul à l'endroit
// quand le Général tombe. Vaut pour les squelettes des DEUX camps.
if(estSquelette(this)){
  const boost=generalPresent();
  if(boost && !this.boostOs){
    this.boostOs=true;
    this.maxHp=Math.round(this.maxHp/GENERAL_ENCAISSE);
    this.hp=Math.round(this.hp/GENERAL_ENCAISSE);
  } else if(!boost && this.boostOs){
    this.boostOs=false;
    this.maxHp=Math.round(this.maxHp*GENERAL_ENCAISSE);
    this.hp=Math.min(this.hp,this.maxHp)*GENERAL_ENCAISSE;
  }
}

// === SQUELETTE RICHE : trésor vivant à protéger ===
// Plus il survit, plus il vaut cher : ses PV montent, son or s'accumule,
// et tout revient à son camp le jour où il tombe.
if(this.type==='richSkeleton'){
  if(this.tresor===undefined){
    this.tresor=0; this.tickTresor=0; this.tickPv=0; this.hpDepart=this.maxHp;
  }

  // Trésor : +1 or toutes les 1,5 seconde, plafonné pour rester raisonnable
  this.tickTresor++;
  if(this.tickTresor>=90 && this.tresor<40){ this.tickTresor=0; this.tresor++; }

  // PV maximum qui montent lentement : +3 par seconde, jusqu'à +180
  this.tickPv++;
  if(this.tickPv>=60){
    this.tickPv=0;
    if(this.maxHp < this.hpDepart+180){
      this.maxHp+=3;
      this.hp=Math.min(this.maxHp,this.hp+3);
    }
  }
  if(this.hpDepart===undefined) this.hpDepart=this.maxHp;

  // --- Plafond de déplacement ---
  // Filet de sécurité contre les bousculades de la physique : quoi qu'il
  // arrive, le Riche ne saute jamais de plus de 2 px en une image.
  if(this._xAvant!==undefined){
    const d=this.x-this._xAvant;
    if(Math.abs(d)>2) this.x=this._xAvant+Math.sign(d)*2;
  }

  // --- RECUL, appliqué UNE SEULE FOIS par image ---
  // Les gardes signalent le danger, le Riche recule lui-même à une allure
  // fixe. Avant, chaque garde le déplaçait de son côté : avec deux gardes
  // la vitesse doublait et il partait d'un coup vers l'arrière.
  if(this.reculUrgence>0){
    const sens=this.team==='player'?-1:1;
    // Jamais plus vite que sa propre marche : le mouvement reste lisible.
    const pas=Math.min(this.speed*0.9, this.reculUrgence*0.05);
    this.x += sens*pas;
    this.pousse=8;                       // animation de bousculade
    this.reculUrgence=0;                 // remis à zéro à chaque image
  }

  // Il se régénère doucement lui-même — mais SEULEMENT s'il est vivant.
  // Sans le this.hp>0, il remontait de 0 à 0,08 PV avant le contrôle de
  // mort de la boucle : il était purement et simplement immortel.
  if(this.hp>0 && this.hp<this.maxHp) this.hp=Math.min(this.maxHp,this.hp+0.08);
  this._xAvant=this.x;
}

// === SQUELETTE RICHE : régénère les squelettes autour de lui ===
if(this.type==='richSkeleton'){
  for(let i=0;i<unitsArr.length;i++){
    const u=unitsArr[i];
    if(u.team!==this.team||!estSquelette(u)||u.hp<=0||u.hp>=u.maxHp) continue;
    if(Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<130){
      u.hp=Math.min(u.maxHp,u.hp+0.25);
      if(Math.random()<0.04) u.soinFlash=12;
    }
  }
}

// === LÉZARD À CASQUE : langue, empalement, griffes ===
// Trois temps enchaînés. La langue va chercher une cible hors de portée,
// la ramène d'un coup sur la pointe du casque, puis le lézard l'achève.
if(this.type==='lizard'){
  if(this.phase===undefined){ this.phase='chasse'; this.langueT=0; this.proie=null; this.recharge=0; }
  if(this.recharge>0) this.recharge--;

  // --- 1. CHASSE : il repère une proie et GARDE SES DISTANCES ---
  // Il ne charge pas au contact comme les autres : il se tient à distance
  // de langue. Sans ça, il arrivait au corps à corps en deux secondes et
  // le harponnage se jouait sur 30 pixels, invisible pour le joueur.
  if(this.phase==='chasse'){
    let proie=null, best=1e9;
    for(let i=0;i<unitsArr.length;i++){
      const c=unitsArr[i];
      if(c.team===this.team||c.hp<=0||c.lane!==this.lane) continue;
      if(c.type==='mole'&&c.burrow>0) continue;
      if(c.maxHp>LANGUE_POIDS_MAX) continue;
      if(TROP_LOURDS.includes(c.type)) continue;
      const d=Math.hypot(c.x-this.x,(c.y-this.y)*0.8);
      if(d<LANGUE_PORTEE && d<best){ best=d; proie=c; }
    }
    if(proie){
      // Trop près : il RECULE pour reprendre du champ. Plus vite que sa
      // marche, sinon les assaillants le rattrapent et il se fait encercler.
      if(best<DISTANCE_TIR){
        const recul=this.team==='player'?-1:1;
        this.x += recul*this.speed*1.35;
        this.reculeur=true;
      } else this.reculeur=false;
      this.proieEnVue=true;

      // Il harponne dès qu'il est rechargé, à N'IMPORTE QUELLE distance.
      // Exiger une distance minimale le rendait inoffensif au corps à
      // corps, là où il passe justement le plus clair de son temps.
      if(this.recharge<=0){
        this.phase='langue'; this.langueT=0; this.proie=proie;
        this.langueAller=Math.max(LANGUE_ALLER_MIN, Math.round(best/LANGUE_VITESSE));
      }
    } else { this.reculeur=false; this.proieEnVue=false; }
  }

  // --- 2. LANGUE : elle se déroule, s'enroule, puis tire d'un coup ---
  if(this.phase==='langue'){
    const p=this.proie;
    if(!p||p.hp<=0){ this.phase='chasse'; this.proie=null; }
    else {
      this.langueT++;
      p.harponne=6;                       // elle ne peut plus avancer
      if(this.langueT>this.langueAller){
        // Traction : la proie file vers le casque
        const dx=this.x-p.x, dy=this.y-p.y;
        const d=Math.hypot(dx,dy)||1;
        p.x += (dx/d)*LANGUE_TRACTION;
        p.y += (dy/d)*LANGUE_TRACTION*0.6;
        if(d<42){
          // --- IMPACT SUR LA POINTE DU CASQUE ---
          p.hp -= DEGATS_POINTE*(this.level?1+0.15*(this.level-1):1);
          p.empale=20;
          this.phase='griffes';
          this.griffeT=0;
          this.teteBaissee=18;
          this.proie=p;
        }
      }
      if(this.langueT>this.langueAller+120){   // la proie résiste trop longtemps
        this.phase='chasse'; this.proie=null; this.recharge=60;
      }
    }
  }

  // --- 3. GRIFFES : il achève la proie empalée ---
  if(this.phase==='griffes'){
    this.griffeT++;
    const p=this.proie;
    if(!p||p.hp<=0||this.griffeT>GRIFFES_DUREE){
      this.phase='chasse'; this.proie=null;
      this.recharge=LANGUE_RECHARGE;
    } else if(this.griffeT%14===0){
      p.hp -= this.dmg*0.7;   // BOOST_OS ne concerne que les squelettes
      this.griffeFlash=8;
    }
  }
  if(this.teteBaissee>0) this.teteBaissee--;
  if(this.griffeFlash>0) this.griffeFlash--;
}

// === TRÉBUCHET : immobile sans bras pour le pousser ===


if(this.type==='trebuchet'){
  // Chaque machine reçoit un numéro : c'est ce qui permet à un servant de
  // reconnaître LA SIENNE et de ne pas partir aider celle du voisin.
  if(this.numero===undefined){
    this.numero = ++compteurTrebuchet;
    const arriere=this.team==='player'?-34:34;
    const sv=invoquer('siegeman',this.team,this.lane,this.x+arriere,this.y+6,this.level);
    if(sv) sv.machine=this.numero;
  }

  // Compte les bras réellement EN POSITION : derrière la machine et au
  // contact. Quelqu'un planté devant ne pousse rien.
  let places=0, pousseurs=0;
  const arriere=this.team==='player'?-1:1;
  for(let i=0;i<unitsArr.length;i++){
    const u=unitsArr[i];
    if(u===this||u.team!==this.team||u.hp<=0||u.lane!==this.lane) continue;
    if(!PEUT_POUSSER(u.type)) continue;
    // Un servant ne pousse que sa propre machine
    if(u.type==='siegeman' && u.machine!==this.numero) continue;
    const dx=(u.x-this.x)*arriere;          // positif = bien derrière
    // Zone d'attelage : assez profonde et large pour que quatre unités
    // tiennent réellement derrière la machine, sur deux rangs.
    if(dx>4 && dx<62 && Math.abs(u.y-this.y)<42){
      // Les places sont comptées dans l'ordre : une fois les 4 prises,
      // les suivants n'aident plus, ils sont derrière les autres.
      const pl=placeDe(u.type);
      if(places+pl<=PLACES_TOTAL){ places+=pl; pousseurs++; }
    }
  }
  this.pousseurs=pousseurs;
  this.placesPrises=places;
  this.placesLibres=PLACES_TOTAL-places;

  // Sans équipage, la machine ne roule pas ET ne tire plus : il faut des
  // bras pour la déplacer comme pour la recharger.
  // Ce sont les BRAS qui font avancer, pas le volume : la vitesse dépend du
  // NOMBRE de pousseurs. Un colosse occupe deux places mais n'a qu'une paire
  // de bras — il encombre donc plus qu'il n'aide, exactement comme prévu.
  this.speed = pousseurs===0 ? 0 : Math.min(0.75, 0.20 + (pousseurs-1)*0.19);
  this.sansEquipage = (pousseurs===0);

  // Garde-fou de position : une bousculade a déjà envoyé la machine hors
  // du terrain. Elle reste désormais dans les limites du champ de bataille.
  if(this.x<70) this.x=70;
  if(this.x>1130) this.x=1130;
}

// === SERVANT DU TRÉBUCHET ===
if(this.type==='siegeman'){
  // Il ne cherche QUE sa machine, jamais celle d'un autre servant.
  let machine=null;
  for(let i=0;i<unitsArr.length;i++){
    const u=unitsArr[i];
    if(u.type==='trebuchet'&&u.hp>0&&u.numero===this.machine){ machine=u; break; }
  }

  if(machine){
    this.epee=false;
    const arriere=machine.team==='player'?-1:1;
    const posteX=machine.x+arriere*32, posteY=machine.y+6;
    if(Math.abs(this.x-posteX)>3) this.x += Math.sign(posteX-this.x)*Math.min(1.4,Math.abs(posteX-this.x));
    if(Math.abs(this.y-posteY)>3) this.y += Math.sign(posteY-this.y)*0.8;

    // --- Appel à la rescousse ---
    // On ne force personne : seuls les alliés DÉJÀ derrière la machine, et
    // qui n'ont aucun ennemi sur les bras, viennent prêter main-forte.
    // Avant, on tirait aussi ceux placés devant, qui restaient plantés là
    // sans rien pousser.
    this.appel=0;
    if(machine.placesLibres>0){
      for(let i=0;i<unitsArr.length;i++){
        const u=unitsArr[i];
        if(u===this||u.team!==this.team||u.hp<=0||u.lane!==this.lane) continue;
        if(!PEUT_POUSSER(u.type)) continue;
        if(u.type==='siegeman') continue;          // chacun sa machine
        const dx=(u.x-machine.x)*arriere;
        if(dx<=0 || dx>150) continue;              // uniquement ceux derrière
        if(Math.abs(u.y-machine.y)>60) continue;
        let occupe=false;
        for(let k=0;k<unitsArr.length;k++){
          const e=unitsArr[k];
          if(e.team===u.team||e.hp<=0||e.lane!==u.lane) continue;
          if(Math.hypot(e.x-u.x,(e.y-u.y)*0.8)<190){ occupe=true; break; }
        }
        if(occupe) continue;
        const cibleX=machine.x+arriere*38;
        if(Math.abs(u.x-cibleX)>4) u.x += Math.sign(cibleX-u.x)*0.7;
        if(Math.abs(u.y-machine.y)>6) u.y += Math.sign(machine.y-u.y)*0.5;
        this.appel=1;
      }
    }
  } else {
    // --- Sa machine est détruite ---
    // Avant de tirer l'épée, il cherche une autre machine qui manque de
    // bras : un servant sans trébuchet reste plus utile derrière un autre
    // trébuchet qu'au corps à corps, où il ne vaut pas grand-chose.
    let orpheline=null, dO=1e9;
    for(let i=0;i<unitsArr.length;i++){
      const u=unitsArr[i];
      if(u.type!=='trebuchet'||u.team!==this.team||u.hp<=0) continue;
      if(!(u.placesLibres>0)) continue;          // celle-là est déjà complète
      const d=Math.hypot(u.x-this.x,(u.y-this.y)*0.8);
      if(d<dO){ dO=d; orpheline=u; }
    }
    if(orpheline){
      // Il s'engage auprès d'elle et change de couloir s'il le faut.
      this.machine=orpheline.numero;
      this.lane=orpheline.lane;
      this.epee=false;
      this.dmg=7;
      return;                                    // il reprend son poste
    }

    // --- Aucune machine à servir : il tire l'épée ---
    if(!this.epee){
      this.epee=true;
      this.dmg=15;
      this.speed=1.25;
      this.epeeFlash=40;
    }
    let proche=null, dP=1e9;
    for(let i=0;i<unitsArr.length;i++){
      const u=unitsArr[i];
      if(u.team===this.team||u.hp<=0||u.lane!==this.lane) continue;
      const d=Math.hypot(u.x-this.x,(u.y-this.y)*0.8);
      if(d<dP){ dP=d; proche=u; }
    }
    if(proche && proche.maxHp>this.maxHp*1.8 && dP<60){
      const recul=this.team==='player'?-1:1;
      this.x += recul*0.5;
    }
  }
  if(this.epeeFlash>0) this.epeeFlash--;
}


// === GARDES DU CORPS : ils ne vivent que pour le Riche ===
// Trois réflexes : repérer la vraie menace, s'interposer, et faire reculer
// le Riche — sans jamais s'éloigner de lui plus que nécessaire.
if(this.type==='boneGuard'){
  let riche=null;
  for(let i=0;i<unitsArr.length;i++){
    const u=unitsArr[i];
    if(u.type==='richSkeleton'&&u.team===this.team&&u.hp>0&&u.lane===this.lane){ riche=u; break; }
  }
  if(riche){
    // --- Choix de la menace ---
    // Pas simplement la plus proche : on pondère par la dangerosité, pour
    // qu'un géant qui arrive passe avant un archer déjà collé au Riche.
    let menace=null, meilleur=-1;
    for(let i=0;i<unitsArr.length;i++){
      const u=unitsArr[i];
      if(u.team===this.team||u.hp<=0||u.lane!==this.lane) continue;
      const d=Math.hypot(u.x-riche.x,(u.y-riche.y)*0.8);
      if(d>240) continue;
      // Score : la proximité compte, la puissance de frappe aussi.
      const note=(240-d) + (u.dmg||0)*3;
      if(note>meilleur){ meilleur=note; menace=u; }
    }

    // --- Les TOURS menacent aussi le Riche ---
    // Elles tirent de loin sans qu'aucun garde ne puisse les intercepter :
    // dans ce cas, la seule réponse utile est de reculer le Riche.
    let tourMenace=null, dTour=1e9;
    for(let i=0;i<towers.length;i++){
      const t=towers[i];
      if(t.hp<=0||t.team===this.team||t.lane!==this.lane) continue;
      const d=Math.hypot(t.x-riche.x,(t.y-riche.y)*0.8);
      // Menaçante seulement si le Riche est dans sa ligne de tir
      if(d < t.range+30 && d < dTour){ dTour=d; tourMenace=t; }
    }

    this.protege=menace;      // utilisé plus bas pour forcer la cible

    const distRiche=Math.hypot(this.x-riche.x,(this.y-riche.y)*0.8);
    const LAISSE=130;         // il ne s'éloigne jamais plus que ça

    if(menace){
      const dm=Math.hypot(menace.x-this.x,(menace.y-this.y)*0.8);
      const contact=this.range+this.radius+(menace.radius||20)-4;
      // Il va au contact, mais seulement si ça ne le tire pas trop loin
      // du Riche : un garde parti à l'autre bout ne protège plus personne.
      if(dm>contact && distRiche<LAISSE){
        this.x += Math.sign(menace.x-this.x)*this.speed;
        if(Math.abs(menace.y-this.y)>4) this.y += Math.sign(menace.y-this.y)*0.7;
      } else if(distRiche>=LAISSE){
        // Trop loin : il revient vers son protégé avant tout
        this.x += Math.sign(riche.x-this.x)*this.speed;
        if(Math.abs(riche.y-this.y)>4) this.y += Math.sign(riche.y-this.y)*0.6;
      }
    }
    else if(distRiche>70){
      // Aucune menace : il se recale autour du Riche plutôt que d'avancer
      this.x += Math.sign(riche.x-this.x)*0.9;
      if(Math.abs(riche.y-this.y)>4) this.y += Math.sign(riche.y-this.y)*0.5;
    }

    // --- Demande de recul ---
    // On ne déplace PAS le Riche ici : chaque garde le poussait de son côté,
    // ce qui doublait la vitesse et provoquait les sauts brusques. On note
    // seulement le danger, et le Riche recule lui-même, une seule fois par
    // image et à sa propre allure.
    const dUnite=menace ? Math.hypot(menace.x-riche.x,(menace.y-riche.y)*0.8) : 1e9;
    const danger=Math.min(dUnite, tourMenace ? dTour : 1e9);
    if(danger<130) riche.reculUrgence=Math.max(riche.reculUrgence||0, 130-danger);
  }
}

// === CALÈCHE HANTÉE : elle fonce et écrase ===
// Elle ne s'arrête jamais pour combattre : elle roule tout droit et blesse
// ce qu'elle percute, en s'abîmant un peu à chaque choc. Elle finit donc
// toujours par se briser, et c'est là que son équipage sort.
if(this.type==='hauntedCarriage'){
  for(let i=0;i<unitsArr.length;i++){
    const v=unitsArr[i];
    if(v.team===this.team||v.hp<=0||v.lane!==this.lane) continue;
    if(Math.hypot(v.x-this.x,(v.y-this.y)*0.8)<this.radius+v.radius+6){
      if(!this.dejaEcrase) this.dejaEcrase={};
      const id=v.uid||(v.uid=Math.random());
      // Une même unité n'est écrasée qu'une fois toutes les 30 images,
      // sinon la calèche la broierait 60 fois par seconde.
      if(!this.dejaEcrase[id] || this.dejaEcrase[id]<=0){
        v.hp-=this.dmg;
        this.hp-=8;              // l'attelage souffre du choc
        this.dejaEcrase[id]=30;
        this.secousse=8;
      }
    }
  }
  if(this.dejaEcrase) for(const k in this.dejaEcrase) this.dejaEcrase[k]--;
}

// === PORTE-ÉTENDARD : aura de ralliement ===
// Tant que la bannière est debout (première barre de vie), les alliés du
// couloir situés dans son rayon frappent plus fort et avancent plus vite.
// On marque simplement les alliés à chaque frame ; le bonus s'éteint tout
// seul dès que le porte-étendard meurt ou perd sa bannière.
if(this.type==='bannerman' && !this.banniereTombee){
  const RAYON=150;
  for(let i=0;i<unitsArr.length;i++){
    const u=unitsArr[i];
    if(u===this||u.team!==this.team||u.lane!==this.lane||u.hp<=0) continue;
    if(Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<RAYON) u.rallyTime=3;
  }
  this.rallyTime=3; // il profite aussi de sa propre bannière
}
if(this.rallyTime>0) this.rallyTime--;
// Multiplicateurs appliqués plus bas (dégâts et vitesse).
const RALLY_DMG   = this.rallyTime>0 ? 1.25 : 1;
const RALLY_SPEED = this.rallyTime>0 ? 1.15 : 1;
// Aura du Général Squelette : les deux camps en profitent.
const BOOST_OS = (estSquelette(this) && generalPresent()) ? GENERAL_DMG : 1;

// Portée réelle en 2D : maintenant que les unités s'étalent en hauteur,
// se baser seulement sur l'écart horizontal permettrait de frapper un
// ennemi situé très au-dessus. On prend aussi le plus proche, pas le
// premier trouvé dans la liste.
let target=null;
{
 let best=1e9;
 const reach=this.range+this.radius;
 for(let i=0;i<unitsArr.length;i++){
  const u=unitsArr[i];
  if(u===this||u.team===this.team||u.lane!==this.lane||u.hp<=0) continue;
  const d=Math.hypot(u.x-this.x,(u.y-this.y)*0.8);
  if(d<reach+u.radius && d<best){ best=d; target=u; }
 }
 // Les tours ennemies sont des cibles comme les autres : l'unité frappe
 // simplement ce qui est le plus proche d'elle.
 for(let i=0;i<towers.length;i++){
  const t=towers[i];
  if(t.hp<=0||t.team===this.team||t.lane!==this.lane) continue;
  const d=Math.hypot(t.x-this.x,(t.y-this.y)*0.8);
  if(d<reach+20 && d<best){ best=d; target=t; }
 }
}
// Le géant ne cherche jamais à combattre les unités (il pousse, il ne tue
// pas) — mais il DOIT pouvoir s'en prendre à une tour qui le bloque, sinon
// il reste coincé pour toujours devant elle sans rien pouvoir faire (aucune
// autre attaque ne le débloque). On ne garde donc sa cible que si c'est
// une tour ; toute cible "unité" est annulée comme avant.
if(this.type==='giant' && !towers.includes(target)) target=null;
// La calèche ne s'arrête que devant un bâtiment : elle traverse les unités
// en les écrasant au lieu de leur livrer bataille.
if(this.type==='hauntedCarriage' && !towers.includes(target)) target=null;

if(this.type==='healer'){
 const allies=unitsArr.filter(u=>
   u!==this &&
   u.team===this.team &&
   u.lane===this.lane &&
   u.hp>0 &&
   u.type!=='healer'
 );

 // Soins continus
 const healPower=0.38*(1+0.05*((this.level||1)-1));
 allies.forEach(u=>{
   if(Math.hypot(u.x-this.x,(u.y-this.y)*0.8)<80){
      u.hp=Math.min(u.maxHp,u.hp+healPower);
      for(let p=0;p<3;p++){
        ctx.fillStyle='lime';
        ctx.fillRect(u.x-10+Math.random()*20,u.y-20+Math.random()*20,2,2);
      }
   }
 });

 // Suivi intelligent
 if(allies.length){
   // Ne considère que les alliés relativement proches
   let nearby = allies.filter(u=>Math.abs(u.x-this.x)<220);
   if(!nearby.length) nearby = allies.filter(u=>Math.abs(u.x-this.x)<400);
   if(!nearby.length) nearby = allies;

   let follow = nearby.reduce((a,b)=>{
      const score = u => {
        let s = 0;
        if(u.type==='guardian') s += 40;
        else if(u.type==='giant') s += 35;
        s += (1 - u.hp/u.maxHp) * 100; // plus blessé = priorité
        s -= Math.abs(u.x-this.x)/20;   // pénalité distance
        return s;
      };
      return score(a) > score(b) ? a : b;
   });

   const desired=this.team==='player' ? follow.x-70 : follow.x+70;

   // zone confortable : ne bouge pas inutilement
   if(this.x < desired-10) this.x += this.speed;
   else if(this.x > desired+10) this.x -= this.speed;

   // Se replace aussi en hauteur derrière son protégé
   const dy=follow.y-this.y;
   if(Math.abs(dy)>12) this.y += Math.sign(dy)*Math.min(this.speed*0.6,Math.abs(dy));
 }
}

if(this.type==='healer'){ target=null; }

// Le TRÉBUCHET tire par-dessus la mêlée : il vise l'ennemi le PLUS LOIN
// à sa portée, pas le plus proche. C'est ce qui le rend complémentaire de
// tout le reste — il frappe les rangs arrière que personne n'atteint.
if(this.type==='trebuchet'){
  // Sans personne pour la recharger, elle ne tire pas. Avant, une machine
  // abandonnée continuait de bombarder toute seule.
  if(this.sansEquipage) target=null;
  else {
  let loin=null, dMax=-1;
  for(let i=0;i<unitsArr.length;i++){
    const u=unitsArr[i];
    if(u.team===this.team||u.hp<=0||u.lane!==this.lane) continue;
    if(u.type==='mole'&&u.burrow>0) continue;
    const d=Math.hypot(u.x-this.x,(u.y-this.y)*0.8);
    if(d<=this.range && d>dMax){ dMax=d; loin=u; }
  }
  if(loin) target=loin;
  }
}
// Le garde du corps ignore le combattant le plus proche de LUI et frappe
// celui qui menace le Riche : c'est toute sa raison d'être.
if(this.type==='boneGuard' && this.protege && this.protege.hp>0){
  const d=Math.hypot(this.protege.x-this.x,(this.protege.y-this.y)*0.8);
  // À portée : il frappe la menace. Sinon il ne frappe RIEN et continue de
  // marcher vers elle, au lieu de s'arrêter sur un adversaire secondaire.
  target = (d < this.range+this.radius+(this.protege.radius||20)) ? this.protege : null;
}

if(target){
 if(this.cool<=0){
  const estTour = towers.includes(target);
  if(estTour){
   // Bâtiment : dégâts fixes de la table, jamais les dégâts anti-unité.
   // Les unités à distance envoient un VRAI projectile : avant, la tour
   // perdait de la vie sans qu'on voie jamais le tir partir.
   const aDistance=['archer','dragon','mage','trebuchet','electromancer',
                    'cryomancer','pyromancer','necromancer'].includes(this.type);
   if(aDistance){
     projectiles.push({x:this.x,y:this.y,target,dmg:degatsBatiment(this),
                       sourceType:this.type,versBatiment:true});
   } else {
     target.hp-=degatsBatiment(this);
   }
   if(this.type==='kamikaze') this.hp=0;
  }
  else if(this.type==='kamikaze'){target.hp-=this.dmg; this.hp=0;}
  else if(this.type==='giant'){ /* le géant ne frappe jamais les unités */ }
  else if(this.type==='skeletonGeneral'){
   // Grand coup d'épée : tout ennemi proche de la cible est balayé.
   const BALAYAGE=90;
   for(let g=0;g<unitsArr.length;g++){
    const v=unitsArr[g];
    if(v.team===this.team||v.hp<=0||v.lane!==this.lane) continue;
    if(Math.hypot(v.x-target.x,(v.y-target.y)*0.8)<BALAYAGE) v.hp-=this.dmg*RALLY_DMG;
   }
   this.coupEpee=14; // animation du grand geste
  }
  else if(this.type==='trebuchet'){
    // Un bloc de pierre lourd et lent, qui décrit une cloche dans les airs.
    projectiles.push({x:this.x,y:this.y-30,target,dmg:this.dmg*RALLY_DMG,
                      sourceType:'trebuchet',lobDepart:{x:this.x,y:this.y-30},lobT:0});
  }
  else if(['archer','dragon','mage','electromancer','cryomancer','pyromancer','necromancer'].includes(this.type)){projectiles.push({x:this.x,y:this.y,target,dmg:this.dmg*RALLY_DMG,sourceType:this.type});}
  else if(this.dmg>0){ target.hp-=this.dmg*RALLY_DMG*BOOST_OS; }
  // Le trébuchet doit être rechargé et retendu entre deux tirs : sa cadence
  // est 4 fois plus lente que celle des autres unités à distance.
  this.cool = this.type==='trebuchet' ? 80 : 20;
  if(this.type==='trebuchet') this.recul=14;   // secousse du bras
 }
}else {
 if(this.type!=='healer'){
   // L'unité avance TOUJOURS vers sa cible. Les chevauchements sont réglés
   // ensuite par resolveUnitCollisions() : les unités s'écartent et se
   // contournent naturellement au lieu de s'arrêter en file (Clash Royale).
   // Une proie prise à la langue du lézard ne peut plus avancer : elle est
   // tractée, pas maîtresse de ses mouvements. On met sa vitesse à zéro
   // plutôt que de sortir de la fonction, sinon elle ne serait plus dessinée.
   if(this.harponne>0) this.harponne--;
   // Le lézard s'immobilise dès qu'il tient une proie à bonne distance :
   // il tire la langue au lieu d'avancer. C'est ce qui rend son attaque
   // enfin lisible à l'écran.
   const lezardEnPosition = (this.type==='lizard' && this.proieEnVue);
   const moveSpeed=(this.harponne>0||lezardEnPosition) ? 0
                 : (this.slowTime>0?this.speed*0.6:this.speed)*RALLY_SPEED;
   const dir=this.team==='player'?1:-1;

   // Le château adverse est une cible à part entière : l'unité s'arrête
   // dès qu'il entre dans sa portée, au lieu de le traverser et de sortir
   // du terrain (chaque unité s'arrête donc à SA distance de tir).
   const cible=this.team==='player'?enemy:player;
   const distCastle=Math.abs((cible.x+45)-this.x);
   const portee=Math.max(40,(this.range||0)+(this.radius||20));

   // Une tour ennemie encore debout dans le couloir arrête l'unité de la
   // même façon que le château : elle s'arrête à portée et la frappe.
   let distTour=1e9;
   for(let i=0;i<towers.length;i++){
     const t=towers[i];
     if(t.hp<=0||t.team===this.team||t.lane!==this.lane) continue;
     const dir2=this.team==='player'?1:-1;
     if((t.x-this.x)*dir2<-30) continue; // déjà dépassée
     distTour=Math.min(distTour,Math.abs(t.x-this.x));
   }

   if(distCastle<=portee || distTour<=portee){
     // Arrivée au château ou devant une tour : on ne bouge plus.
     this.atCastle=true;
   } else {
     this.atCastle=false;

   // Vise l'ennemi le plus proche du couloir pour s'aligner dessus en
   // approchant, sinon le château adverse.
   let aim=null, aimDist=1e9;
   for(let i=0;i<unitsArr.length;i++){
     const u=unitsArr[i];
     if(u===this||u.team===this.team||u.lane!==this.lane||u.hp<=0) continue;
     const d=(u.x-this.x)*dir;
     if(d>0 && d<aimDist){ aimDist=d; aim=u; }
   }

   this.x+=dir*moveSpeed;

   // Alignement vertical progressif sur la cible (permet de la contourner
   // ou de venir la prendre de côté plutôt que de foncer tout droit).
   if(aim && aimDist<220){
     const dy=aim.y-this.y;
     if(Math.abs(dy)>4) this.y += Math.sign(dy)*Math.min(moveSpeed*0.7,Math.abs(dy));
   }
   }
 }
}

const castle=this.team==='player'?enemy:player;
const dCastle=Math.abs((castle.x+45)-this.x);
const pCastle=Math.max(40,(this.range||0)+(this.radius||20));
if(dCastle<=pCastle && this.dmg>0 && this.cool<=0){
 // Même correctif que pour les tours : les unités à distance tirent un vrai
 // projectile vers le château au lieu de lui retirer des PV en silence.
 const aDistanceC=['archer','dragon','mage','trebuchet','electromancer',
                   'cryomancer','pyromancer','necromancer'].includes(this.type);
 if(aDistanceC){
   projectiles.push({x:this.x,y:this.y,target:castle,dmg:degatsBatiment(this),
                     sourceType:this.type,versBatiment:true});
 } else {
   castle.hp-=degatsBatiment(this);
 }
 this.cool=20;
}

if(this.slowTime>0){
 for(let i=0;i<4;i++){
   ctx.fillStyle=i%2?'#99ddff':'#ccffff';
   ctx.beginPath();
   ctx.arc(this.x-10+Math.random()*20,this.y-20+Math.random()*25,3,0,6.28);
   ctx.fill();
 }
}


if(this.electricTime>0){
 for(let i=0;i<6;i++){
   ctx.fillStyle=i%2?'yellow':'cyan';
   ctx.fillRect(this.x-12+Math.random()*24,this.y-20+Math.random()*30,3,3);
 }
}




if(this.burnTime>0){


 for(let i=0;i<6;i++){
   ctx.fillStyle=i%2?'orange':'red';
   ctx.fillRect(this.x-12+Math.random()*24,this.y-24+Math.random()*30,3,3);
 }
 this.burnTime--;
 this.burnTick=(this.burnTick||0)+1;
 if(this.burnTick>=30){
   this.hp-=6;
   this.burnTick=0;
 }
}
if(this.slowTime>0){ this.slowTime--; }
if(this.electricTime>0){ this.electricTime--; }
if(this.cool>0)this.cool--;
}


draw(){
const t=this.type, x=this.x, y=this.y;
const dir=this.team==='player'?1:-1;
const tk=this.animTick||0;
const attacking=this._attacking||false;

// Taupe creusant : animation spéciale dynamique
if(t==='mole'&&this.burrow>0){
  ctx.save();
  if(dir===-1){ctx.translate(x*2,0);ctx.scale(-1,1);}
  ctx.fillStyle='#5a3818';
  ctx.beginPath();ctx.ellipse(x,y+22,22,6,0,0,6.28);ctx.fill();
  for(let i=0;i<5;i++){
    const a=i*1.25+tk*0.2;
    ctx.fillStyle=`rgba(100,65,30,${0.6-i*0.08})`;
    ctx.beginPath();ctx.arc(x+Math.cos(a)*16,y+16+Math.sin(a)*8,4,0,6.28);ctx.fill();
  }
  ctx.restore();
  // Jauge
  const ratio=this.burrow/90;
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(x-20,y-12,40,7,3);ctx.fill();
  ctx.fillStyle='#8b4513';ctx.beginPath();ctx.roundRect(x-20,y-12,40*ratio,7,3);ctx.fill();
  return;
}

// === UNITÉS DESSINÉES À LA MAIN (pas de sprites) ===
if(t==='necromancer'||t==='bannerman'||t==='skeleton'||t==='skeletonCard'
   ||t==='richSkeleton'||t==='skeletonGeneral'||t==='hauntedCarriage'
   ||t==='boneGuard'||t==='trebuchet'||t==='siegeman'||t==='lizard'){
  ctx.save();
  const bob=Math.sin(tk*0.12)*2;
  const yy=y+bob;
  if(t==='lizard'){
    // --- LÉZARD À CASQUE ---
    // Dessin volontairement sobre : la version précédente multipliait les
    // tracés (écailles, griffes, dégradés) et faisait ramer le jeu dès
    // qu'il y en avait plusieurs à l'écran.
    const pas=Math.sin(tk*0.19);
    const vert='#5f9a4a', vertF='#48783a';

    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x,yy+24,14,4,0,0,6.28); ctx.fill();

    // Queue
    ctx.strokeStyle=vertF; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(x-8*dir,yy+8);
    ctx.quadraticCurveTo(x-26*dir,yy+10+pas*4,x-36*dir,yy-2+pas*6);
    ctx.stroke();

    // Pattes
    ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(x-2*dir,yy+9); ctx.lineTo(x-6*dir+pas*4,yy+23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+2*dir,yy+9); ctx.lineTo(x+4*dir-pas*4,yy+23); ctx.stroke();

    // Corps penché
    ctx.fillStyle=vert;
    ctx.beginPath(); ctx.ellipse(x,yy-2,15,10,-0.18*dir,0,6.28); ctx.fill();
    ctx.fillStyle='#c8d68a';
    ctx.beginPath(); ctx.ellipse(x+1,yy+3,10,5,0,0,6.28); ctx.fill();

    // Bras griffu
    const griffe=this.griffeFlash>0;
    ctx.strokeStyle=vert; ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(x+6*dir,yy-2);
    ctx.lineTo(x+(griffe?19:14)*dir,yy+(griffe?-8:2));
    ctx.stroke();

    // Tête
    ctx.fillStyle=vert;
    ctx.beginPath(); ctx.ellipse(x+10*dir,yy-17,11,8,0.2*dir,0,6.28); ctx.fill();
    ctx.fillStyle='#f0d060';
    ctx.beginPath(); ctx.arc(x+14*dir,yy-19,3.2,0,6.28); ctx.fill();
    ctx.fillStyle='#1a1a1a';
    ctx.fillRect(x+13.2*dir,yy-21.4,1.6,4.8);

    // Casque et POINTE
    ctx.fillStyle='#8d959e';
    ctx.beginPath(); ctx.arc(x+10*dir,yy-20,11,Math.PI,0); ctx.fill();
    ctx.fillStyle='#6b737c';
    ctx.fillRect(x-1*dir,yy-22,22*dir,3);
    ctx.fillStyle='#c8ccd2';
    ctx.beginPath();
    ctx.moveTo(x+12*dir,yy-30);
    ctx.lineTo(x+40*dir,yy-36);
    ctx.lineTo(x+14*dir,yy-24);
    ctx.closePath(); ctx.fill();

    // --- LA LANGUE ---
    // Elle reste affichée pendant TOUTE la prise, y compris les coups de
    // griffes : tant que la proie est tenue, on voit le lien qui la retient.
    if((this.phase==='langue'||this.phase==='griffes') && this.proie && this.proie.hp>0){
      const p=this.proie;
      const bx=x+16*dir, by=yy-15;
      const t2 = this.phase==='griffes' ? 1
               : Math.min(1,this.langueT/(this.langueAller||LANGUE_ALLER_MIN));
      const ex=bx+(p.x-bx)*t2, ey=by+(p.y-by)*t2;
      const courbe=(by+ey)/2+Math.sin(tk*0.4)*12;

      // Contour sombre : la langue reste lisible sur n'importe quel fond
      ctx.strokeStyle='#7a2030'; ctx.lineWidth=9; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(bx,by); ctx.quadraticCurveTo((bx+ex)/2,courbe,ex,ey);
      ctx.stroke();
      ctx.strokeStyle='#e0607a'; ctx.lineWidth=6;
      ctx.beginPath();
      ctx.moveTo(bx,by); ctx.quadraticCurveTo((bx+ex)/2,courbe,ex,ey);
      ctx.stroke();
      ctx.strokeStyle='#ffa8bc'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(bx,by); ctx.quadraticCurveTo((bx+ex)/2,courbe,ex,ey);
      ctx.stroke();

      // Bout de langue bien gros, avec un halo : on suit sa course des yeux
      ctx.fillStyle='rgba(255,120,150,0.35)';
      ctx.beginPath(); ctx.arc(ex,ey,12,0,6.28); ctx.fill();
      ctx.fillStyle='#ff8098';
      ctx.beginPath(); ctx.arc(ex,ey,6,0,6.28); ctx.fill();

      // Une fois la proie atteinte : la langue s'enroule visiblement autour
      if(t2>=1){
        ctx.strokeStyle='#7a2030'; ctx.lineWidth=6;
        ctx.beginPath(); ctx.ellipse(p.x,p.y,19,13,0,0,6.28); ctx.stroke();
        ctx.strokeStyle='#e0607a'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.ellipse(p.x,p.y,19,13,0,0,6.28); ctx.stroke();
        ctx.strokeStyle='#e0607a'; ctx.lineWidth=3.5;
        ctx.beginPath(); ctx.ellipse(p.x,p.y-7,15,9,0.3,0,6.28); ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
    if(t==='trebuchet'){
  // --- TRÉBUCHET : machine de siège en bois et cordages ---
  const rec=this.recul>0 ? this.recul/14 : 0;      // secousse après le tir
  const bras=-1.1 + rec*2.4;                       // le bras se rabat puis se retend
  const pousse=(this.pousseurs||0);

  ctx.fillStyle='rgba(0,0,0,0.26)';
  ctx.beginPath(); ctx.ellipse(x,yy+26,32,6,0,0,6.28); ctx.fill();

  // Roues pleines cerclées de fer
  [[-20,18],[18,18]].forEach(rw=>{
    ctx.fillStyle='#5c4a2e';
    ctx.beginPath(); ctx.arc(x+rw[0],yy+rw[1],9,0,6.28); ctx.fill();
    ctx.strokeStyle='#3a3128'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(x+rw[0],yy+rw[1],9,0,6.28); ctx.stroke();
    ctx.fillStyle='#8a7550';
    ctx.beginPath(); ctx.arc(x+rw[0],yy+rw[1],2.5,0,6.28); ctx.fill();
  });

  // Châssis
  ctx.fillStyle='#6b5535';
  ctx.beginPath(); ctx.roundRect(x-26,yy+8,50,9,2); ctx.fill();

  // Bâti en A qui soutient le bras
  ctx.strokeStyle='#7a6242'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x-13,yy+10); ctx.lineTo(x,yy-26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+13,yy+10); ctx.lineTo(x,yy-26); ctx.stroke();
  ctx.strokeStyle='#5c4a2e'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(x-8,yy-6); ctx.lineTo(x+8,yy-6); ctx.stroke();

  // Bras de lancement et contrepoids
  ctx.save();
  ctx.translate(x,yy-26);
  ctx.rotate(bras*dir);
  ctx.strokeStyle='#8a7550'; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(34*dir,-6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-14*dir,4); ctx.stroke();
  ctx.fillStyle='#4a4038';                      // caisse de contrepoids
  ctx.fillRect(-22*dir,2,14,13);
  ctx.strokeStyle='#2e2820'; ctx.lineWidth=1.5;
  ctx.strokeRect(-22*dir,2,14,13);
  // Fronde et bloc de pierre, visibles seulement quand elle est chargée
  if(rec<0.3){
    ctx.strokeStyle='#c9b58a'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(34*dir,-6); ctx.lineTo(38*dir,6); ctx.stroke();
    ctx.fillStyle='#8f8577';
    ctx.beginPath(); ctx.arc(39*dir,9,6,0,6.28); ctx.fill();
    ctx.fillStyle='#6e665a';
    ctx.beginPath(); ctx.arc(41*dir,11,2.5,0,6.28); ctx.fill();
  }
  ctx.restore();

  // Cordages tendus
  ctx.strokeStyle='rgba(200,180,140,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x-24,yy+9); ctx.lineTo(x-2,yy-24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+22,yy+9); ctx.lineTo(x+2,yy-24); ctx.stroke();

  // Petits traits de poussée quand la machine roule
  if(pousse>0){
    for(let d2=0;d2<pousse;d2++){
      ctx.fillStyle='rgba(160,140,110,0.35)';
      ctx.fillRect(x-(30+d2*7)*dir,yy+20+Math.random()*4,5,2);
    }
  }
  if(this.recul>0) this.recul--;
  // Même arrêt que pour le servant : sans lui, un squelette venait se
  // dessiner par-dessus la machine.
  ctx.restore();
  return;
  }
  else if(t==='siegeman'){
  // --- SERVANT : sans armure, il pousse ou il se bat ---
  const marche=Math.sin(tk*0.2);
  const epee=this.epee;

  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x,yy+22,10,4,0,0,6.28); ctx.fill();

  // Jambes
  ctx.strokeStyle='#5e4a32'; ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x,yy+8); ctx.lineTo(x-4+marche*3,yy+20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,yy+8); ctx.lineTo(x+4-marche*3,yy+20); ctx.stroke();

  // Tunique de toile, pas d'armure
  ctx.fillStyle=epee?'#8a6a42':'#a89070';
  ctx.beginPath();
  ctx.moveTo(x-10,yy-12); ctx.lineTo(x+10,yy-12);
  ctx.lineTo(x+8,yy+9); ctx.lineTo(x-8,yy+9);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='#6b5535';                       // ceinture de corde
  ctx.fillRect(x-9,yy-1,18,3);

  // Tête nue, capuche de toile
  ctx.fillStyle='#d8b48a';
  ctx.beginPath(); ctx.arc(x,yy-19,7.5,0,6.28); ctx.fill();
  ctx.fillStyle='#8a7550';
  ctx.beginPath(); ctx.arc(x,yy-21,7.5,Math.PI,0); ctx.fill();
  ctx.fillStyle='#2e2820';
  ctx.fillRect(x-3.5+dir,yy-20,2,2); ctx.fillRect(x+1.5+dir,yy-20,2,2);

  if(epee){
    // Épée tirée : lame simple, éclat au moment de dégainer
    const coup=attacking ? Math.abs(Math.sin(tk*0.3))*1.0 : 0.2;
    ctx.save();
    ctx.translate(x+9*dir,yy-6);
    ctx.rotate(-coup*dir);
    ctx.strokeStyle='#6b5535'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(3*dir,4); ctx.stroke();
    ctx.strokeStyle='#c8ccd2'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(3*dir,3); ctx.lineTo(15*dir,-11); ctx.stroke();
    ctx.strokeStyle='#eef2f6'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(4*dir,2); ctx.lineTo(14*dir,-9); ctx.stroke();
    ctx.restore();
    if(this.epeeFlash>0){
      ctx.fillStyle='rgba(255,255,255,'+(this.epeeFlash/40*0.6).toFixed(2)+')';
      ctx.beginPath(); ctx.arc(x+12*dir,yy-10,10,0,6.28); ctx.fill();
    }
  } else {
    // Bras tendus vers la machine, buste penché en avant
    ctx.strokeStyle='#d8b48a'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x-2,yy-8); ctx.lineTo(x+13*dir,yy-4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-2,yy-4); ctx.lineTo(x+13*dir,yy+1); ctx.stroke();
    // Bulle d'appel quand il réclame de l'aide
    if(this.appel){
      ctx.fillStyle='rgba(255,240,200,0.9)';
      ctx.beginPath(); ctx.roundRect(x-9,yy-40,18,13,4); ctx.fill();
      ctx.fillStyle='#5c4a2e'; ctx.font='bold 10px Arial';
      ctx.fillText('!',x-2,yy-30);
    }
  }
  // On s'arrête ici : sans ce return, le code continuait et dessinait un
  // SQUELETTE par-dessus le trébuchet et son servant. Or ce sont des
  // humains ordinaires, pas des morts-vivants.
  ctx.restore();
  return;
  }

  if(t==='skeletonGeneral'){
    // Grand squelette casqué, deux fois plus large qu'un soldat
    const coup=this.coupEpee>0 ? (14-this.coupEpee)/14 : 0;
    ctx.strokeStyle='#d8d2c0'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(x,yy-24); ctx.lineTo(x,yy+18); ctx.stroke();
    ctx.lineWidth=3;
    for(let c=0;c<4;c++){
      ctx.beginPath();
      ctx.moveTo(x-13,yy-16+c*8); ctx.lineTo(x+13,yy-16+c*8);
      ctx.stroke();
    }
    ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(x,yy+18); ctx.lineTo(x-10,yy+34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,yy+18); ctx.lineTo(x+10,yy+34); ctx.stroke();
    ctx.fillStyle='#e8e4d8';
    ctx.beginPath(); ctx.arc(x,yy-32,11,0,6.28); ctx.fill();
    ctx.fillStyle=this.team==='player'?'#3a6fd0':'#b02a2a';
    ctx.beginPath(); ctx.arc(x,yy-34,12,Math.PI,0); ctx.fill();
    ctx.fillRect(x-3,yy-52,6,16);
    ctx.fillStyle='#2a1a3a';
    ctx.fillRect(x-6,yy-33,4,4); ctx.fillRect(x+2,yy-33,4,4);
    ctx.save();
    ctx.translate(x+16*dir,yy-6);
    ctx.rotate((-0.7+coup*1.9)*dir);
    ctx.fillStyle='#9aa4ae'; ctx.fillRect(-3,-44,6,46);
    ctx.fillStyle='#c8b070'; ctx.fillRect(-9,0,18,5);
    ctx.restore();
    if(coup>0.05 && coup<0.8){
      ctx.strokeStyle='rgba(230,230,255,'+(0.5-coup*0.5).toFixed(2)+')';
      ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(x+16*dir,yy-6,44,-1.2,0.9); ctx.stroke();
    }
    if(this.coupEpee>0) this.coupEpee--;
  }

  else if(t==='hauntedCarriage'){
    const sec=this.secousse>0 ? (Math.random()-0.5)*4 : 0;
    const yc=yy+sec;
    const rot=tk*0.25*dir;

    // Ombre de l'attelage entier
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x+8*dir,yc+22,40,6,0,0,6.28); ctx.fill();

    // Traînée de brume laissée derrière
    for(let b=0;b<4;b++){
      ctx.fillStyle='rgba(150,180,210,'+(0.10-b*0.02).toFixed(2)+')';
      ctx.beginPath();
      ctx.arc(x-(30+b*16)*dir,yc+6+Math.sin(tk*0.1+b)*4,10-b,0,6.28);
      ctx.fill();
    }

    // ---- Cheval spectral ----
    const gal=Math.sin(tk*0.3);
    ctx.fillStyle='rgba(200,220,240,0.50)';
    ctx.beginPath(); ctx.ellipse(x+36*dir,yc+1,18,11,0,0,6.28); ctx.fill();   // corps
    ctx.beginPath(); ctx.ellipse(x+50*dir,yc-11,9,6,0.6*dir,0,6.28); ctx.fill(); // tête
    ctx.beginPath();                                                          // encolure
    ctx.moveTo(x+44*dir,yc-4); ctx.lineTo(x+52*dir,yc-14);
    ctx.lineTo(x+46*dir,yc-16); ctx.lineTo(x+38*dir,yc-6);
    ctx.closePath(); ctx.fill();
    // Crinière flottante
    ctx.strokeStyle='rgba(220,240,255,0.45)'; ctx.lineWidth=2;
    for(let m=0;m<4;m++){
      ctx.beginPath();
      ctx.moveTo(x+(42+m*3)*dir,yc-12);
      ctx.lineTo(x+(36+m*3)*dir-Math.sin(tk*0.2+m)*4,yc-20);
      ctx.stroke();
    }
    // Œil ardent
    ctx.fillStyle='#8fe6ff';
    ctx.beginPath(); ctx.arc(x+53*dir,yc-13,2.2,0,6.28); ctx.fill();
    // Pattes au galop
    ctx.strokeStyle='rgba(200,220,240,0.45)'; ctx.lineWidth=3; ctx.lineCap='round';
    for(let l=0;l<4;l++){
      const ph=gal*(l%2?1:-1);
      ctx.beginPath();
      ctx.moveTo(x+(28+l*7)*dir,yc+8);
      ctx.lineTo(x+(26+l*7)*dir+ph*6,yc+22);
      ctx.stroke();
    }
    // Timon reliant le cheval à la caisse
    ctx.strokeStyle='#4a3b28'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x+20*dir,yc-2); ctx.lineTo(x+30*dir,yc+2); ctx.stroke();

    // ---- Caisse de la calèche ----
    ctx.fillStyle='#2e2317';
    ctx.beginPath(); ctx.roundRect(x-24,yc-26,44,32,3); ctx.fill();
    // Panneaux de bois
    ctx.strokeStyle='rgba(150,120,80,0.35)'; ctx.lineWidth=1;
    for(let pnl=0;pnl<3;pnl++){
      ctx.beginPath();
      ctx.moveTo(x-20+pnl*14,yc-24); ctx.lineTo(x-20+pnl*14,yc+4);
      ctx.stroke();
    }
    // Fenêtre : noir profond, un regard qui luit parfois
    ctx.fillStyle='#0d0a06';
    ctx.beginPath(); ctx.roundRect(x-19,yc-21,17,15,2); ctx.fill();
    if(Math.sin(tk*0.06)>0.4){
      ctx.fillStyle='rgba(140,230,255,0.75)';
      ctx.beginPath(); ctx.arc(x-14,yc-14,1.8,0,6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(x-8,yc-14,1.8,0,6.28); ctx.fill();
    }
    // Toit et lanternes
    ctx.fillStyle='#5c4c30';
    ctx.beginPath(); ctx.roundRect(x-27,yc-31,50,6,2); ctx.fill();
    const lant=0.5+0.5*Math.sin(tk*0.18);
    ctx.fillStyle='rgba(255,200,120,'+(0.18*lant).toFixed(2)+')';
    ctx.beginPath(); ctx.arc(x+19,yc-28,9,0,6.28); ctx.fill();
    ctx.fillStyle='#ffc978';
    ctx.beginPath(); ctx.arc(x+19,yc-28,2.5,0,6.28); ctx.fill();
    ctx.strokeStyle='#7a6544'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(x-24,yc-26,44,32,3); ctx.stroke();

    // ---- Roues à rayons ----
    const roues=[[-15,9],[13,9]];
    for(let w=0;w<2;w++){
      const rx=x+roues[w][0], ry=yc+roues[w][1];
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(rx,ry,12,0,6.28); ctx.fill();
      ctx.strokeStyle='#6b5836'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(rx,ry,12,0,6.28); ctx.stroke();
      ctx.strokeStyle='#8a7550'; ctx.lineWidth=1.5;
      for(let sp=0;sp<6;sp++){
        const a=rot+sp*1.047;
        ctx.beginPath(); ctx.moveTo(rx,ry);
        ctx.lineTo(rx+Math.cos(a)*11,ry+Math.sin(a)*11); ctx.stroke();
      }
      ctx.fillStyle='#8a7550';
      ctx.beginPath(); ctx.arc(rx,ry,3,0,6.28); ctx.fill();
      // Poussière soulevée
      if(Math.random()<0.3){
        ctx.fillStyle='rgba(140,120,90,0.3)';
        ctx.fillRect(rx-14*dir+Math.random()*6,ry+8+Math.random()*4,3,3);
      }
    }
    if(this.secousse>0) this.secousse--;
  }

  else if(t==='boneGuard'){
    // Garde du corps : nettement plus massif qu'un squelette ordinaire,
    // avec pavois, heaume fermé et démarche lourde.
    const pas=Math.sin(tk*0.16);
    const garde=this.protege ? 1 : 0;
    ctx.fillStyle='rgba(0,0,0,0.24)';
    ctx.beginPath(); ctx.ellipse(x,yy+26,15,5,0,0,6.28); ctx.fill();

    // Jambes épaisses, cadence lente
    ctx.strokeStyle='#8d959e'; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x,yy+12); ctx.lineTo(x-6+pas*4,yy+25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,yy+12); ctx.lineTo(x+6-pas*4,yy+25); ctx.stroke();

    // Torse cuirassé
    ctx.fillStyle='#7d858e';
    ctx.beginPath();
    ctx.moveTo(x-15,yy-14); ctx.lineTo(x+15,yy-14);
    ctx.lineTo(x+12,yy+14); ctx.lineTo(x-12,yy+14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#9aa4ae';
    ctx.fillRect(x-15,yy-16,30,5);              // spallière
    ctx.strokeStyle='#5c646d'; ctx.lineWidth=1.5;
    for(let b=0;b<3;b++){
      ctx.beginPath(); ctx.moveTo(x-13,yy-6+b*7); ctx.lineTo(x+13,yy-6+b*7); ctx.stroke();
    }

    // Heaume fermé, une seule fente, lueur dorée derrière
    ctx.fillStyle='#8d959e';
    ctx.beginPath(); ctx.arc(x,yy-22,11,0,6.28); ctx.fill();
    ctx.fillStyle='#4a5158';
    ctx.beginPath(); ctx.arc(x,yy-22,11,Math.PI*0.15,Math.PI*0.85); ctx.fill();
    ctx.fillStyle='#12161a';
    ctx.fillRect(x-7,yy-25,14,4);
    ctx.fillStyle='#e0b84a';
    ctx.fillRect(x-5,yy-24,3,2); ctx.fillRect(x+2,yy-24,3,2);
    ctx.fillStyle='#c9a02a';                    // cimier
    ctx.fillRect(x-2,yy-38,4,14);

    // Grand pavois, levé quand il protège vraiment
    ctx.save();
    ctx.translate(x-14*dir,yy+2);
    ctx.rotate(garde ? -0.25*dir : 0);
    ctx.fillStyle='#5f5346';
    ctx.beginPath();
    ctx.moveTo(0,-20); ctx.lineTo(11*-dir,-15);
    ctx.lineTo(11*-dir,14); ctx.lineTo(0,22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#c9a02a'; ctx.lineWidth=2;
    ctx.stroke();
    ctx.fillStyle='#c9a02a';                    // emblème : couronne
    ctx.fillRect(4*-dir,-6,6,2);
    ctx.fillRect(4*-dir,-11,2,5); ctx.fillRect(8*-dir,-11,2,5);
    ctx.restore();

    // Masse d'armes, levée à l'attaque
    const coup=attacking ? Math.abs(Math.sin(tk*0.3))*0.9 : 0;
    ctx.save();
    ctx.translate(x+14*dir,yy-2);
    ctx.rotate(-coup*dir);
    ctx.strokeStyle='#6b5a3a'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo(4*dir,-16); ctx.stroke();
    ctx.fillStyle='#8d959e';
    ctx.beginPath(); ctx.arc(4*dir,-19,5,0,6.28); ctx.fill();
    ctx.restore();
  }

  else if(t==='richSkeleton'){
    // Squelette couronné : sa richesse se VOIT et grossit avec son trésor.
    const tres=this.tresor||0;
    const bouscule=this.pousse>0 ? (Math.random()-0.5)*3 : 0;
    const xr=x+bouscule;

    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(xr,yy+24,13,4,0,0,6.28); ctx.fill();

    // Halo doré qui s'intensifie à mesure que le magot grossit
    if(tres>0){
      const inten=Math.min(0.30,0.06+tres*0.006);
      ctx.fillStyle='rgba(255,205,90,'+inten.toFixed(3)+')';
      ctx.beginPath(); ctx.arc(xr,yy-2,24+Math.min(12,tres*0.3),0,6.28); ctx.fill();
    }
    // Pièces qui tournoient autour de lui, une par tranche de 8 or
    const nbPieces=Math.min(5,Math.floor(tres/8));
    for(let c=0;c<nbPieces;c++){
      const ang=tk*0.05+c*(6.28/Math.max(1,nbPieces));
      ctx.fillStyle='#ffd85a';
      ctx.beginPath();
      ctx.ellipse(xr+Math.cos(ang)*26,yy-4+Math.sin(ang)*10,3,4,0,0,6.28);
      ctx.fill();
    }

    // Cape dorée qui ondule
    const ond=Math.sin(tk*0.11)*3;
    ctx.fillStyle='#7d5f18';
    ctx.beginPath();
    ctx.moveTo(xr,yy-16);
    ctx.lineTo(xr+16,yy+16);
    ctx.quadraticCurveTo(xr+8+ond,yy+24,xr,yy+21);
    ctx.quadraticCurveTo(xr-8-ond,yy+24,xr-16,yy+16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#a67f22';
    ctx.fillRect(xr-13,yy-16,26,5);             // col de fourrure

    // Ossature et crâne
    ctx.strokeStyle='#e8e4d8'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(xr,yy-10); ctx.lineTo(xr,yy+4); ctx.stroke();
    ctx.fillStyle='#e8e4d8';
    ctx.beginPath(); ctx.arc(xr,yy-22,8.5,0,6.28); ctx.fill();
    ctx.fillStyle='#c2bcae';
    ctx.fillRect(xr-5,yy-18,10,4);
    ctx.fillStyle='rgba(0,0,0,0.8)';
    ctx.beginPath(); ctx.arc(xr-3,yy-24,2.4,0,6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(xr+3,yy-24,2.4,0,6.28); ctx.fill();
    ctx.fillStyle='#ffd85a';
    ctx.beginPath(); ctx.arc(xr-3,yy-24,1.2,0,6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(xr+3,yy-24,1.2,0,6.28); ctx.fill();

    // Couronne à cinq pointes
    ctx.fillStyle='#f0d060';
    ctx.fillRect(xr-10,yy-34,20,4);
    for(let c=0;c<5;c++) ctx.fillRect(xr-9+c*4.5,yy-40,2.5,7);
    ctx.fillStyle='#ff5a5a';
    ctx.fillRect(xr-1,yy-33,3,2);               // rubis central

    // Lanterne de régénération
    const lueur=4+Math.sin(tk*0.15)*2;
    ctx.fillStyle='rgba(255,220,120,0.22)';
    ctx.beginPath(); ctx.arc(xr+16*dir,yy+2,lueur+9,0,6.28); ctx.fill();
    ctx.fillStyle='#ffe08a';
    ctx.beginPath(); ctx.arc(xr+16*dir,yy+2,lueur,0,6.28); ctx.fill();

    // Compteur de trésor au-dessus de la tête
    if(tres>0){
      ctx.fillStyle='#ffd85a';
      ctx.font='bold 11px Arial';
      ctx.fillText('💰'+tres,xr-12,yy-44);
    }
    if(this.pousse>0) this.pousse--;
  }

  else if(t==='necromancer'){
    // Âmes captives qui tournoient autour de lui : sa marque visuelle
    for(let a=0;a<3;a++){
      const ang=tk*0.045+a*2.09;
      const ax=x+Math.cos(ang)*24, ay=yy-6+Math.sin(ang)*9;
      const av=0.20+0.18*Math.sin(tk*0.1+a);
      ctx.fillStyle='rgba(170,120,230,'+av.toFixed(2)+')';
      ctx.beginPath(); ctx.arc(ax,ay,5,0,6.28); ctx.fill();
      ctx.fillStyle='rgba(220,190,255,'+(av+0.25).toFixed(2)+')';
      ctx.beginPath(); ctx.arc(ax,ay,2,0,6.28); ctx.fill();
    }
    ctx.fillStyle='rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x,yy+24,15,5,0,0,6.28); ctx.fill();

    // Robe qui ondule en bas, plutôt qu'un triangle rigide
    const ond=Math.sin(tk*0.1)*3;
    ctx.fillStyle='#241a30';
    ctx.beginPath();
    ctx.moveTo(x,yy-26);
    ctx.lineTo(x+18,yy+18);
    ctx.quadraticCurveTo(x+9+ond,yy+26,x,yy+23);
    ctx.quadraticCurveTo(x-9-ond,yy+26,x-18,yy+18);
    ctx.closePath(); ctx.fill();
    // Plis de tissu
    ctx.strokeStyle='rgba(120,90,170,0.35)'; ctx.lineWidth=1.5;
    for(let f=-1;f<2;f++){
      ctx.beginPath();
      ctx.moveTo(x+f*7,yy-14);
      ctx.quadraticCurveTo(x+f*9,yy+4,x+f*8+ond*f,yy+22);
      ctx.stroke();
    }
    // Capuche : ombre profonde, on ne voit que les yeux
    ctx.fillStyle='#392b4e';
    ctx.beginPath(); ctx.arc(x,yy-24,13,Math.PI,0); ctx.fill();
    ctx.fillStyle='#150f1d';
    ctx.beginPath(); ctx.arc(x,yy-20,9,0,6.28); ctx.fill();
    const ecl=0.6+0.4*Math.sin(tk*0.14);
    ctx.fillStyle='rgba(160,80,240,'+ecl.toFixed(2)+')';
    ctx.beginPath(); ctx.arc(x-3.5,yy-21,2.2,0,6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(x+3.5,yy-21,2.2,0,6.28); ctx.fill();

    // Bâton noueux et orbe d'âmes qui pulse
    ctx.strokeStyle='#4a3520'; ctx.lineWidth=3.5; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(x+17*dir,yy+22);
    ctx.quadraticCurveTo(x+16*dir,yy-6,x+13*dir,yy-30);
    ctx.stroke();
    const pulse=4+Math.sin(tk*0.2)*1.8;
    ctx.fillStyle='rgba(150,90,220,0.22)';
    ctx.beginPath(); ctx.arc(x+13*dir,yy-34,pulse+9,0,6.28); ctx.fill();
    ctx.fillStyle='rgba(180,120,240,0.45)';
    ctx.beginPath(); ctx.arc(x+13*dir,yy-34,pulse+4,0,6.28); ctx.fill();
    ctx.fillStyle='#e0c8ff';
    ctx.beginPath(); ctx.arc(x+13*dir,yy-34,pulse,0,6.28); ctx.fill();
    // Petit crâne fixé au sommet du bâton
    ctx.fillStyle='#e6e0d0';
    ctx.beginPath(); ctx.arc(x+13*dir,yy-34,3,0,6.28); ctx.fill();
  }

  else if(t==='bannerman'){
    // Chevalier en armure ; la bannière n'est là qu'avant sa chute
    if(!this.banniereTombee || this.banniereChute>0){
      const chute=this.banniereChute>0 ? (40-this.banniereChute)/40 : 0;
      ctx.save();
      ctx.translate(x-14*dir,yy+20);
      ctx.rotate(chute*1.5*dir);
      ctx.strokeStyle='#6b4a2a'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-56); ctx.stroke();
      const ond=Math.sin(tk*0.15)*3;
      ctx.fillStyle=this.team==='player'?'#2f6fd0':'#c02a2a';
      ctx.beginPath();
      ctx.moveTo(0,-54);
      ctx.lineTo(26*dir+ond,-50);
      ctx.lineTo(20*dir+ond,-38);
      ctx.lineTo(26*dir+ond,-26);
      ctx.lineTo(0,-30);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffd24a';
      ctx.beginPath(); ctx.arc(12*dir+ond,-40,4,0,6.28); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle=this.banniereTombee?'#8a8a8a':'#b9c2cc';   // armure ternie après la chute
    ctx.beginPath();
    ctx.moveTo(x,yy-20); ctx.lineTo(x+15,yy+22); ctx.lineTo(x-15,yy+22);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#8d959e';
    ctx.beginPath(); ctx.arc(x,yy-24,10,0,6.28); ctx.fill();
    ctx.fillStyle='#20262c';
    ctx.fillRect(x-6,yy-27,12,4);                            // fente du heaume
    if(!this.banniereTombee){
      ctx.fillStyle='#ffd24a';                               // plumet doré
      ctx.beginPath(); ctx.arc(x,yy-34,4,0,6.28); ctx.fill();
    }
  }

  else { // squelette simple, relevé ou de la carte
    const sortie=this.leverAnim>0 ? this.leverAnim/25 : 0;
    ctx.globalAlpha=1-sortie*0.55;
    const dy=sortie*22;
    const marche=Math.sin(tk*0.22);            // balancement des jambes
    const os=this.boostOs?'#fff3c8':'#e8e4d8';
    const osOmbre=this.boostOs?'#d8b878':'#b0aa98';

    // Ombre portée : ancre la silhouette sur le terrain
    ctx.fillStyle='rgba(0,0,0,0.20)';
    ctx.beginPath(); ctx.ellipse(x,yy+22+dy,11,4,0,0,6.28); ctx.fill();

    if(this.boostOs){                          // halo doré du Général
      const puls=18+Math.sin(tk*0.16)*3;
      ctx.fillStyle='rgba(255,215,110,0.16)';
      ctx.beginPath(); ctx.arc(x,yy+2+dy,puls,0,6.28); ctx.fill();
    }

    ctx.lineCap='round';
    // Jambes animées
    ctx.strokeStyle=osOmbre; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x,yy+10+dy); ctx.lineTo(x-5+marche*4,yy+21+dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,yy+10+dy); ctx.lineTo(x+5-marche*4,yy+21+dy); ctx.stroke();

    // Colonne, côtes courbées et épaules
    ctx.strokeStyle=os; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x,yy-7+dy); ctx.lineTo(x,yy+10+dy); ctx.stroke();
    ctx.lineWidth=2;
    const larg=[7,6,4];
    for(let c=0;c<3;c++){
      ctx.beginPath();
      ctx.moveTo(x-larg[c],yy-4+c*5+dy);
      ctx.quadraticCurveTo(x,yy-2+c*5+dy,x+larg[c],yy-4+c*5+dy);
      ctx.stroke();
    }
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x-7,yy-6+dy); ctx.lineTo(x+7,yy-6+dy); ctx.stroke();

    // Crâne : mâchoire et orbites lumineuses
    ctx.fillStyle=os;
    ctx.beginPath(); ctx.arc(x,yy-14+dy,7,0,6.28); ctx.fill();
    ctx.fillStyle=osOmbre;
    ctx.fillRect(x-4,yy-10+dy,8,4);
    const lueur=this.boostOs?'#ffcc55':'#a06fe0';
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath(); ctx.arc(x-2.5,yy-15+dy,2.2,0,6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(x+2.5,yy-15+dy,2.2,0,6.28); ctx.fill();
    ctx.fillStyle=lueur;
    ctx.beginPath(); ctx.arc(x-2.5,yy-15+dy,1.2,0,6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(x+2.5,yy-15+dy,1.2,0,6.28); ctx.fill();

    // Bras armé, qui se lève pour frapper
    const frappe=attacking ? Math.abs(Math.sin(tk*0.35))*0.9 : 0;
    ctx.save();
    ctx.translate(x+7*dir,yy-4+dy);
    ctx.rotate(-frappe*dir);
    ctx.strokeStyle=os; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(6*dir,7); ctx.stroke();
    ctx.strokeStyle='#8a7f68'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(6*dir,7); ctx.lineTo(13*dir,-6); ctx.stroke();
    ctx.strokeStyle='#b8ad92'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(7*dir,6); ctx.lineTo(12*dir,-4); ctx.stroke();
    ctx.restore();

    // Mottes de terre qui retombent à la sortie de tombe
    if(sortie>0){
      for(let g=0;g<4;g++){
        ctx.fillStyle='rgba(90,70,50,'+(sortie*0.7).toFixed(2)+')';
        ctx.fillRect(x-12+Math.random()*24,yy+12+dy-Math.random()*14,3,3);
      }
    }
    if(this.soinFlash>0){                       // étincelle de régénération
      ctx.fillStyle='rgba(255,220,120,0.9)';
      ctx.fillRect(x-3+Math.random()*10,yy-26-Math.random()*8,3,3);
      this.soinFlash--;
    }
    ctx.globalAlpha=1;
    if(this.leverAnim>0) this.leverAnim--;
  }

  if(this.banniereChute>0) this.banniereChute--;
  ctx.restore();
  return;
}

// Récupérer les frames pré-chargées
const imgs = UNIT_IMGS[t];
if(imgs){
  const anim = attacking ? imgs.a : imgs.w;
  const speed = attacking ? 10 : 7;
  const fi = Math.floor(tk/speed) % anim.length;
  const img = anim[fi];
  const sizes = {
    cavalier:190, dragon:190, mole:170, giant:165,
    knight:145, guardian:145, archer:145, mage:145,
    healer:138, ninja:138, pyromancer:145, kamikaze:135,
    trebuchet:148, cryomancer:145, electromancer:145
  };
  const sz = sizes[t] || 145;

  ctx.save();
  if(dir===-1){
    ctx.translate(x,y);
    ctx.scale(-1,1);
    if(img.complete&&img.naturalWidth>0)
      ctx.drawImage(img,-sz/2,-sz/2,sz,sz);
  } else {
    if(img.complete&&img.naturalWidth>0)
      ctx.drawImage(img,x-sz/2,y-sz/2,sz,sz);
  }
  ctx.restore();
} else {
  // Fallback cercle pour types inconnus
  ctx.fillStyle='#888';
  ctx.beginPath();ctx.arc(x,y,15,0,6.28);ctx.fill();
}

// Barre de charge cavalier (dynamique)
if(t==='cavalier'){
  const sp=(this.chargeSpeed||this.speed)/this.speed;
  if(sp>1.02){
    const barW=40, filled=Math.min(barW*((sp-1)/2),barW);
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(x-20,y-50,barW,6,3);ctx.fill();
    ctx.fillStyle=sp>2.5?'#ff2200':sp>1.8?'#ff8800':'#ffdd00';
    ctx.beginPath();ctx.roundRect(x-20,y-50,filled,6,3);ctx.fill();
  }
}

// Jauge cooldown taupe (dynamique)
if(t==='mole'&&this.burrow<=0){
  const ratio=1-(this.burrowCd/360);
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(x-20,y-46,40,6,3);ctx.fill();
  ctx.fillStyle=ratio>0.8?'#cc4400':ratio>0.5?'#ff8800':'#8b4513';
  ctx.beginPath();ctx.roundRect(x-20,y-46,40*ratio,6,3);ctx.fill();
}

// Barre de vie
const bw=38, bh=5, hr=Math.max(0,this.hp/(this.maxHp||1));
ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();ctx.roundRect(x-bw/2-1,y-46,bw+2,bh+2,3);ctx.fill();
ctx.fillStyle='#333';ctx.beginPath();ctx.roundRect(x-bw/2,y-45,bw,bh,2);ctx.fill();
ctx.fillStyle=hr>0.6?'#22dd55':hr>0.3?'#ffaa00':'#ee2222';
ctx.beginPath();ctx.roundRect(x-bw/2,y-45,bw*hr,bh,2);ctx.fill();

// Effets statut
if(this.burnTime>0){
  for(let i=0;i<3;i++){
    ctx.fillStyle=i%2?'#ff6600':'#ff2200';ctx.globalAlpha=0.6+Math.random()*0.3;
    ctx.beginPath();ctx.arc(x-10+Math.random()*20,y+Math.random()*16,3,0,6.28);ctx.fill();
    ctx.globalAlpha=1;
  }
}
if(this.slowTime>0){ctx.fillStyle='rgba(80,180,255,0.18)';ctx.beginPath();ctx.arc(x,y,24,0,6.28);ctx.fill();}
if(this.electricTime>0){
  ctx.strokeStyle='rgba(255,255,0,0.7)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+Math.random()*24-12,y-18);ctx.lineTo(x+Math.random()*24-12,y+8);ctx.stroke();
}
}
}

// ---------- FICHES : noms, pouvoirs et statistiques ----------
const INFOS_UNITES = {
 knight:      {nom:'Chevalier',        pouvoir:'Combattant équilibré, bon partout. Rien de spécial, mais rien de faible.'},
 archer:      {nom:'Archer',           pouvoir:'Tire à 200 de distance. Très fragile : il meurt vite si on l\'atteint.'},
 guardian:    {nom:'Gardien',          pouvoir:'Le mur du jeu. Il encaisse pour les autres mais frappe peu et avance lentement.'},
 ninja:       {nom:'Ninja',            pouvoir:'Le plus rapide au corps à corps. Frappe fort, meurt vite.'},
 kamikaze:    {nom:'Kamikaze',         pouvoir:'Explose au contact pour 100 dégâts d\'un coup, puis disparaît. 80 contre les bâtiments.'},
 healer:      {nom:'Soigneur',         pouvoir:'Ne se bat jamais et ne fait aucun dégât aux bâtiments. Il régénère les alliés à moins de 90.'},
 mage:        {nom:'Mage',             pouvoir:'Projectiles puissants à 180 de distance, sur une seule cible.'},
 cavalier:    {nom:'Cavalier',         pouvoir:'Charge : plus il court longtemps avant l\'impact, plus il fait mal. De 10 à 38 selon son élan.'},
 giant:       {nom:'Géant',            pouvoir:'N\'attaque JAMAIS les unités et se laisse frapper sans riposter. Il ne vise que les tours et le château, à 18 par coup.'},
 trebuchet:   {nom:'Trébuchet',       pouvoir:'Machine de siège, chère mais dévastatrice. IMMOBILE toute seule : son servant la pousse, et d\'autres alliés peuvent venir aider — plus il y a de pousseurs, plus elle avance. Elle vise en priorité les ennemis LES PLUS LOIN, tire lentement mais très fort, et son bloc de pierre touche tout un groupe en le repoussant. Solide de face, vite submergée si on l\'encercle. Quand elle est détruite, le servant tire l\'épée.'},
 siegeman:    {nom:'Servant du Trébuchet', pouvoir:'Il pousse la machine et appelle les alliés proches à la rescousse. Sans armure et peu puissant, mais il sait rester derrière. Quand le trébuchet tombe, il dégaine son épée et se bat. Ne s\'achète pas.'},
 electromancer:{nom:'Électromancien',  pouvoir:'Dégâts de ZONE dans un rayon de 105 : la cible visée prend tout, les ennemis autour la moitié. Plus faible que le mage contre une cible seule, meilleur dès 3 ennemis groupés. Aucun effet de zone sur les bâtiments.'},
 cryomancer:  {nom:'Cryomancien',      pouvoir:'Gèle sa cible 4 secondes : elle avance et frappe 40% plus lentement. Portée 260.'},
 pyromancer:  {nom:'Pyromancien',      pouvoir:'Enflamme sa cible : elle continue de brûler 3 secondes après le coup. Portée 180.'},
 dragon:      {nom:'Dragon',           pouvoir:'Vole au-dessus de la mêlée : les unités au sol ne peuvent pas le bloquer. Portée 200.'},
 mole:        {nom:'Taupe',            pouvoir:'Creuse sous le terrain, intouchable pendant le trajet, et ressort au milieu des ennemis. Énormes dégâts.'},
 lizard:      {nom:'Lézard à Casque', pouvoir:'Projette sa LANGUE jusqu\'à 265 pour enrouler un ennemi et le ramener d\'un coup sur la pointe de son casque : 34 dégâts d\'empalement, puis il l\'achève à coups de griffes. Sa proie ne peut plus bouger pendant la traction. Les colosses de plus de 420 PV sont trop lourds pour être arrachés du sol.'},
 necromancer: {nom:'Nécromancien',     pouvoir:'Toute unité qui meurt à moins de 240 de lui — ALLIÉE OU ENNEMIE — se relève en squelette dans TON camp. Ces squelettes relevés ne ressuscitent PAS quand ils meurent. Maximum 10 à la fois. Fragile : il tire à 200 mais tombe vite.'},
 bannerman:   {nom:'Porte-étendard',   pouvoir:'DEUX barres de vie : 190 puis 105. Tant que la bannière tient, les alliés à moins de 150 frappent +25% et avancent +15%. Quand elle tombe, l\'aura s\'éteint et il redevient un simple chevalier.'},
 skeletonCard:{nom:'Squelette',        pouvoir:'Pas cher et rapide. Quand il meurt, il ressort de terre 2 secondes plus tard à l\'endroit exact où il est tombé — UNE SEULE FOIS. Fragile.'},
 hauntedCarriage:{nom:'Calèche hantée',pouvoir:'Ne combat JAMAIS. Elle fonce tout droit et écrase pour 16 ce qu\'elle percute, en s\'abîmant à chaque choc — elle finit donc toujours par se briser. À sa destruction, le SQUELETTE RICHE en sort avec ses 2 gardes du corps.'},
 skeletonGeneral:{nom:'Général Squelette',pouvoir:'Son épée balaie TOUS les ennemis à moins de 90 de sa cible. Très lent. Il arrive escorté de 3 squelettes et sa mort en libère 4 autres — ces squelettes-là ne ressuscitent PAS. Tant qu\'il vit, TOUS les squelettes du terrain, les tiens COMME ceux de l\'ennemi, deviennent dorés : ils encaissent 40% de dégâts en moins et frappent 50% plus fort.'},
 skeleton:    {nom:'Squelette relevé', pouvoir:'Invoqué par le Nécromancien ou le Général. Ne s\'achète pas et ne ressuscite pas.'},
 richSkeleton:{nom:'Squelette Riche',  pouvoir:'Sort de la calèche brisée avec 2 gardes du corps. Tant qu\'il vit : il se régénère, soigne les squelettes autour de lui, ses PV maximum montent lentement (+3/s jusqu\'à +180) et il AMASSE DE L\'OR (+1 toutes les 1,5 s, jusqu\'à 40). Quand il meurt, tout son or te revient et tu peux le dépenser aussitôt. Ne s\'achète pas.'},
 boneGuard:   {nom:'Garde du Corps',   pouvoir:'Grand squelette cuirassé au pavois. Il ne combat pas au hasard : il frappe en priorité l\'ennemi le plus proche du Squelette Riche, s\'interpose entre eux, et POUSSE le Riche vers l\'arrière quand la menace approche. Ne s\'achète pas.'}
};

// Les chiffres exacts, lus directement sur les vraies statistiques du jeu :
// pas de recopie à la main qui finirait par mentir après un rééquilibrage.
function statsUnite(k){
  try{
    const u=new Unit(k,'player',0);
    return {pv:Math.round(u.maxHp), dgt:Math.round(u.dmg*10)/10,
            portee:u.range, vitesse:u.speed, bat:degatsBatiment(u)};
  }catch(e){ return null; }
}
function ligneStats(k){
  const st=statsUnite(k);
  if(!st) return '';
  const corpsACorps = st.portee<=45;
  return '❤️ ' + st.pv + ' PV'
       + (st.dgt>0 ? ' · ⚔️ ' + st.dgt + ' dégâts' : ' · ⚔️ aucun dégât')
       + ' · 🏰 ' + st.bat + ' aux bâtiments'
       + ' · 🎯 ' + (corpsACorps ? 'corps à corps' : 'portée ' + st.portee);
}

function nomUnite(k){ return (INFOS_UNITES[k] && INFOS_UNITES[k].nom) || k; }
function pouvoirUnite(k){ return (INFOS_UNITES[k] && INFOS_UNITES[k].pouvoir) || ''; }


// ---------- PROFILS UTILISÉS PAR L'IA ----------
const unitMeta={
 knight:{rarity:'common',role:'tank'},
 archer:{rarity:'common',role:'ranged'},
 guardian:{rarity:'common',role:'tank'},
 healer:{rarity:'common',role:'support'},
 ninja:{rarity:'common',role:'assassin'},
 kamikaze:{rarity:'common',role:'offense'},
 mage:{rarity:'rare',role:'ranged'},
 trebuchet:{rarity:'epic',role:'ranged'},
 giant:{rarity:'epic',role:'tank'},
 dragon:{rarity:'epic',role:'offense'},
 cryomancer:{rarity:'epic',role:'control'},
 pyromancer:{rarity:'epic',role:'offense'},
 electromancer:{rarity:'epic',role:'control'},
 mole:{rarity:'legendary',role:'assassin'},
 cavalier:{rarity:'rare',role:'offense'},
 necromancer:{rarity:'epic',role:'control'},
 lizard:{rarity:'epic',role:'melee'},
 bannerman:{rarity:'rare',role:'offense'},
 skeletonCard:{rarity:'rare',role:'offense'},
 hauntedCarriage:{rarity:'epic',role:'offense'},
 skeletonGeneral:{rarity:'legendary',role:'tank'},
 trebuchet:{rarity:'mythic',role:'ranged'}
};

