#!/usr/bin/env node
/**
 * Écrit tests/models/reqif/ExigencesModules.reqifz : une archive ReqIF à deux modules, écrite pour Arcalyse (Apache 2.0), qui
 * rejoue ce qu'un export réel peut contenir et qu'un fichier seul ne montre pas :
 *   - 1-systeme.reqif : encodé en ISO-8859-1 (annoncé par la déclaration XML), titre de chapitre et exigences nommés par
 *     ReqIF.ChapterName comme le fait Polarion (une exigence a un texte, un titre n'en a pas), valeurs par défaut ;
 *   - 2-logiciel.reqif : UTF-8, spécification sans nom, relation vers une exigence du module système (autre fichier de
 *     l'archive : cas TC1700 du guide d'implémentation de ReqIF), types de données de mêmes identifiants que le module système.
 * Lancement : node tests/models/reqif/ExigencesModules.gen.js (archive identique à chaque lancement : dates fixes, sans compression).
 */
'use strict';
const fs = require('fs'), path = require('path');
const D = '2026-11-12T10:00:00+01:00';
/** Valeur d'attribut (ATTRIBUTE-VALUE-…). @param {string} genre - STRING, XHTML ou ENUMERATION @param {string} def - Définition @param {string} v - Valeur @returns {string} XML */
const val = (genre, def, v) => genre === 'XHTML'
  ? `<ATTRIBUTE-VALUE-XHTML><DEFINITION><ATTRIBUTE-DEFINITION-XHTML-REF>${def}</ATTRIBUTE-DEFINITION-XHTML-REF></DEFINITION><THE-VALUE>${v}</THE-VALUE></ATTRIBUTE-VALUE-XHTML>`
  : genre === 'ENUMERATION' ? `<ATTRIBUTE-VALUE-ENUMERATION><DEFINITION><ATTRIBUTE-DEFINITION-ENUMERATION-REF>${def}</ATTRIBUTE-DEFINITION-ENUMERATION-REF></DEFINITION><VALUES><ENUM-VALUE-REF>${v}</ENUM-VALUE-REF></VALUES></ATTRIBUTE-VALUE-ENUMERATION>`
  : `<ATTRIBUTE-VALUE-STRING THE-VALUE="${v}"><DEFINITION><ATTRIBUTE-DEFINITION-STRING-REF>${def}</ATTRIBUTE-DEFINITION-STRING-REF></DEFINITION></ATTRIBUTE-VALUE-STRING>`;
/** Objet (SPEC-OBJECT) et ses valeurs. @param {string} id @param {string} type @param {Array} vals - [genre, définition, valeur] @returns {string} XML */
const objet = (id, type, vals) => `        <SPEC-OBJECT IDENTIFIER="${id}" LAST-CHANGE="${D}">
          <VALUES>
${vals.map(v => '            ' + val(...v)).join('\n')}
          </VALUES>
          <TYPE><SPEC-OBJECT-TYPE-REF>${type}</SPEC-OBJECT-TYPE-REF></TYPE>
        </SPEC-OBJECT>`;
