// Los correos de Toisón (diseño «Carta» mejorado, elegido por Carlos el 7 nov 2026): confirmar el correo, contraseña nueva y
// bienvenida, en español e inglés, con su versión de solo texto. Las imágenes las sirve el propio Worker (/correo/img/…).
// render(tipo, lang, d) -> { asunto, previa, html, texto }
//   tipo: 'confirmar' | 'clave' | 'bienvenida'
//   lang: 'es' | 'en'
//   d: { correo, enlace, img: nombre => url }  (img('hero-es'), img('i-cartera')…)

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Helvetica,Arial,sans-serif";

const C = {
  fondo: '#f3f1ec', tarjeta: '#ffffff', borde: '#e7e2d9', texto: '#1a1a1a', texto2: '#4b4740', tenue: '#7d776d',
  boton: '#111111', botonTxt: '#ffffff', enlace: '#111111', oro: '#c99a45', caja: '#f7f4ee', chip: '#f3efe7',
};
const O = { // modo oscuro (Apple Mail, Outlook de Mac…)
  fondo: '#000000', tarjeta: '#121212', borde: '#2b2b2b', texto: '#efece6', texto2: '#c6c0b6', tenue: '#8f897f',
  boton: '#e3b45f', botonTxt: '#1a1100', enlace: '#e3b45f', caja: '#1b1b1b', chip: '#1e1e1e',
};

const T = {
  es: {
    confirmar: {
      asunto: 'Confirma tu correo de Toisón',
      previa: 'Un clic y tu cuenta queda lista para usar la IA.',
      titulo: 'Confirma tu correo',
      cuerpo: ['Has creado una cuenta en Toisón. Pulsa el botón para confirmar que este correo es tuyo: hace falta para usar la IA.'],
      boton: 'Confirmar mi correo',
      nota: 'Vale solo el enlace del último correo que te hayamos mandado.',
      notu: 'Si no has creado tú esta cuenta, no hagas nada: sin confirmar, nadie puede usar la IA con ella.',
    },
    clave: {
      asunto: 'Tu contraseña nueva de Toisón',
      previa: 'Elige una contraseña nueva para tu cuenta.',
      titulo: 'Elige una contraseña nueva',
      cuerpo: ['Nos han pedido cambiar la contraseña de tu cuenta de Toisón. Pulsa el botón y escribe la nueva.'],
      aviso: 'La contraseña de tu cartera no cambia: es otra distinta y solo la sabes tú.',
      boton: 'Elegir contraseña nueva',
      notu: 'Si no lo has pedido tú, no hagas nada: tu contraseña sigue siendo la misma.',
    },
    bienvenida: {
      asunto: 'Te damos la bienvenida a Toisón',
      previa: 'Tu correo está confirmado. Un repaso rápido de Toisón.',
      titulo: 'Ya está todo listo',
      cuerpo: ['Tu correo está confirmado y la IA ya puede trabajar con tu cuenta. Esto es lo que tienes en Toisón:'],
      bloques: [
        ['i-cartera', 'Todo en un sitio', 'Fondos, acciones, ETF, oro y cripto de cualquier bróker, con precios en directo y un widget para el móvil.'],
        ['i-paso', 'Paso a paso', 'Cada mes, qué mirar en tu cartera y lo que supone en la renta.'],
        ['i-ia', 'La IA', 'Revisa tu cartera, lee las noticias y te contesta lo que le preguntes.'],
        ['i-renta', 'Fiscalidad', 'Lo que te tocará pagar a Hacienda y una guía para la declaración.'],
        ['i-mercados', 'Mercados y Expertos', 'Bolsas, tipos y divisas del mundo, y la opinión de los analistas sobre unas 2.800 empresas.'],
        ['i-candado', 'Solo tuya', 'Tu cartera va cifrada con tu contraseña y se guarda en tu dispositivo. Nadie más la ve, tampoco nosotros.'],
      ],
      boton: 'Abrir Toisón',
      notu: '',
    },
    cuenta: 'Cuenta',
    enlace: 'Si el botón no funciona, copia este enlace en el navegador:',
    pie: 'Toisón · tus inversiones en un solo sitio',
    pieResp: 'Si respondes a este correo, nos llega a',
    piePor: c => `Te lo mandamos porque se pidió desde Toisón para ${c}.`,
  },
  en: {
    confirmar: {
      asunto: 'Confirm your Toisón email',
      previa: 'One click and your account is ready to use the AI.',
      titulo: 'Confirm your email',
      cuerpo: ['You created a Toisón account. Tap the button to confirm this address is yours. You need it to use the AI.'],
      boton: 'Confirm my email',
      nota: 'Only the link in the latest email we sent you works.',
      notu: 'If you didn’t create this account, just ignore this email. Without confirming, nobody can use the AI with it.',
    },
    clave: {
      asunto: 'Your new Toisón password',
      previa: 'Choose a new password for your account.',
      titulo: 'Choose a new password',
      cuerpo: ['We got a request to change the password of your Toisón account. Tap the button and type the new one.'],
      aviso: 'Your portfolio password doesn’t change. It’s a different one and only you know it.',
      boton: 'Choose a new password',
      notu: 'If you didn’t ask for this, ignore this email. Your password stays the same.',
    },
    bienvenida: {
      asunto: 'Welcome to Toisón: here’s what you can do',
      previa: 'Your email is confirmed. A quick tour of Toisón.',
      titulo: 'You’re all set',
      cuerpo: ['Your email is confirmed and the AI can now work with your account. Here’s what you get in Toisón:'],
      bloques: [
        ['i-cartera', 'Everything in one place', 'Funds, stocks, ETFs, gold and crypto from any broker, with live prices and a home-screen widget.'],
        ['i-paso', 'Step by step', 'Every month, what to check in your portfolio and what it means for your taxes.'],
        ['i-ia', 'The AI', 'Reviews your portfolio, reads the news and answers your questions.'],
        ['i-renta', 'Taxes', 'What you’ll owe the Spanish tax office and a guide for your tax return.'],
        ['i-mercados', 'Markets and Experts', 'World stocks, rates and currencies, and analysts’ views on about 2,800 companies.'],
        ['i-candado', 'Yours only', 'Your portfolio is encrypted with your password and stored on your device. Nobody else sees it, not even us.'],
      ],
      boton: 'Open Toisón',
      notu: '',
    },
    cuenta: 'Account',
    enlace: 'If the button doesn’t work, paste this link into your browser:',
    pie: 'Toisón · all your investments in one place',
    pieResp: 'Replies to this email reach',
    piePor: c => `We sent it because it was requested from Toisón for ${c}.`,
  },
};

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const P = (txt, extra = '') => `<p class="t-texto" style="margin:0 0 16px;font:400 16px/25px ${SANS};color:${C.texto};${extra}">${txt}</p>`;

