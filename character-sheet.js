// ============================================================
// CHARACTER SHEET WORLD SCRIPT — Foundry VTT v11.315 | DnD5e 2.4.1
// Place this file at: Data/modules/my-world-scripts/scripts/character-sheet.js
// Enable the module in Settings → Manage Modules
// ============================================================

const CS_ELEMENTS     = ["Yin","Earth","Lightning","Fire","Order","Water","Wind","Yang"];
const CS_WEAPON_CLASS = ["Axe","Bow","Gauntlet","Gun","Knife","Lance","Staff","Sword","Tome","Whip"];
const CS_METALS       = ["Copper","Tin","Bronze","Iron","Silver","Steel","Gold","Electrum","Platinum","Tungsten","Meteorite","Obsidian","Demonite","Bloodstone","Titanium","Palladium","Cobalt","Orichalcum","Mythril","Adamantite","Iridium","Astral","Divine"];
const CS_METAL_TIERS  = {
  Copper:1, Tin:1, Bronze:2, Iron:2, Silver:3, Steel:3, Gold:4, Electrum:4,
  Platinum:5, Tungsten:5, Meteorite:6, Obsidian:6, Demonite:7, Bloodstone:7,
  Titanium:8, Palladium:8, Cobalt:9, Orichalcum:9, Mythril:10, Adamantite:10,
  Iridium:11, Astral:11, Divine:12
};
const CS_CHAR_CLASSES = ["Alchemist","Archer","Artificer","Bard","Druid","Gambler","Gunslinger","Healer","Mage","Researcher","Ritualist","Rogue","Spellknight","Summoner","Warrior"];
const CS_SOUL_TRAITS  = ["Monster","Kindness","Patience","Bravery","Justice","Integrity","Perseverance","Determination","7 Soul Magic","NEO Monster","NEO Kindness","NEO Patience","NEO Bravery","NEO Justice","NEO Integrity","NEO Perseverance","NEO Determination","Omniversal","TRUE Champion"];
const CS_SOUL_TYPES   = ["Monster","Kindness","Patience","Bravery","Justice","Integrity","Perseverance","Determination"];
const CS_RANKS        = ["Bronze","Silver","Gold","Diamond","Platinum","Legendary","Bronze+","Silver+","Gold+","Diamond+","Platinum+","Legendary+"];
const CS_RANK_MULT    = {
  Bronze:1, Silver:2, Gold:3, Diamond:4, Platinum:5, Legendary:6,
  "Bronze+":6.5, "Silver+":7, "Gold+":7.5, "Diamond+":8, "Platinum+":8.5, "Legendary+":9
};
const CS_ARMOR_SLOTS  = ["Head","Body","Left Arm","Right Arm","Left Leg","Right Leg"];
const CS_ACC_SLOTS    = ["Accessory 1","Accessory 2","Accessory 3","Accessory 4"];
const CS_TAG_PL       = { Novice:10, Skilled:20, Expert:30, Elite:40, Master:50, X:50 };
const CS_SYNC_MAX     = 500;
const CS_HP_MAX       = 10000;
const CS_MP_MAX       = 10000;
const CS_ASC_MAX      = 10;
const CS_LUCK_MAX     = 7;
const CS_ATTR_MIN     = -20;
const CS_ATTR_MAX     = 20;

// Special tag PL overrides — applied at mastery tier X only
const CS_SPECIAL_TAG_PL = {
  "god":                    700,
  "demi-god":               350,
  "divine knight":          175,
  "ultimate lifeform":      100,
  "exhibitionist":          200,
  "ultimate limit breaker": 50
};

// ============================================================
// Shared inventory constants
// ============================================================

const CS_INV_BOOSTER_PACKS = [
  "Level 1","Level 2","Level 3","Level 4","Level 5","Level 6","Level 7","Level 8",
  "Base","Copper","Bronze","Silver","Gold","Platinum","Diamond","Ghost","Crystal",
  "Rainbow","Starlight","Galaxy","Prismatic"
];
const CS_INV_UPGRADE_CARDS = [
  "Common","Uncommon","Rare","Very Rare","Secret Rare","Ultra Rare","Ultimate Rare",
  "Mythic Rare","Copper Rare","Bronze Rare","Silver Rare","Gold Rare","Platinum Rare",
  "Diamond Rare","Ghost Rare","Crystal Secret Rare","Rainbow Ultra Rare",
  "Starlight Ultimate Rare","Galaxy Mythic Rare","Prismatic Mythic Rare"
];
const CS_INV_ORES   = [
  "Copper","Tin","Iron","Silver","Gold","Platinum","Tungsten","Meteorite","Obsidian",
  "Demonite","Bloodstone","Cobalt","Orichalcum","Mythril","Adamantite","Iridium","Astral"
];
const CS_INV_INGOTS = [
  "Copper","Tin","Iron","Bronze","Steel","Silver","Gold","Electrum","Platinum","Tungsten",
  "Meteorite","Obsidian","Demonite","Bloodstone","Titanium","Palladium","Cobalt",
  "Orichalcum","Mythril","Adamantite","Iridium","Astral","Divine"
];
const CS_INV_GEMS   = [
  "Onyx","Garnet","Topaz","Ruby","Sapphire","Emerald","Diamond","Aquamarine","Peridot","Opal"
];
const CS_INV_SOUL_DEFS = [
  { name:"Green Soul",  emoji:"💚", soulType:"Kindness"      },
  { name:"Cyan Soul",   emoji:"🩵", soulType:"Patience"      },
  { name:"Orange Soul", emoji:"🧡", soulType:"Bravery"       },
  { name:"Yellow Soul", emoji:"💛", soulType:"Justice"       },
  { name:"Blue Soul",   emoji:"💙", soulType:"Integrity"     },
  { name:"Purple Soul", emoji:"💜", soulType:"Perseverance"  },
  { name:"Red Soul",    emoji:"❤️", soulType:"Determination" }
];

// ============================================================
// Core helper functions
// ============================================================

function csTier(m)      { return CS_METAL_TIERS[m] || 1; }
function csLaserDur(m)  { const t = csTier(m); return t <= 3 ? t * 10 * 3 : t * 10; }
function csEnchSlots(m) { const t = csTier(m); return t<=3?1:t<=6?2:t<=9?3:t<=11?4:5; }

// Returns the PL bonus for a single tag, respecting special overrides and Ascended Tags
function csTagPLBonus(t) {
  if (!t.name || !t.mastery) return 0;
  // Ascended Tags store their combined PL directly on the object
  if (t.condensedTags && Array.isArray(t.condensedTags)) return t.plBonus || 0;
  if (t.mastery === "X") {
    const override = CS_SPECIAL_TAG_PL[t.name.trim().toLowerCase()];
    return override !== undefined ? override : CS_TAG_PL["X"];
  }
  return CS_TAG_PL[t.mastery] || 0;
}