/** Place d'un objet dans une spécification (SPEC-HIERARCHY), avec ses places filles. @param {string} id @param {string} objet @param {Array} [enfants] @param {string} p - Retrait @returns {string} XML */
const place = (id, objet, enfants, p) => `${p}<SPEC-HIERARCHY IDENTIFIER="${id}" LAST-CHANGE="${D}"><OBJECT><SPEC-OBJECT-REF>${objet}</SPEC-OBJECT-REF></OBJECT>${enfants && enfants.length ? `\n${p}  <CHILDREN>\n${enfants.map(e => place(e[0], e[1], e[2], p + '    ')).join('\n')}\n${p}  </CHILDREN>\n${p}` : ''}</SPEC-HIERARCHY>`;
/** Relation (SPEC-RELATION). @param {string} id @param {string} src @param {string} tgt @param {string} type @returns {string} XML */
const relation = (id, src, tgt, type) => `        <SPEC-RELATION IDENTIFIER="${id}" LAST-CHANGE="${D}"><SOURCE><SPEC-OBJECT-REF>${src}</SPEC-OBJECT-REF></SOURCE><TARGET><SPEC-OBJECT-REF>${tgt}</SPEC-OBJECT-REF></TARGET><TYPE><SPEC-RELATION-TYPE-REF>${type}</SPEC-RELATION-TYPE-REF></TYPE></SPEC-RELATION>`;
/** Définition d'attribut texte, avec ou sans valeur par défaut. @param {string} id @param {string} nom @param {string} [defaut] @returns {string} XML */
const defS = (id, nom, defaut) => `            <ATTRIBUTE-DEFINITION-STRING IDENTIFIER="${id}" LAST-CHANGE="${D}" LONG-NAME="${nom}">${defaut ? `<DEFAULT-VALUE>${val('STRING', id, defaut)}</DEFAULT-VALUE>` : ''}<TYPE><DATATYPE-DEFINITION-STRING-REF>_dt_texte</DATATYPE-DEFINITION-STRING-REF></TYPE></ATTRIBUTE-DEFINITION-STRING>`;
/** Définition d'attribut XHTML. @param {string} id @param {string} nom @returns {string} XML */
const defX = (id, nom) => `            <ATTRIBUTE-DEFINITION-XHTML IDENTIFIER="${id}" LAST-CHANGE="${D}" LONG-NAME="${nom}"><TYPE><DATATYPE-DEFINITION-XHTML-REF>_dt_xhtml</DATATYPE-DEFINITION-XHTML-REF></TYPE></ATTRIBUTE-DEFINITION-XHTML>`;
/** Fichier ReqIF complet. @param {string} enc - Encodage annoncé @param {string} entete @param {string} titre @param {string} commentaire @param {string} corps @returns {string} XML */
const fichier = (enc, entete, titre, commentaire, corps) => `<?xml version="1.0" encoding="${enc}"?>
<REQ-IF xmlns="http://www.omg.org/spec/ReqIF/20110401/reqif.xsd" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <THE-HEADER>
    <REQ-IF-HEADER IDENTIFIER="${entete}">
      <COMMENT>${commentaire}</COMMENT>
      <CREATION-TIME>${D}</CREATION-TIME>
      <REQ-IF-TOOL-ID>Arcalyse</REQ-IF-TOOL-ID>
      <REQ-IF-VERSION>1.0</REQ-IF-VERSION>
      <SOURCE-TOOL-ID>Écrit à la main</SOURCE-TOOL-ID>
      <TITLE>${titre}</TITLE>
    </REQ-IF-HEADER>
  </THE-HEADER>
  <CORE-CONTENT>
    <REQ-IF-CONTENT>
${corps}
    </REQ-IF-CONTENT>
  </CORE-CONTENT>
</REQ-IF>
`;
/** Types de données communs aux deux modules (mêmes identifiants). @param {string} [extra] @returns {string} XML */
const datatypes = extra => `      <DATATYPES>
        <DATATYPE-DEFINITION-STRING IDENTIFIER="_dt_texte" LAST-CHANGE="${D}" LONG-NAME="Texte" MAX-LENGTH="500"/>
        <DATATYPE-DEFINITION-XHTML IDENTIFIER="_dt_xhtml" LAST-CHANGE="${D}" LONG-NAME="Texte mis en forme"/>${extra || ''}
      </DATATYPES>`;