function boton(url, txt) {
  return `<table role="presentation" class="t-bt" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0"><tr>
<td class="t-boton" bgcolor="${C.boton}" style="border-radius:10px;background:${C.boton}">
<a href="${esc(url)}" class="t-boton-a" style="display:inline-block;padding:16px 34px;font:600 16px/20px ${SANS};color:${C.botonTxt};text-decoration:none;border-radius:10px;text-align:center">${esc(txt)}&nbsp;&nbsp;&rarr;</a>
</td></tr></table>`;
}

function bloques(lista, img) {
  // dos columnas que se apilan solas en el móvil (inline-block, sin depender de media queries)
  const celda = ([ic, tit, txt]) => `<div class="t-col" style="display:inline-block;vertical-align:top;width:100%;max-width:236px;margin:0 0 18px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td valign="top" width="52" style="padding:2px 0 0"><img src="${esc(img(ic))}" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px"></td>
<td valign="top" style="padding:0 10px 0 0"><p class="t-texto" style="margin:0 0 3px;font:600 15px/21px ${SANS};color:${C.texto}">${esc(tit)}</p>
<p class="t-texto2" style="margin:0;font:400 14px/20px ${SANS};color:${C.texto2}">${esc(txt)}</p></td></tr></table></div>`;
  let h = '';
  for (let i = 0; i < lista.length; i += 2) {
    h += `<div style="font-size:0;line-height:0">${celda(lista[i])}${lista[i + 1] ? `${celda(lista[i + 1])}` : ''}</div>`;
  }
  return `<div style="margin:6px 0 10px">${h}</div>`;
}