// Renders an inline progress bar
function csBar(current, max, color = "#888", height = "10px") {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return `<div style="background:#ddd;border-radius:3px;height:${height};width:100%;display:inline-block;">
    <div style="background:${color};border-radius:3px;height:${height};width:${pct}%;"></div>
  </div>`;
}

// ============================================================
// Power Level calculation
// ============================================================

function csCalcPL(d) {
  const rankMult  = CS_RANK_MULT[d.rank] || 1;
  const multParts = String(d.additionalMultipliers || "1")
    .split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0);
  const addMult   = multParts.length > 0 ? multParts.reduce((a, b) => a * b, 1) : 1;
  const totalMult = rankMult * addMult;

  // Tag bonus — uses special overrides for tier X tags and Ascended Tag plBonus
  const tagBonus = (d.tags || []).reduce((s, t) => s + csTagPLBonus(t), 0);

  // Equipment bonuses — tier × 10 per piece
  const weaponBonus = csTier(d.weaponMetal || "Copper") * 10;
  const armorBonus  = (d.armor       || []).reduce((s, p) => s + csTier(p.material || "Copper") * 10, 0);
  const accBonus    = (d.accessories || []).reduce((s, a) => s + csTier(a.material || "Copper") * 10, 0);

  // Soul set bonus — full sets of all 7 non-Monster types × +500
  const soulSetTypes = ["Kindness","Patience","Bravery","Justice","Integrity","Perseverance","Determination"];
  const souls        = d.soulsAbsorbed || {};
  const fullSets     = soulSetTypes.length > 0 ? Math.min(...soulSetTypes.map(s => souls[s] || 0)) : 0;
  const soulBonus    = fullSets * 500;

  const bonusPL   = (d.bonusPowerLevel || 0) + tagBonus + weaponBonus + armorBonus + accBonus + soulBonus;

  // Attribute and stat contributions — uses max HP/MP (potential, not current state)
  const attrBonus = ((d.physical || 0) + (d.social || 0) + (d.mental || 0)) * 100;
  const statBonus = (d.hpMax || d.hp || 0) / 5 + (d.mpMax || d.mp || 0) / 5;

  // Ascension multiplier: (ascension / 2) + 1
  const ascMult = ((d.ascension || 0) / 2) + 1;

  // Final formula — rounded up
  const total = Math.ceil(
    (((d.basePowerLevel || 0) + bonusPL) * totalMult + attrBonus + statBonus) * ascMult
  );

  return {
    rankMult, addMult, multParts, totalMult,
    tagBonus, weaponBonus, armorBonus, accBonus,
    soulBonus, fullSets, bonusPL,
    attrBonus, statBonus, ascMult, total
  };
}

// ============================================================
// Journal page HTML generator
// ============================================================