// Module 1 — système : encodé en ISO-8859-1, exigences nommées par ReqIF.ChapterName comme le fait Polarion, valeurs par défaut
const systeme = fichier('ISO-8859-1', '_entete_systeme', 'Drone de relevé : exigences système', 'Module système : encodage ISO-8859-1, titres et exigences nommés par ReqIF.ChapterName, valeurs par défaut.', [
  datatypes(`
        <DATATYPE-DEFINITION-ENUMERATION IDENTIFIER="_dt_etat" LAST-CHANGE="${D}" LONG-NAME="État">
          <SPECIFIED-VALUES>
            <ENUM-VALUE IDENTIFIER="_ev_brouillon" LAST-CHANGE="${D}" LONG-NAME="Brouillon"><PROPERTIES><EMBEDDED-VALUE KEY="1" OTHER-CONTENT=""/></PROPERTIES></ENUM-VALUE>
            <ENUM-VALUE IDENTIFIER="_ev_validee" LAST-CHANGE="${D}" LONG-NAME="Validée"><PROPERTIES><EMBEDDED-VALUE KEY="2" OTHER-CONTENT=""/></PROPERTIES></ENUM-VALUE>
          </SPECIFIED-VALUES>
        </DATATYPE-DEFINITION-ENUMERATION>`),
  `      <SPEC-TYPES>
        <SPEC-OBJECT-TYPE IDENTIFIER="_t_sys" LAST-CHANGE="${D}" LONG-NAME="Exigence système">
          <SPEC-ATTRIBUTES>
${defS('_d_sys_id', 'ReqIF.ForeignID')}
${defS('_d_sys_chap', 'ReqIF.ChapterName')}
${defX('_d_sys_texte', 'ReqIF.Text')}
            <ATTRIBUTE-DEFINITION-ENUMERATION IDENTIFIER="_d_sys_etat" LAST-CHANGE="${D}" LONG-NAME="État" MULTI-VALUED="false"><DEFAULT-VALUE>${val('ENUMERATION', '_d_sys_etat', '_ev_brouillon')}</DEFAULT-VALUE><TYPE><DATATYPE-DEFINITION-ENUMERATION-REF>_dt_etat</DATATYPE-DEFINITION-ENUMERATION-REF></TYPE></ATTRIBUTE-DEFINITION-ENUMERATION>
${defS('_d_sys_verif', 'Vérification', 'Essai')}
          </SPEC-ATTRIBUTES>
        </SPEC-OBJECT-TYPE>
        <SPECIFICATION-TYPE IDENTIFIER="_t_spec" LAST-CHANGE="${D}" LONG-NAME="Module"/>
        <SPEC-RELATION-TYPE IDENTIFIER="_rt_derive" LAST-CHANGE="${D}" LONG-NAME="dérive de"/>
      </SPEC-TYPES>`,
  `      <SPEC-OBJECTS>
${objet('_sys_c1', '_t_sys', [['STRING', '_d_sys_chap', 'Performances']])}
${objet('_sys_1', '_t_sys', [['STRING', '_d_sys_id', 'SYS-1'], ['STRING', '_d_sys_chap', 'Autonomie'], ['XHTML', '_d_sys_texte', '<xhtml:div>Le drone vole <xhtml:b>30 min</xhtml:b> à 5 °C, été comme hiver.</xhtml:div>'], ['ENUMERATION', '_d_sys_etat', '_ev_validee']])}
${objet('_sys_2', '_t_sys', [['STRING', '_d_sys_id', 'SYS-2'], ['STRING', '_d_sys_chap', 'Portée'], ['XHTML', '_d_sys_texte', '<xhtml:div>La liaison de données porte à 2 km en vue dégagée.</xhtml:div>'], ['STRING', '_d_sys_verif', 'Analyse']])}
      </SPEC-OBJECTS>`,
  `      <SPECIFICATIONS>
        <SPECIFICATION IDENTIFIER="_spec_systeme" LAST-CHANGE="${D}" LONG-NAME="Exigences système">
          <TYPE><SPECIFICATION-TYPE-REF>_t_spec</SPECIFICATION-TYPE-REF></TYPE>
          <CHILDREN>
${place('_h_sys_c1', '_sys_c1', [['_h_sys_1', '_sys_1'], ['_h_sys_2', '_sys_2']], '            ')}
          </CHILDREN>
        </SPECIFICATION>
      </SPECIFICATIONS>`
].join('\n'));