export function render(tipo, lang, d) {
  const L = T[lang] || T.es, t = L[tipo];
  if (!t) throw new Error('tipo de correo desconocido: ' + tipo);
  const img = d.img, url = d.enlace, correo = d.correo;
  const regla = (pad = '0') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${pad}"><tr><td height="1" class="t-regla" bgcolor="${C.borde}" style="font-size:0;line-height:0;background:${C.borde}">&nbsp;</td></tr></table>`;

  // la cabecera (símbolo, TOISÓN, el lema y la línea de oro) en los tres correos (Carlos, 7 nov)
  const cabecera = `<tr><td style="padding:0;font-size:0;line-height:0"><img src="${esc(img('hero-' + (T[lang] ? lang : 'es')))}" width="574" alt="Toisón" style="display:block;border:0;width:100%;max-width:574px;height:auto;border-radius:13px 13px 0 0"></td></tr>`;

  const chip = tipo !== 'bienvenida' ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr><td class="t-chip" bgcolor="${C.chip}" style="background:${C.chip};border-radius:8px;padding:8px 12px;font:400 14px/20px ${SANS};color:${C.texto2}">${esc(L.cuenta)}: <b class="t-texto" style="color:${C.texto};font-weight:600">${esc(correo)}</b></td></tr></table>` : '';

  const aviso = t.aviso ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 20px"><tr><td class="t-caja" bgcolor="${C.caja}" style="background:${C.caja};border-left:3px solid ${C.oro};border-radius:0 8px 8px 0;padding:12px 14px;font:400 15px/22px ${SANS};color:${C.texto}">${esc(t.aviso)}</td></tr></table>` : '';

  const enlace = tipo === 'bienvenida' ? '' : `<p class="t-tenue" style="margin:24px 0 6px;font:400 13px/19px ${SANS};color:${C.tenue}">${esc(L.enlace)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="t-caja" bgcolor="${C.caja}" style="background:${C.caja};border-radius:8px;padding:10px 12px;font:400 12px/18px ui-monospace,Menlo,Consolas,monospace;word-break:break-all"><a href="${esc(url)}" class="t-enlace" style="color:${C.enlace};text-decoration:underline">${esc(url)}</a></td></tr></table>`;

  const nota = t.nota ? `<p class="t-texto2" style="margin:16px 0 0;font:400 14px/21px ${SANS};color:${C.texto2}">${esc(t.nota)}</p>` : '';
  const notu = t.notu ? `${regla('26px 0 18px')}<p class="t-texto2" style="margin:0;font:400 14px/21px ${SANS};color:${C.texto2}">${esc(t.notu)}</p>` : '';

  const cuerpo = `<tr><td class="t-pad" style="padding:30px 40px 36px">
<h1 class="t-titulo" style="margin:0 0 16px;font:650 26px/32px ${SANS};letter-spacing:-.015em;color:${C.texto}">${esc(t.titulo)}</h1>
${t.cuerpo.map(p => P(esc(p))).join('')}
${chip}${aviso}${t.bloques ? bloques(t.bloques, img) : ''}
${boton(url, t.boton)}
${nota}${enlace}${notu}
</td></tr>`;

  const pie = `<tr><td class="t-pie-pad" style="padding:22px 40px 8px">
<p class="t-pie" style="margin:0 0 6px;font:600 12px/18px ${SANS};color:${C.tenue}">${esc(L.pie)} · <a href="https://toison.es" class="t-pie" style="color:${C.tenue};text-decoration:underline">toison.es</a></p>
<p class="t-pie" style="margin:0;font:400 12px/18px ${SANS};color:${C.tenue}">${esc(L.pieResp)} <a href="mailto:hola@toison.es" class="t-pie" style="color:${C.tenue};text-decoration:underline">hola@toison.es</a>. ${esc(L.piePor(correo))}</p>
</td></tr>`;

  const html = `<!doctype html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="x-ua-compatible" content="ie=edge">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(t.asunto)}</title>
<style>
 body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
 img{-ms-interpolation-mode:bicubic}
 @media (max-width:520px){
  .t-pad{padding-left:22px!important;padding-right:22px!important}
  .t-pie-pad{padding-left:24px!important;padding-right:24px!important}
  .t-bt,.t-boton{width:100%!important}
  .t-boton-a{display:block!important;padding-left:12px!important;padding-right:12px!important}
  .t-col{max-width:100%!important}
 }
 @media (prefers-color-scheme: dark){
  .t-body,.t-fondo{background:${O.fondo}!important}
  .t-tarjeta{background:${O.tarjeta}!important;border-color:${O.borde}!important}
  .t-texto,.t-titulo{color:${O.texto}!important}
  .t-texto2{color:${O.texto2}!important}
  .t-tenue,.t-pie{color:${O.tenue}!important}
  .t-enlace{color:${O.enlace}!important}
  .t-boton{background:${O.boton}!important}
  .t-boton-a{color:${O.botonTxt}!important}
  .t-regla{background:${O.borde}!important}
  .t-caja{background:${O.caja}!important}
  .t-chip{background:${O.chip}!important;color:${O.texto2}!important}
 }
</style></head>
<body class="t-body" style="margin:0;padding:0;background:${C.fondo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${esc(t.previa)}${'&#847;&zwnj;&nbsp;'.repeat(30)}</div>
<table role="presentation" class="t-fondo" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.fondo}" style="background:${C.fondo}"><tr><td align="center" style="padding:28px 10px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:576px">
<tr><td class="t-tarjeta" bgcolor="${C.tarjeta}" style="background:${C.tarjeta};border:1px solid ${C.borde};border-radius:14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${cabecera}${cuerpo}
</table></td></tr>
${pie}
</table>
</td></tr></table>
</body></html>`;

  const bloquesTxt = t.bloques ? t.bloques.map(([, a, b]) => `· ${a}: ${b}`) : [];
  const texto = [
    'TOISÓN', '', t.titulo, '', ...t.cuerpo,
    ...(tipo !== 'bienvenida' ? ['', `${L.cuenta}: ${correo}`] : []),
    ...(t.aviso ? ['', t.aviso] : []),
    ...(bloquesTxt.length ? ['', ...bloquesTxt] : []),
    '', `${t.boton}:`, url,
    ...(t.nota ? ['', t.nota] : []),
    ...(t.notu ? ['', t.notu] : []),
    '', '—', L.pie, `https://toison.es · hola@toison.es`, L.piePor(correo),
  ].join('\n');
  return { asunto: t.asunto, previa: t.previa, html, texto };
}