function csPageHTML(d) {
  const pl         = csCalcPL(d);
  const laserT     = csTier(d.miningLaserType);
  const laserMax   = d.laserDurabilityMax     ?? csLaserDur(d.miningLaserType);
  const laserCur   = d.laserDurabilityCurrent ?? laserMax;
  const weaponEnch = csEnchSlots(d.weaponMetal || "Copper");
  const armorEnch  = (d.armor       || []).reduce((s, p) => s + csEnchSlots(p.material), 0);
  const accEnch    = (d.accessories || []).reduce((s, a) => s + csEnchSlots(a.material), 0);

  // Current/max values with fallbacks for backward compatibility
  const hpMax   = d.hpMax      ?? d.hp   ?? 0;
  const hpCur   = d.hpCurrent  ?? hpMax;
  const mpMax   = d.mpMax      ?? d.mp   ?? 0;
  const mpCur   = d.mpCurrent  ?? mpMax;
  const syncMax = d.syncMax    ?? CS_SYNC_MAX;
  const syncCur = d.syncCurrent ?? d.sync ?? syncMax;

  const TH = "padding:4px 8px;border:1px solid #999;background:#333;color:#fff;text-align:left;font-size:0.88em;";
  const TD = "padding:3px 6px;border:1px solid #ddd;font-size:0.88em;";

  // ── Element mastery rows ──
  const elemRows = CS_ELEMENTS.map(el => {
    const val = ((d.elementMastery || {})[el]) ?? ((d.elementMasteryCurrent || {})[el]) ?? 0;
    const aff = el === d.element1 || el === d.element2;
    return `<tr>
      <td style="${TD}font-weight:${aff?"bold":"normal"};color:${aff?"#1a1a8c":"#111"};">${el}${aff?" ★":""}</td>
      <td style="${TD}">${val.toLocaleString()} / 10,000</td>
      <td style="${TD}width:160px;">${csBar(val, 10000, aff?"#3a3acc":"#888")}</td>
    </tr>`;
  }).join("");

  // ── Weapon enchantment rows (always 3 fixed slots) ──
  const weapEnchRows = [0,1,2].map(i => {
    const e = (d.weaponEnchantments || [])[i] || "";
    return `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};">
      <td style="${TD}">Slot ${i+1}</td>
      <td style="${TD}">${e || `<span style="color:#aaa;font-style:italic;">Empty</span>`}</td>
    </tr>`;
  }).join("");

  // ── Armor rows with enchantment display ──
  const armorRows = (d.armor || []).map(p => {
    const enchList = (p.enchantments || []);
    const slots    = csEnchSlots(p.material);
    const enchDisp = slots > 0
      ? Array.from({ length: slots }, (_, i) => {
          const e = enchList[i] || "";
          return `<span style="font-size:0.82em;background:${e?"#dce8ff":"#f0f0f0"};border:1px solid ${e?"#99b4e0":"#ccc"};border-radius:3px;padding:1px 5px;margin:1px 2px;display:inline-block;">${e || `Slot ${i+1}: Empty`}</span>`;
        }).join(" ")
      : `<span style="font-size:0.82em;color:#aaa;font-style:italic;">No enchantment slots</span>`;
    return `<tr>
      <td style="${TD}">${p.slot}</td>
      <td style="${TD}">${p.name || "—"}</td>
      <td style="${TD}">${p.material} (T${csTier(p.material)})</td>
      <td style="${TD}text-align:center;">${slots}</td>
      <td style="${TD}">${enchDisp}</td>
    </tr>`;
  }).join("");

  // ── Accessory rows with enchantment display ──
  const accRows = (d.accessories || []).map(a => {
    const enchList = (a.enchantments || []);
    const slots    = csEnchSlots(a.material);
    const enchDisp = slots > 0
      ? Array.from({ length: slots }, (_, i) => {
          const e = enchList[i] || "";
          return `<span style="font-size:0.82em;background:${e?"#dce8ff":"#f0f0f0"};border:1px solid ${e?"#99b4e0":"#ccc"};border-radius:3px;padding:1px 5px;margin:1px 2px;display:inline-block;">${e || `Slot ${i+1}: Empty`}</span>`;
        }).join(" ")
      : `<span style="font-size:0.82em;color:#aaa;font-style:italic;">No enchantment slots</span>`;
    return `<tr>
      <td style="${TD}">${a.slot}</td>
      <td style="${TD}">${a.name || "—"}</td>
      <td style="${TD}">${a.material} (T${csTier(a.material)})</td>
      <td style="${TD}text-align:center;">${slots}</td>
      <td style="${TD}">${enchDisp}</td>
    </tr>`;
  }).join("");

  // ── Laser enchantment display ──
  const laserEnchSlots = csEnchSlots(d.miningLaserType);
  const laserEnchList  = d.laserEnchantments || [];
  const laserEnchDisp  = laserEnchSlots > 0
    ? Array.from({ length: laserEnchSlots }, (_, i) => {
        const e = laserEnchList[i] || "";
        return `<span style="font-size:0.82em;background:${e?"#dce8ff":"#f0f0f0"};border:1px solid ${e?"#99b4e0":"#ccc"};border-radius:3px;padding:1px 5px;margin:1px 2px;display:inline-block;">${e || `Slot ${i+1}: Empty`}</span>`;
      }).join(" ")
    : `<span style="font-size:0.82em;color:#aaa;font-style:italic;">No enchantment slots</span>`;

  // ── Soul rows ──
  const soulRows = CS_SOUL_TYPES.map(s =>
    `<tr>
      <td style="${TD}">${s}</td>
      <td style="${TD}text-align:right;">${((d.soulsAbsorbed || {})[s] || 0).toLocaleString()}</td>
    </tr>`
  ).join("");

  // ── Separate regular tags from Ascended Tags ──
  const regularTags      = (d.tags || []).filter(t => !t.condensedTags);
  const ascendedTagsList = (d.tags || []).filter(t => t.condensedTags && Array.isArray(t.condensedTags));

  // ── Regular tag rows ──
  const tagRows = regularTags.length > 0
    ? regularTags.map(t => {
        const plBonus = csTagPLBonus(t);
        const isSpec  = t.mastery === "X" && CS_SPECIAL_TAG_PL[t.name?.trim().toLowerCase()] !== undefined;
        return `<tr>
          <td style="${TD}">${t.name}${isSpec ? " ★" : ""}</td>
          <td style="${TD}">${t.mastery}</td>
          <td style="${TD}text-align:center;">${t.level}</td>
          <td style="${TD}text-align:right;">+${plBonus}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" style="${TD}font-style:italic;color:#666;">No regular tags assigned — run the Tag Selector macro.</td></tr>`;

  // ── Ascended Tag rows ──
  const ascendedRows = ascendedTagsList.length > 0
    ? ascendedTagsList.map(t => {
        const filled = t.condensedTags.length;
        return `<tr style="background:#f5eeff;">
          <td style="${TD}" colspan="2">
            <b style="color:#7a00cc;">✨ ${t.name}</b>
            <span style="font-size:0.8em;color:#888;margin-left:6px;">(${filled}/5 tags condensed)</span>
            <div style="margin-top:4px;">
              ${t.condensedTags.map(n => `<span style="font-size:0.8em;background:#e8d5ff;border:1px solid #c49fe8;border-radius:3px;padding:1px 5px;margin:1px 2px;display:inline-block;">${n}</span>`).join(" ")}
            </div>
          </td>
          <td style="${TD}text-align:center;">X</td>
          <td style="${TD}text-align:right;color:#7a00cc;font-weight:bold;">+${t.plBonus}</td>
        </tr>`;
      }).join("")
    : "";

  // ── Special enchantments (Emperor's Clothes etc.) ──
  const specialEnchList    = d.specialEnchantments || [];
  const specialEnchSection = specialEnchList.length > 0
    ? `<hr>
<h3>✨ Special Enchantments</h3>
<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
  ${specialEnchList.map(e => `<span style="background:#fff8dc;border:1px solid #d4af37;border-radius:4px;padding:3px 10px;font-size:0.88em;font-weight:bold;color:#7a5c00;">${e}</span>`).join("")}
</div>`
    : "";

  // ── Soul Arena Record (appended if any fights exist) ──
  const arenaStats  = d.soulArenaStats || {};
  const hasArena    = CS_INV_SOUL_DEFS.some(sd => arenaStats[sd.soulType]?.fought > 0);
  const arenaSection = hasArena ? (() => {
    const rows = CS_INV_SOUL_DEFS.map(sd => {
      const s = arenaStats[sd.soulType];
      if (!s || s.fought === 0) return null;
      const winRate = Math.round((s.won / s.fought) * 100);
      return `<tr>
        <td style="${TD}">${sd.emoji} ${sd.name}</td>
        <td style="${TD}text-align:center;">${s.fought}</td>
        <td style="${TD}text-align:center;">${s.won}</td>
        <td style="${TD}text-align:center;">${s.fought - s.won}</td>
        <td style="${TD}text-align:center;">${winRate}%</td>
      </tr>`;
    }).filter(Boolean).join("");
    const totalFought = CS_INV_SOUL_DEFS.reduce((s, sd) => s + (arenaStats[sd.soulType]?.fought || 0), 0);
    const totalWon    = CS_INV_SOUL_DEFS.reduce((s, sd) => s + (arenaStats[sd.soulType]?.won    || 0), 0);
    const totalRate   = totalFought > 0 ? Math.round((totalWon / totalFought) * 100) : 0;
    return `<hr>
<h3>👻 Soul Arena Record</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr>
    <th style="${TH}">Soul</th>
    <th style="${TH}text-align:center;">Fought</th>
    <th style="${TH}text-align:center;">Won</th>
    <th style="${TH}text-align:center;">Lost</th>
    <th style="${TH}text-align:center;">Win Rate</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr style="background:#e8e8e8;">
      <td style="${TD}"><b>Total</b></td>
      <td style="${TD}text-align:center;"><b>${totalFought}</b></td>
      <td style="${TD}text-align:center;"><b>${totalWon}</b></td>
      <td style="${TD}text-align:center;"><b>${totalFought - totalWon}</b></td>
      <td style="${TD}text-align:center;"><b>${totalRate}%</b></td>
    </tr>
  </tbody>
</table>`;
  })() : "";

  return `<h2>📋 ${d.characterName}</h2>
<p><strong>Player:</strong> ${d.playerName} &nbsp;|&nbsp; <strong>Class:</strong> ${d.characterClass} &nbsp;|&nbsp; <strong>Rank:</strong> ${d.rank} &nbsp;|&nbsp; <strong>Soul Trait:</strong> ${d.soulTrait}</p>
<p><strong>Affinities:</strong> ${d.element1} &amp; ${d.element2}</p>
<hr>
<h3>⚡ Power Level: ${pl.total.toLocaleString()}</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <tr><td style="${TD}">Base PL</td><td style="${TD}"><b>${(d.basePowerLevel||0).toLocaleString()}</b></td><td style="${TD}">Bonus PL (manual)</td><td style="${TD}">${(d.bonusPowerLevel||0).toLocaleString()}</td></tr>
  <tr><td style="${TD}">Tag Bonus PL</td><td style="${TD}">+${pl.tagBonus.toLocaleString()}</td><td style="${TD}">Weapon Bonus PL</td><td style="${TD}">+${pl.weaponBonus.toLocaleString()}</td></tr>
  <tr><td style="${TD}">Armor Bonus PL</td><td style="${TD}">+${pl.armorBonus.toLocaleString()} (${(d.armor||[]).length} pieces × tier × 10)</td><td style="${TD}">Accessory Bonus PL</td><td style="${TD}">+${pl.accBonus.toLocaleString()} (${(d.accessories||[]).length} pieces × tier × 10)</td></tr>
  <tr><td style="${TD}">Soul Set Bonus</td><td style="${TD}">+${pl.soulBonus.toLocaleString()} (${pl.fullSets} set${pl.fullSets!==1?"s":""} × 500)</td><td style="${TD}">Total Bonus PL</td><td style="${TD}">${pl.bonusPL.toLocaleString()}</td></tr>
  <tr><td style="${TD}">Rank Mult (${d.rank})</td><td style="${TD}">×${pl.rankMult}</td><td style="${TD}">Additional Mults</td><td style="${TD}">${pl.multParts.map(m=>`×${m}`).join(" × ")} = ×${pl.addMult.toFixed(4)}</td></tr>
  <tr><td style="${TD}">Total Multiplier</td><td style="${TD}">×${pl.totalMult.toFixed(4)}</td><td style="${TD}">Ascension Mult</td><td style="${TD}">×${pl.ascMult.toFixed(1)} (Asc ${d.ascension||0}/2 + 1)</td></tr>
  <tr><td style="${TD}">Attr Bonus</td><td style="${TD}">+${pl.attrBonus.toLocaleString()} (Phys+Soc+Men × 100)</td><td style="${TD}">Stat Bonus</td><td style="${TD}">+${Math.round(pl.statBonus).toLocaleString()} (HP Max/5 + MP Max/5)</td></tr>
  <tr style="background:#e8e8e8;"><td style="${TD}" colspan="2"><b>Formula: ((Base+Bonus) × Mult + Attr + Stat) × AscMult</b></td><td style="${TD}"><b>TOTAL PL</b></td><td style="${TD}"><b style="font-size:1.15em;">${pl.total.toLocaleString()}</b></td></tr>
</table>
<hr>
<h3>📊 Core Stats</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <tr>
    <td style="${TD}"><b>HP</b></td>
    <td style="${TD}">${hpCur.toLocaleString()} / ${hpMax.toLocaleString()} &nbsp;${csBar(hpCur,hpMax,"#c0392b","8px")}</td>
    <td style="${TD}"><b>MP</b></td>
    <td style="${TD}">${mpCur.toLocaleString()} / ${mpMax.toLocaleString()} &nbsp;${csBar(mpCur,mpMax,"#2980b9","8px")}</td>
  </tr>
  <tr>
    <td style="${TD}"><b>Sync</b></td>
    <td style="${TD}">${syncCur} / ${syncMax} &nbsp;${csBar(syncCur,syncMax,"#8e44ad","8px")}</td>
    <td style="${TD}"><b>Ascension</b></td>
    <td style="${TD}">${d.ascension||0} / ${CS_ASC_MAX} &nbsp;${csBar(d.ascension||0,CS_ASC_MAX,"#d35400","8px")}</td>
  </tr>
  <tr>
    <td style="${TD}"><b>Physical</b></td>
    <td style="${TD}">${d.physical||0} <span style="font-size:0.82em;color:#666;">(soft cap 10 / hard cap 20)</span></td>
    <td style="${TD}"><b>Social</b></td>
    <td style="${TD}">${d.social||0} <span style="font-size:0.82em;color:#666;">(soft cap 10 / hard cap 20)</span></td>
  </tr>
  <tr>
    <td style="${TD}"><b>Mental</b></td>
    <td style="${TD}">${d.mental||0} <span style="font-size:0.82em;color:#666;">(soft cap 10 / hard cap 20)</span></td>
    <td style="${TD}"><b>Luck</b></td>
    <td style="${TD}">${d.luck||0} / ${CS_LUCK_MAX}</td>
  </tr>
  <tr>
    <td style="${TD}"><b>Upgrade Points</b></td><td style="${TD}">${(d.upgradePoints||0).toLocaleString()}</td>
    <td style="${TD}"><b>Knowledge Points</b></td><td style="${TD}">${(d.knowledgePoints||0).toLocaleString()}</td>
  </tr>
</table>
<hr>
<h3>🌀 Ascension Points: ${(d.ascensionPoints||0).toLocaleString()} / ${(d.ascensionPointsNeeded||100000).toLocaleString()}</h3>
${csBar(d.ascensionPoints||0, d.ascensionPointsNeeded||100000, "#7a00cc", "14px")}
<hr>
<h3>✨ Element Mastery</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}">Element</th><th style="${TH}">Current / Max</th><th style="${TH}">Progress</th></tr></thead>
  <tbody>${elemRows}</tbody>
</table>
<hr>
<h3>⚔️ Weapon <span style="font-size:0.82em;font-weight:normal;">(${weaponEnch} armor enchant slot${weaponEnch!==1?"s":""} | 3 weapon enchant slots)</span></h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <tr><td style="${TD}"><b>Name</b></td><td style="${TD}">${d.weaponName||"—"}</td><td style="${TD}"><b>Class</b></td><td style="${TD}">${d.weaponClass}</td></tr>
  <tr><td style="${TD}"><b>Metal</b></td><td style="${TD}">${d.weaponMetal} (Tier ${csTier(d.weaponMetal)})</td><td style="${TD}"><b>PL Bonus</b></td><td style="${TD}">+${csTier(d.weaponMetal)*10}</td></tr>
  <tr><td style="${TD}"><b>Armor Enchant Slots</b></td><td style="${TD}">${weaponEnch} slot${weaponEnch!==1?"s":""}</td><td style="${TD}"><b>Weapon Enchant Slots</b></td><td style="${TD}">3 (fixed — separate system)</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}">Weapon Enchant Slot</th><th style="${TH}">Enchantment</th></tr></thead>
  <tbody>${weapEnchRows}</tbody>
</table>
<hr>
<h3>🛡️ Armor <span style="font-size:0.82em;font-weight:normal;">(${armorEnch} enchant slots | +${pl.armorBonus} PL)</span></h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}">Slot</th><th style="${TH}">Name</th><th style="${TH}">Material</th><th style="${TH}">⚡ Slots</th><th style="${TH}">Enchantments</th></tr></thead>
  <tbody>${armorRows}</tbody>
</table>
<hr>
<h3>💍 Accessories <span style="font-size:0.82em;font-weight:normal;">(${accEnch} enchant slots | +${pl.accBonus} PL)</span></h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}">Slot</th><th style="${TH}">Name</th><th style="${TH}">Material</th><th style="${TH}">⚡ Slots</th><th style="${TH}">Enchantments</th></tr></thead>
  <tbody>${accRows}</tbody>
</table>
<p style="font-size:0.9em;"><strong>Total Enchant Slots:</strong> ${weaponEnch+armorEnch+accEnch} (Weapon armor: ${weaponEnch} + Armor: ${armorEnch} + Accessories: ${accEnch}) + 3 weapon enchant slots</p>
<hr>
<h3>⛏️ Mining Laser <span style="font-size:0.82em;font-weight:normal;">(${laserEnchSlots} enchant slot${laserEnchSlots!==1?"s":""})</span></h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <tr>
    <td style="${TD}"><b>Type</b></td><td style="${TD}">${d.miningLaserType} (Tier ${laserT})</td>
    <td style="${TD}"><b>Durability</b></td>
    <td style="${TD}">${laserCur} / ${laserMax} &nbsp;${csBar(laserCur,laserMax,"#7f8c8d","8px")}${laserT<=3?`<br><span style="font-size:0.82em;color:#666;">(×3 starter boost applied to max)</span>`:""}
    </td>
  </tr>
  <tr>
    <td style="${TD}"><b>Enchantments</b></td>
    <td style="${TD}" colspan="3">${laserEnchDisp}</td>
  </tr>
</table>
<hr>
<h3>👻 Souls Absorbed</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}">Soul Type</th><th style="${TH}text-align:right;">Count</th></tr></thead>
  <tbody>${soulRows}</tbody>
</table>
<hr>
<h3>🏷️ Skill Tags</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}">Tag Name</th><th style="${TH}">Mastery</th><th style="${TH}">Level</th><th style="${TH}text-align:right;">PL Bonus</th></tr></thead>
  <tbody>${tagRows}</tbody>
</table>
${ascendedTagsList.length > 0 ? `
<h3>✨ Ascended Tags</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <thead><tr><th style="${TH}" colspan="2">Ascended Tag / Condensed Tags</th><th style="${TH}">Tier</th><th style="${TH}text-align:right;">PL Bonus</th></tr></thead>
  <tbody>${ascendedRows}</tbody>
</table>` : ""}
${specialEnchSection}
${arenaSection}
<hr>
<p style="font-size:0.82em;color:#666;"><em>Last updated: ${new Date().toLocaleDateString()}</em></p>`.trim();
}

// ============================================================
// Shared inventory page HTML generator
// Usage: await invPage.update({ "text.content": csInvPageHTML(inv) });
// ============================================================

function csInvPageHTML(inv) {
  const TH  = "padding:4px 8px;border:1px solid #999;background:#333;color:#fff;text-align:left;font-size:0.88em;";
  const TD  = "padding:3px 8px;border:1px solid #ddd;font-size:0.88em;";
  const TDR = "padding:3px 8px;border:1px solid #ddd;font-size:0.88em;text-align:right;";
  const TDB = "border:none;background:transparent;width:8px;";

  function twoCol(list, emoji, dataObj) {
    const half = Math.ceil(list.length / 2);
    const c1 = list.slice(0, half), c2 = list.slice(half);
    return Array.from({ length: Math.max(c1.length, c2.length) }, (_, i) => {
      const a = c1[i], b = c2[i], bg = i%2===0?"#fff":"#f5f5f5";
      return `<tr style="background:${bg};">
        <td style="${TD}">${a?`${emoji} ${a}`:""}</td><td style="${TDR}">${a?((dataObj||{})[a]||0).toLocaleString():""}</td>
        <td style="${TDB}"></td>
        <td style="${TD}">${b?`${emoji} ${b}`:""}</td><td style="${TDR}">${b?((dataObj||{})[b]||0).toLocaleString():""}</td>
      </tr>`;
    }).join("");
  }

  const twoHead = `<th style="${TH}">Item</th><th style="${TH}text-align:right;">Qty</th><th style="${TDB}"></th><th style="${TH}">Item</th><th style="${TH}text-align:right;">Qty</th>`;

  const boosterRows = CS_INV_BOOSTER_PACKS.map((b,i) =>
    `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};"><td style="${TD}">📦 ${b} Booster Pack</td><td style="${TDR}">${((inv.boosters||{})[b]||0).toLocaleString()}</td></tr>`
  ).join("");

  const soulItems = inv.soulItems || {};
  const anySouls  = CS_INV_SOUL_DEFS.some(sd => (soulItems[sd.soulType] || 0) > 0);
  const soulRows  = anySouls
    ? CS_INV_SOUL_DEFS.map((sd,i) =>
        `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};">
          <td style="${TD}">${sd.emoji} ${sd.name}</td>
          <td style="${TDR}">${(soulItems[sd.soulType]||0).toLocaleString()}</td>
        </tr>`).join("")
    : `<tr><td colspan="2" style="${TD}font-style:italic;color:#666;">No souls collected.</td></tr>`;

  const miscRows = (inv.misc||[]).length > 0
    ? inv.misc.map((m,i) => `<tr style="background:${i%2===0?"#fff":"#f5f5f5"};"><td style="${TD}">${m.name||"—"}</td><td style="${TDR}">${(m.quantity||0).toLocaleString()}</td><td style="${TD}">${m.notes||""}</td></tr>`).join("")
    : `<tr><td colspan="3" style="${TD}font-style:italic;color:#666;">No miscellaneous items.</td></tr>`;

  return `<h2>🎒 ${inv.charName} — Inventory</h2>
<p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>
<hr><h3>💰 Currency &amp; Tokens</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr><th style="${TH}">Item</th><th style="${TH}text-align:right;">Qty</th></tr></thead><tbody>
<tr><td style="${TD}">💰 Credits</td><td style="${TDR}"><b>${(inv.credits||0).toLocaleString()}</b></td></tr>
<tr style="background:#f5f5f5;"><td style="${TD}">🎫 Voucher Cards</td><td style="${TDR}">${(inv.voucherCards||0).toLocaleString()}</td></tr>
<tr><td style="${TD}">💟 Soul Vouchers</td><td style="${TDR}">${(inv.soulVouchers||0).toLocaleString()}</td></tr>
<tr style="background:#f5f5f5;"><td style="${TD}">💠 Creation Shards</td><td style="${TDR}">${(inv.creationShards||0).toLocaleString()}</td></tr>
</tbody></table>
<hr><h3>👻 Soul Items</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr><th style="${TH}">Soul</th><th style="${TH}text-align:right;">Qty</th></tr></thead><tbody>${soulRows}</tbody></table>
<hr><h3>📦 Booster Packs</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr><th style="${TH}">Pack</th><th style="${TH}text-align:right;">Qty</th></tr></thead><tbody>${boosterRows}</tbody></table>
<hr><h3>🃏 Upgrade Cards</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr>${twoHead}</tr></thead><tbody>${twoCol(CS_INV_UPGRADE_CARDS,"🃏",inv.upgradeCards)}</tbody></table>
<hr><h3>⛏️ Ores</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr>${twoHead}</tr></thead><tbody>${twoCol(CS_INV_ORES,"⛏️",inv.ores)}</tbody></table>
<hr><h3>🔩 Ingots</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr>${twoHead}</tr></thead><tbody>${twoCol(CS_INV_INGOTS,"🔩",inv.ingots)}</tbody></table>
<hr><h3>💎 Gemstones</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr>${twoHead}</tr></thead><tbody>${twoCol(CS_INV_GEMS,"💎",inv.gemstones)}</tbody></table>
<hr><h3>🗃️ Miscellaneous</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><thead><tr><th style="${TH}">Name</th><th style="${TH}text-align:right;">Qty</th><th style="${TH}">Notes</th></tr></thead><tbody>${miscRows}</tbody></table>`.trim();
}

// ============================================================
// Journal rebuild — call this from any macro to update a character page
// Usage: await csRebuildPage("PlayerName", "CharacterName")
// ============================================================

async function csRebuildPage(playerName, charName) {
  const journal = game.journal.getName(`C.S ${playerName}`);
  if (!journal) {
    ui.notifications.warn(`csRebuildPage: No journal found for "C.S ${playerName}".`);
    return null;
  }
  const page = journal.pages.find(p => p.name === charName);
  if (!page) {
    ui.notifications.warn(`csRebuildPage: No page found for "${charName}" in "C.S ${playerName}".`);
    return null;
  }
  const data = page.getFlag("world", "characterData");
  if (!data) {
    ui.notifications.warn(`csRebuildPage: No character data flag on page "${charName}".`);
    return null;
  }
  const pl          = csCalcPL(data);
  const updatedData = { ...data, calculatedPL: pl.total };
  await page.setFlag("world", "characterData", updatedData);
  await page.update({ "text.content": csPageHTML(updatedData) });
  return updatedData;
}

// ============================================================
// Data retrieval and update helpers
// ============================================================

// Returns the character data flag for a given player and character
function csGetCharData(playerName, charName) {
  const journal = game.journal.getName(`C.S ${playerName}`);
  if (!journal) return null;
  const page = journal.pages.find(p => p.name === charName);
  if (!page) return null;
  return page.getFlag("world", "characterData") || null;
}

// Returns the journal page object for a given player and character
function csGetCharPage(playerName, charName) {
  const journal = game.journal.getName(`C.S ${playerName}`);
  if (!journal) return null;
  return journal.pages.find(p => p.name === charName) || null;
}

// Writes updated data to the flag and rebuilds the journal page
async function csUpdateCharData(playerName, charName, updatedData) {
  const page = csGetCharPage(playerName, charName);
  if (!page) {
    ui.notifications.warn(`csUpdateCharData: Could not find "${charName}" for "${playerName}".`);
    return null;
  }
  const pl   = csCalcPL(updatedData);
  const data = { ...updatedData, calculatedPL: pl.total };
  await page.setFlag("world", "characterData", data);
  await page.update({ "text.content": csPageHTML(data) });
  return data;
}

// ============================================================
// Loaded confirmation
// ============================================================

// ============================================================
// CSCharacterSheet — merged from CharacterSheet.js
// ============================================================

// ── Sheet class ────────────────────────────────────────────────
class CSCharacterSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes:   ["cs-sheet"],
      template:  "modules/my-world-scripts/templates/character-sheet.hbs",
      width:     860,
      height:    820,
      resizable: true,
      tabs: [{
        navSelector:     ".tabs",
        contentSelector: ".sheet-body",
        initial:         "stats"
      }]
    });
  }

  get title() {
    const d = this.actor.getFlag("world", "characterData") || {};
    return d.characterName ? `${d.characterName} — ${d.playerName || ""}` : this.actor.name;
  }

  // ── Prepare all data for the Handlebars template ────────────
  getData() {
    const d = this.actor.getFlag("world", "characterData") || {};

    // Guard: if no character data has been migrated yet, show a placeholder
    if (!d.characterName) {
      return {
        actor: this.actor, d, noData: true,
        pl: { total:0, tagBonus:0, weaponBonus:0, armorBonus:0, accBonus:0,
              soulBonus:0, bonusPL:0, rankMult:1, addMult:1, totalMult:1,
              ascMult:1, attrBonus:0, statBonus:0, fullSets:0, multParts:[] },
        hpMax:0, hpCur:0, mpMax:0, mpCur:0,
        syncMax:CS_SYNC_MAX, syncCur:0, ascPts:0, ascPtsCap:100000, ascMax:CS_ASC_MAX,
        weaponMetal:"Copper", weapArmorSlots:0, weaponEnchantments:[],
        laserMetal:"Copper", laserT:1, laserMax:30, laserCur:30,
        laserEnchSlots:0, laserEnchs:[], laserStarterBoost:true,
        armor:[], accessories:[], armorEnchTotal:0, accEnchTotal:0, totalEnchSlots:0,
        elements:CS_ELEMENTS.map(el=>({name:el,value:0,isAffinity:false,pct:0})),
        regularTags:[], ascendedTags:[],
        souls:CS_SOUL_TYPES.map(s=>({name:s,count:0})),
        arenaStats:[], totalFought:0, totalWon:0, totalWinRate:0, hasArena:false,
        specialEnchs:[], hasSpecialEnchs:false,
        hasPact:false, pactFlags:[], pactHistory:[], pactSummary:null,
        CS_ASC_MAX, CS_LUCK_MAX, CS_SYNC_MAX
      };
    }

    const pl  = csCalcPL(d);

    // ── Core stat values with fallbacks ──
    const hpMax    = d.hpMax      ?? d.hp   ?? 0;
    const hpCur    = d.hpCurrent  ?? hpMax;
    const mpMax    = d.mpMax      ?? d.mp   ?? 0;
    const mpCur    = d.mpCurrent  ?? mpMax;
    const syncMax  = d.syncMax    ?? CS_SYNC_MAX;
    const syncCur  = d.syncCurrent ?? d.sync ?? syncMax;
    const ascPts   = d.ascensionPoints || 0;

    // Pact-aware ascension cap (matches macro logic)
    const pd       = d.pactData || {};
    const ascPtsCap = 100000 + (pd.additionalAscensionCost || 0);
    const ascMax    = CS_ASC_MAX + (pd.ascensionCapBonus || 0);

    // ── Mining laser ──
    const laserMetal    = d.miningLaserType || "Copper";
    const laserT        = csTier(laserMetal);
    const laserMax      = d.laserDurabilityMax     ?? csLaserDur(laserMetal);
    const laserCur      = d.laserDurabilityCurrent ?? laserMax;
    const laserEnchSlots = csEnchSlots(laserMetal);
    const laserEnchs    = Array.from({ length: laserEnchSlots }, (_, i) => ({
      index:  i + 1,
      value:  (d.laserEnchantments || [])[i] || "",
      filled: !!((d.laserEnchantments || [])[i])
    }));

    // ── Weapon enchantments (always 3 fixed slots) ──
    const weaponMetal      = d.weaponMetal || "Copper";
    const weapArmorSlots   = csEnchSlots(weaponMetal);
    const weapEnchantments = [0, 1, 2].map(i => ({
      index: i + 1,
      value: (d.weaponEnchantments || [])[i] || "",
      filled: !!((d.weaponEnchantments || [])[i])
    }));

    // ── Armor ──
    const armor = (d.armor || []).map((p, i) => {
      const mat    = p.material || "Copper";
      const slots  = csEnchSlots(mat);
      const enchs  = Array.from({ length: slots }, (_, si) => ({
        index:  si + 1,
        value:  (p.enchantments || [])[si] || "",
        filled: !!((p.enchantments || [])[si])
      }));
      return {
        index:         i,
        slot:          p.slot || CS_ARMOR_SLOTS[i] || `Slot ${i + 1}`,
        name:          p.name || "—",
        material:      mat,
        tier:          csTier(mat),
        slots,
        plBonus:       csTier(mat) * 10,
        enchantments:  enchs,
        hasSlots:      slots > 0
      };
    });

    // ── Accessories ──
    const accessories = (d.accessories || []).map((a, i) => {
      const mat   = a.material || "Copper";
      const slots = csEnchSlots(mat);
      const enchs = Array.from({ length: slots }, (_, si) => ({
        index:  si + 1,
        value:  (a.enchantments || [])[si] || "",
        filled: !!((a.enchantments || [])[si])
      }));
      return {
        index:        i,
        slot:         a.slot || CS_ACC_SLOTS[i] || `Slot ${i + 1}`,
        name:         a.name || "—",
        material:     mat,
        tier:         csTier(mat),
        slots,
        plBonus:      csTier(mat) * 10,
        enchantments: enchs,
        hasSlots:     slots > 0
      };
    });

    const armorEnchTotal = armor.reduce((s, p) => s + p.slots, 0);
    const accEnchTotal   = accessories.reduce((s, a) => s + a.slots, 0);
    const totalEnchSlots = weapArmorSlots + armorEnchTotal + accEnchTotal;

    // ── Elements ──
    const elements = CS_ELEMENTS.map(el => {
      const val   = ((d.elementMastery || {})[el]) ?? 0;
      const isAff = el === d.element1 || el === d.element2;
      return { name: el, value: val, isAffinity: isAff, pct: Math.min(100, Math.round((val / 10000) * 100)) };
    });

    // ── Tags ──
    const regularTags = (d.tags || [])
      .filter(t => !t.condensedTags)
      .map(t => ({
        name:      t.name,
        mastery:   t.mastery,
        level:     t.level,
        plBonus:   csTagPLBonus(t),
        isSpecial: t.mastery === "X" && CS_SPECIAL_TAG_PL[t.name?.trim().toLowerCase()] !== undefined
      }));

    const ascendedTags = (d.tags || [])
      .filter(t => t.condensedTags && Array.isArray(t.condensedTags))
      .map(t => ({
        name:          t.name,
        condensedTags: t.condensedTags,
        plBonus:       t.plBonus || 0,
        filled:        t.condensedTags.length,
        capacity:      5
      }));

    // ── Souls ──
    const souls = CS_SOUL_TYPES.map(s => ({
      name:  s,
      count: ((d.soulsAbsorbed || {})[s] || 0)
    }));

    // ── Soul Arena ──
    const arenaStatsRaw = d.soulArenaStats || {};
    const arenaStats = CS_INV_SOUL_DEFS
      .map(sd => {
        const s = arenaStatsRaw[sd.soulType] || { fought: 0, won: 0 };
        return {
          emoji:   sd.emoji,
          name:    sd.name,
          fought:  s.fought || 0,
          won:     s.won    || 0,
          lost:    (s.fought || 0) - (s.won || 0),
          winRate: s.fought > 0 ? Math.round((s.won / s.fought) * 100) : 0
        };
      })
      .filter(s => s.fought > 0);

    const totalFought  = arenaStats.reduce((s, r) => s + r.fought, 0);
    const totalWon     = arenaStats.reduce((s, r) => s + r.won,    0);
    const totalWinRate = totalFought > 0 ? Math.round((totalWon / totalFought) * 100) : 0;
    const hasArena     = arenaStats.length > 0;

    // ── Special enchantments ──
    const specialEnchs = d.specialEnchantments || [];

    // ── Pact data ──
    const hasPact   = !!(pd.pactHistory?.length > 0);
    const pactFlags = hasPact ? [
      pd.doubleUpgradeBoonTaken   && { label: "✅ Double Upgrade Points (Boon)",    isBoon: true  },
      pd.doubleKnowledgeBoonTaken && { label: "✅ Double Knowledge Points (Boon)",  isBoon: true  },
      pd.ascensionCapBoonTaken    && { label: `✅ +1 Max Ascension Cap (Boon) — Cap now ${10 + (pd.ascensionCapBonus || 0)}`, isBoon: true },
      pd.halvesUpgradeBaneTaken   && { label: "⚠️ Halved Upgrade Points (Bane)",   isBoon: false },
      pd.halvesKnowledgeBaneTaken && { label: "⚠️ Halved Knowledge Points (Bane)", isBoon: false },
      pd.hpMpCapBaneTaken         && { label: `⚠️ HP/MP Cap reduced to ${(pd.hpMpMaxCap || 0).toLocaleString()} (Bane)`, isBoon: false },
      pd.ascensionLevelBaneTaken  && { label: "⚠️ -1 Ascension Level taken (Bane)", isBoon: false },
      (pd.additionalAscensionCost || 0) > 0 && {
        label: `⚠️ Ascension cap raised to ${(100000 + (pd.additionalAscensionCost || 0)).toLocaleString()} AP (Bane ×${Math.round((pd.additionalAscensionCost || 0) / 25000)})`,
        isBoon: false
      },
      (pd.multBoonCount || 0) > 0 && {
        label: `🔮 Mult Boon ×${pd.multBoonCount} (+${((pd.multBoonCount) * 0.1).toFixed(2)} mult)`,
        isBoon: true
      }
    ].filter(Boolean) : [];

    const pactHistory = pd.pactHistory || [];
    const pactSummary = hasPact ? {
      hpMpMaxCap:        (pd.hpMpMaxCap || 10000).toLocaleString(),
      totalPacts:        pactHistory.length,
      effectiveAscCap:   (100000 + (pd.additionalAscensionCost || 0)).toLocaleString()
    } : null;

    return {
      actor: this.actor,
      d,
      pl,

      // Stats
      hpMax, hpCur, mpMax, mpCur, syncMax, syncCur,
      ascPts, ascPtsCap, ascMax,

      // Equipment
      weaponMetal, weapArmorSlots, weaponEnchantments,
      laserMetal, laserT, laserMax, laserCur, laserEnchSlots, laserEnchs,
      laserStarterBoost: laserT <= 3,
      armor, accessories,
      armorEnchTotal, accEnchTotal, totalEnchSlots,

      // Content
      elements, regularTags, ascendedTags,
      souls, arenaStats, totalFought, totalWon, totalWinRate, hasArena,
      specialEnchs, hasSpecialEnchs: specialEnchs.length > 0,

      // Pact
      hasPact, pactFlags, pactHistory, pactSummary,

      // Constants available in template
      CS_ASC_MAX, CS_LUCK_MAX, CS_SYNC_MAX
    };
  }

  // ── Event listeners (buttons that open macros) ──────────────
  activateListeners(html) {
    super.activateListeners(html);

    // Block dnd5e-specific module hooks (e.g. world-currency-5e) that
    // assume all character-type sheets are dnd5e sheets and crash on ours.
    // We do this by marking the element so those modules can detect us.
    html[0]?.closest(".app")?.classList.add("cs-custom-sheet");

    if (!this.isEditable) return;

    // Run a named macro by button click — add data-macro="Macro Name" to any button
    html.find("[data-macro]").on("click", (ev) => {
      const macroName = ev.currentTarget.dataset.macro;
      const macro = game.macros.getName(macroName);
      if (macro) macro.execute();
      else ui.notifications.warn(`Macro "${macroName}" not found.`);
    });
  }
}