// Module 2 — logiciel : UTF-8, spécification sans nom (ni LONG-NAME ni ReqIF.Name), relation vers une exigence du module système
const logiciel = fichier('UTF-8', '_entete_logiciel', 'Drone de relevé : exigences logicielles', 'Module logiciel : spécification sans nom, relation vers une exigence du module système (autre fichier de l\'archive).', [
  datatypes(),
  `      <SPEC-TYPES>
        <SPEC-OBJECT-TYPE IDENTIFIER="_t_log" LAST-CHANGE="${D}" LONG-NAME="Exigence logicielle">
          <SPEC-ATTRIBUTES>
${defS('_d_log_id', 'ReqIF.ForeignID')}
${defS('_d_log_nom', 'ReqIF.Name')}
${defX('_d_log_texte', 'ReqIF.Text')}
          </SPEC-ATTRIBUTES>
        </SPEC-OBJECT-TYPE>
        <SPECIFICATION-TYPE IDENTIFIER="_t_spec" LAST-CHANGE="${D}" LONG-NAME="Module"/>
        <SPEC-RELATION-TYPE IDENTIFIER="_rt_precise" LAST-CHANGE="${D}" LONG-NAME="précise"/>
      </SPEC-TYPES>`,
  `      <SPEC-OBJECTS>
${objet('_log_1', '_t_log', [['STRING', '_d_log_id', 'LOG-1'], ['STRING', '_d_log_nom', 'Gestion de l’énergie'], ['XHTML', '_d_log_texte', '<xhtml:div>Le logiciel de bord ramène le drone à sa base quand il reste 20 % d’énergie.</xhtml:div>']])}
${objet('_log_2', '_t_log', [['STRING', '_d_log_id', 'LOG-2'], ['STRING', '_d_log_nom', 'Seuil d’alerte'], ['XHTML', '_d_log_texte', '<xhtml:div>Le seuil de retour se règle entre 10 % et 40 %.</xhtml:div>']])}
      </SPEC-OBJECTS>`,
  `      <SPEC-RELATIONS>
${relation('_rel_log1_sys1', '_log_1', '_sys_1', '_rt_derive')}
${relation('_rel_log2_log1', '_log_2', '_log_1', '_rt_precise')}
      </SPEC-RELATIONS>`,
  `      <SPECIFICATIONS>
        <SPECIFICATION IDENTIFIER="_spec_logiciel" LAST-CHANGE="${D}">
          <TYPE><SPECIFICATION-TYPE-REF>_t_spec</SPECIFICATION-TYPE-REF></TYPE>
          <CHILDREN>
${place('_h_log_1', '_log_1', [['_h_log_2', '_log_2']], '            ')}
          </CHILDREN>
        </SPECIFICATION>
      </SPECIFICATIONS>`
].join('\n'));
if (Buffer.from(systeme, 'latin1').toString('latin1') !== systeme) throw new Error('caractère hors ISO-8859-1 dans le module système');

/** Somme de contrôle CRC-32 d'octets (zip). @param {Buffer} b @returns {number} */
function crc32(b) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Archive zip sans compression, à dates fixes. @param {Array<{nom:string, octets:Buffer}>} fichiers @returns {Buffer} */
function zip(fichiers) {
  const HEURE = (10 << 11), JOUR = ((2026 - 1980) << 9) | (11 << 5) | 12, locaux = [], centraux = [];
  let pos = 0;
  for (const f of fichiers) {
    const nom = Buffer.from(f.nom, 'utf8'), crc = crc32(f.octets), l = Buffer.alloc(30), c = Buffer.alloc(46);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6); l.writeUInt16LE(0, 8); l.writeUInt16LE(HEURE, 10); l.writeUInt16LE(JOUR, 12);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(f.octets.length, 18); l.writeUInt32LE(f.octets.length, 22); l.writeUInt16LE(nom.length, 26);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10); c.writeUInt16LE(HEURE, 12); c.writeUInt16LE(JOUR, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(f.octets.length, 20); c.writeUInt32LE(f.octets.length, 24); c.writeUInt16LE(nom.length, 28); c.writeUInt32LE(pos, 42);
    locaux.push(l, nom, f.octets); centraux.push(c, nom);
    pos += 30 + nom.length + f.octets.length;
  }
  const dir = Buffer.concat(centraux), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(fichiers.length, 8); fin.writeUInt16LE(fichiers.length, 10); fin.writeUInt32LE(dir.length, 12); fin.writeUInt32LE(pos, 16);
  return Buffer.concat([...locaux, dir, fin]);
}

const cible = path.join(__dirname, 'ExigencesModules.reqifz');
fs.writeFileSync(cible, zip([{ nom: '1-systeme.reqif', octets: Buffer.from(systeme, 'latin1') }, { nom: '2-logiciel.reqif', octets: Buffer.from(logiciel, 'utf8') }]));
console.log('✔ ' + path.relative(process.cwd(), cible));