// ── Global actor helper functions ─────────────────────────────
// Replaces journal-based csGetCharPage for use in all macros

function csGetCharActor(charName) {
  return game.actors.getName(charName) || null;
}

function csGetActorData(charName) {
  const actor = csGetCharActor(charName);
  if (!actor) return null;
  return actor.getFlag("world", "characterData") || null;
}

async function csUpdateActorData(charName, updatedData) {
  const actor = csGetCharActor(charName);
  if (!actor) {
    ui.notifications.warn(`csUpdateActorData: Actor "${charName}" not found.`);
    return null;
  }
  const pl   = csCalcPL(updatedData);
  const data = { ...updatedData, calculatedPL: pl.total };
  await actor.setFlag("world", "characterData", data);
  // Sheet re-renders automatically — no page.update() needed
  return data;
}

// ── Initialise on Foundry init hook ──────────────────────────
Hooks.once("init", () => {
Handlebars.registerHelper({

    // Progress bar — returns safe HTML string
    csBar: (current, max, color, height) => {
      return new Handlebars.SafeString(
        csBar(Number(current) || 0, Number(max) || 1, color || "#888", height || "10px")
      );
    },

    // Number formatting
    csNum: (n) => Number(n || 0).toLocaleString(),

    // Metal tier
    csTierOf: (metal) => csTier(metal || "Copper"),

    // Enchantment slots for a metal
    csEnchOf: (metal) => csEnchSlots(metal || "Copper"),

    // Comparison helpers
    eq:  (a, b)    => a === b,
    neq: (a, b)    => a !== b,
    gt:  (a, b)    => Number(a) >  Number(b),
    gte: (a, b)    => Number(a) >= Number(b),
    lt:  (a, b)    => Number(a) <  Number(b),
    lte: (a, b)    => Number(a) <= Number(b),

    // Logic
    or:  (a, b)    => a || b,
    and: (a, b)    => a && b,
    not: (a)       => !a,

    // Math
    add: (a, b)    => Number(a) + Number(b),
    sub: (a, b)    => Number(a) - Number(b),
    mul: (a, b)    => Number(a) * Number(b),

    // Percentage (clamped 0-100)
    pct: (cur, max) => {
      const c = Number(cur) || 0, m = Number(max) || 1;
      return Math.min(100, Math.max(0, Math.round((c / m) * 100)));
    },

    // Concat strings
    concat: (...args) => args.slice(0, -1).join(""),

    // Check if an array has length > 0
    any: (arr) => Array.isArray(arr) && arr.length > 0,

    // Return a range array for #each loops
    times: (n) => Array.from({ length: Number(n) || 0 }, (_, i) => i + 1),

    // Win-rate CSS class for soul arena
    winClass: (rate) => {
      const r = Number(rate) || 0;
      if (r >= 60) return "cs-win-good";
      if (r >= 40) return "cs-win-average";
      return "cs-win-bad";
    }
  });

  // ── Register the sheet class ──────────────────────────────
  Actors.registerSheet("dnd5e", CSCharacterSheet, {
    types:       ["character"],
    makeDefault: false,
    label:       "CS Character Sheet"
  });

  // Prevent world-currency-5e and similar dnd5e-specific modules from
  // hooking into our custom sheet. They check for ActorSheet5eCharacter
  // instance — we are not that class, so we override the hook check.
  Hooks.on("renderCSCharacterSheet", () => {});

  // If world-currency-5e fires its hook on our sheet, catch and suppress it
  const _origCallAll = Hooks.callAll.bind(Hooks);
  Hooks.callAll = function(hook, ...args) {
    if (hook === "renderActorSheet5eCharacter" && args[0] instanceof CSCharacterSheet) return;
    return _origCallAll(hook, ...args);
  };

  console.log("✅ CSCharacterSheet registered.");
});

Hooks.once("ready", () => {
  console.log("✅ Character Sheet world script loaded — CSCharacterSheet, csGetCharActor, csUpdateActorData also available.");
});